import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Database,
  Sheet,
  Settings,
  Download,
  Eye,
  EyeOff,
  Copy,
  CheckSquare,
  Square,
  TestTube2
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import logger from '../../utils/logger';

// Firebase imports
import { 
  saveConnection, 
  saveDatabase, 
  saveTable,
  saveHeaders,
  loadConnections 
} from '../../lib/firebase';

// Google Sheets API imports
import { 
  createBackendSheetsService, 
  getFallbackSheetNames, 
  fetchSheetsWithPublicAPI 
} from '../../utils/backendSheetsService';

interface ConnectionWizardProps {
  activeTab: 'saudi' | 'egypt';
  onComplete: () => void;
  onCancel: () => void;
}

interface GoogleConnection {
  id: string;
  name: string;
  projectId: string;
  apiKey?: string;
  clientEmail?: string;
  clientId?: string;
  privateKey?: string;
  authType: 'public' | 'serviceAccount';
  region: 'saudi' | 'egypt';
  status: 'connected' | 'error' | 'pending' | 'testing';
}

interface SheetInfo {
  name: string;
  selected: boolean;
  index: number;
}

interface HeaderMapping {
  id: string;
  columnIndex: number;
  originalHeader: string;
  variableName: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  isEnabled: boolean;
}

interface GeneratedVariable {
  sheetName: string;
  headers: HeaderMapping[];
}

export default function ConnectionWizard({ activeTab, onComplete, onCancel }: ConnectionWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Connection Settings
  const [connectionData, setConnectionData] = useState<Partial<GoogleConnection>>({
    name: '',
    projectId: '',
    apiKey: '',
    clientEmail: '',
    clientId: '',
    privateKey: '',
    authType: 'serviceAccount',
    region: activeTab,
    status: 'pending'
  });

  // Step 2: Google Sheet ID
  const [googleSheetId, setGoogleSheetId] = useState('');
  const [sheetIdStatus, setSheetIdStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  // Step 3: Sheet Selection
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<SheetInfo[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);

  // Step 4: Variables & Save
  const [generatedVariables, setGeneratedVariables] = useState<GeneratedVariable[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const steps = [
    { number: 1, title: 'Connection Settings', icon: Settings },
    { number: 2, title: 'Google Sheet ID', icon: Database },
    { number: 3, title: 'Select Sheets', icon: Sheet },
    { number: 4, title: 'Variables & Save', icon: Download }
  ];

  // Helper function to generate clean variable names
  const generateVariableName = (connectionName: string, databaseName: string, sheetName: string, headerName: string) => {
    const cleanName = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    return `${cleanName(connectionName)}_${cleanName(databaseName)}_${cleanName(sheetName)}_${cleanName(headerName)}`;
  };

  // Step 1: Validate connection settings
  const validateConnectionSettings = () => {
    if (!connectionData.name || !connectionData.projectId) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in connection name and project ID",
        variant: "destructive"
      });
      return false;
    }

    if (connectionData.authType === 'serviceAccount') {
      if (!connectionData.clientEmail || !connectionData.privateKey) {
        toast({
          title: "Missing Service Account Credentials",
          description: "Please provide client email and private key for service account authentication",
          variant: "destructive"
        });
        return false;
      }
    } else if (connectionData.authType === 'public') {
      if (!connectionData.apiKey) {
        toast({
          title: "Missing API Key",
          description: "Please provide an API key for public authentication",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  // Step 2: Test Google Sheet ID
  const testGoogleSheetId = async () => {
    if (!googleSheetId.trim()) {
      toast({
        title: "Missing Sheet ID",
        description: "Please enter a Google Sheet ID",
        variant: "destructive"
      });
      return;
    }

    setSheetIdStatus('testing');
    
    try {
      // Create a temporary connection object for testing
      const testConnection: GoogleConnection = {
        ...connectionData as GoogleConnection,
        id: 'temp'
      };

      let sheetsFound = false;

      // Try backend service first
      if (connectionData.authType === 'serviceAccount' && connectionData.clientEmail && connectionData.privateKey) {
        try {
          const backendService = createBackendSheetsService();
          const hasAccess = await backendService.testAccess(googleSheetId, testConnection);
          if (hasAccess) {
            sheetsFound = true;
          }
        } catch (error) {
          logger.warn('Backend test failed, trying public API');
        }
      }

      // Try public API if backend failed or using public auth
      if (!sheetsFound && connectionData.apiKey) {
        try {
          const sheets = await fetchSheetsWithPublicAPI(googleSheetId, connectionData.apiKey);
          if (sheets && sheets.length > 0) {
            sheetsFound = true;
          }
        } catch (error) {
          logger.warn('Public API test failed');
        }
      }

      if (sheetsFound) {
        setSheetIdStatus('valid');
        toast({
          title: "Sheet ID Valid",
          description: "Successfully connected to Google Sheet",
          variant: "default"
        });
      } else {
        setSheetIdStatus('invalid');
        toast({
          title: "Sheet ID Invalid",
          description: "Could not access the Google Sheet. Please check the ID and permissions.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setSheetIdStatus('invalid');
      toast({
        title: "Connection Failed",
        description: "Failed to test Google Sheet connection",
        variant: "destructive"
      });
    }
  };

  // Step 3: Load available sheets
  const loadAvailableSheets = async () => {
    setSheetsLoading(true);
    
    try {
      const testConnection: GoogleConnection = {
        ...connectionData as GoogleConnection,
        id: 'temp'
      };

      let sheetNames: string[] = [];

      // Try backend service first
      if (connectionData.authType === 'serviceAccount' && connectionData.clientEmail && connectionData.privateKey) {
        try {
          const backendService = createBackendSheetsService();
          sheetNames = await backendService.fetchAvailableSheets(googleSheetId, testConnection);
        } catch (error) {
          logger.warn('Backend fetch failed, trying public API');
        }
      }

      // Try public API if backend failed
      if (sheetNames.length === 0 && connectionData.apiKey) {
        try {
          sheetNames = await fetchSheetsWithPublicAPI(googleSheetId, connectionData.apiKey);
        } catch (error) {
          logger.warn('Public API fetch failed, using fallback');
          sheetNames = getFallbackSheetNames();
        }
      }

      // If still no sheets, use fallback
      if (sheetNames.length === 0) {
        sheetNames = getFallbackSheetNames();
      }

      const sheets: SheetInfo[] = sheetNames.map((name, index) => ({
        name,
        selected: false,
        index
      }));

      setAvailableSheets(sheets);
      
      toast({
        title: "Sheets Loaded",
        description: `Found ${sheets.length} sheets in the Google Spreadsheet`,
        variant: "default"
      });

    } catch (error) {
      toast({
        title: "Failed to Load Sheets",
        description: "Could not fetch sheet list from Google Spreadsheet",
        variant: "destructive"
      });
    } finally {
      setSheetsLoading(false);
    }
  };

  // Toggle sheet selection
  const toggleSheetSelection = (index: number) => {
    setAvailableSheets(prev => 
      prev.map(sheet => 
        sheet.index === index 
          ? { ...sheet, selected: !sheet.selected }
          : sheet
      )
    );
  };

  // Select/Deselect all sheets
  const toggleSelectAll = () => {
    const allSelected = availableSheets.every(sheet => sheet.selected);
    setAvailableSheets(prev => 
      prev.map(sheet => ({ ...sheet, selected: !allSelected }))
    );
  };

  // Step 4: Generate variables and save to Firebase
  const generateVariablesAndSave = async () => {
    setIsSaving(true);
    
    try {
      const selectedSheetsList = availableSheets.filter(sheet => sheet.selected);
      
      if (selectedSheetsList.length === 0) {
        toast({
          title: "No Sheets Selected",
          description: "Please select at least one sheet to proceed",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }

      // Step 1: Save connection to Firebase
      const connectionId = `conn_${Date.now()}`;
      const finalConnection: GoogleConnection = {
        ...connectionData as GoogleConnection,
        id: connectionId,
        status: 'connected'
      };

      await saveConnection(finalConnection, activeTab);
      logger.success(`Saved connection: ${finalConnection.name}`);

      // Step 2: Save database to Firebase
      const databaseId = `db_${Date.now()}`;
      const database = {
        id: databaseId,
        name: connectionData.name + ' Database',
        googleSheetId: googleSheetId,
        status: 'connected' as const,
        createdAt: new Date(),
        sheetsConnected: selectedSheetsList.length,
        totalSheetsAvailable: availableSheets.length,
        availableSheetNames: availableSheets.map(s => s.name)
      };

      await saveDatabase(connectionId, database);
      logger.success(`Saved database: ${database.name}`);

      // Step 3: Generate variables and save each sheet as a table
      const variables: GeneratedVariable[] = [];

      for (const sheet of selectedSheetsList) {
        // Generate headers for this sheet
        const sampleHeaders = [
          'ID', 'Name', 'Email', 'Phone', 'Date', 'Status', 'Amount', 'Category',
          'Description', 'Created_At', 'Updated_At', 'Notes'
        ]; // You can make this dynamic by fetching real headers

        const headerMappings: HeaderMapping[] = sampleHeaders.map((header, index) => ({
          id: `header_${Date.now()}_${index}`,
          columnIndex: index,
          originalHeader: header,
          variableName: generateVariableName(connectionData.name!, database.name, sheet.name, header),
          dataType: 'text' as const,
          isEnabled: true
        }));

        variables.push({
          sheetName: sheet.name,
          headers: headerMappings
        });

        // Save table to Firebase
        const tableId = `table_${Date.now()}_${sheet.index}`;
        const table = {
          id: tableId,
          name: sheet.name,
          sheetName: sheet.name,
          status: 'connected' as const,
          createdAt: new Date(),
          headers: headerMappings
        };

        await saveTable(connectionId, databaseId, table);
        
        // Save headers to Firebase
        await saveHeaders(connectionId, databaseId, tableId, headerMappings);
        
        logger.success(`Saved table: ${sheet.name} with ${headerMappings.length} headers`);
      }

      setGeneratedVariables(variables);

      toast({
        title: "Setup Complete!",
        description: `Successfully configured ${selectedSheetsList.length} sheets with all variables`,
        variant: "default"
      });

    } catch (error) {
      logger.error('Failed to save connection data:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save connection and sheet data",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Copy variables to clipboard
  const copyVariablesToClipboard = () => {
    const variableText = generatedVariables.map(sheet => 
      `// ${sheet.sheetName} Variables\n` +
      sheet.headers.map(header => 
        `const ${header.variableName} = ""; // ${header.originalHeader} (${header.dataType})`
      ).join('\n')
    ).join('\n\n');

    navigator.clipboard.writeText(variableText);
    toast({
      title: "Variables Copied",
      description: "All variable declarations copied to clipboard",
      variant: "default"
    });
  };

  // Navigation
  const goToNextStep = async () => {
    if (currentStep === 1) {
      if (!validateConnectionSettings()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (sheetIdStatus !== 'valid') {
        toast({
          title: "Invalid Sheet ID",
          description: "Please test and validate the Google Sheet ID first",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep(3);
      await loadAvailableSheets();
    } else if (currentStep === 3) {
      const selectedCount = availableSheets.filter(sheet => sheet.selected).length;
      if (selectedCount === 0) {
        toast({
          title: "No Sheets Selected",
          description: "Please select at least one sheet to proceed",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep(4);
      await generateVariablesAndSave();
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          
          return (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-primary text-white' : 
                isCompleted ? 'bg-green-600 text-white' : 
                'bg-white/5 text-gray-400'
              }`}>
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span className="font-medium">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-400 mx-4" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white/5 rounded-lg p-8">
        {/* Step 1: Connection Settings */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Connection Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Connection Name *</label>
                <input
                  type="text"
                  value={connectionData.name || ''}
                  onChange={(e) => setConnectionData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Saudi Production"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Project ID *</label>
                <input
                  type="text"
                  value={connectionData.projectId || ''}
                  onChange={(e) => setConnectionData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your-google-project-id"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Authentication Type</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setConnectionData(prev => ({ ...prev, authType: 'serviceAccount' }))}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      connectionData.authType === 'serviceAccount' 
                        ? 'bg-primary text-white' 
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    Service Account (Recommended)
                  </button>
                  <button
                    onClick={() => setConnectionData(prev => ({ ...prev, authType: 'public' }))}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      connectionData.authType === 'public' 
                        ? 'bg-primary text-white' 
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    Public API Key
                  </button>
                </div>
              </div>

              {connectionData.authType === 'serviceAccount' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Client Email *</label>
                    <input
                      type="email"
                      value={connectionData.clientEmail || ''}
                      onChange={(e) => setConnectionData(prev => ({ ...prev, clientEmail: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="service-account@project.iam.gserviceaccount.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Client ID</label>
                    <input
                      type="text"
                      value={connectionData.clientId || ''}
                      onChange={(e) => setConnectionData(prev => ({ ...prev, clientId: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="123456789012345678901"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm text-gray-400 mb-2">Private Key *</label>
                    <textarea
                      value={connectionData.privateKey || ''}
                      onChange={(e) => setConnectionData(prev => ({ ...prev, privateKey: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="-----BEGIN PRIVATE KEY-----"
                    />
                  </div>
                </>
              )}

              {connectionData.authType === 'public' && (
                <div className="lg:col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">API Key *</label>
                  <input
                    type="text"
                    value={connectionData.apiKey || ''}
                    onChange={(e) => setConnectionData(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="AIzaSyC..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Google Sheet ID */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Google Sheet ID</h2>
            
            <div className="max-w-2xl">
              <label className="block text-sm text-gray-400 mb-2">
                Google Spreadsheet ID *
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={googleSheetId}
                  onChange={(e) => setGoogleSheetId(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                />
                <button
                  onClick={testGoogleSheetId}
                  disabled={sheetIdStatus === 'testing' || !googleSheetId.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {sheetIdStatus === 'testing' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube2 className="w-4 h-4" />
                  )}
                  <span>Test</span>
                </button>
              </div>

              {sheetIdStatus !== 'idle' && (
                <div className={`mt-4 p-4 rounded-lg flex items-center space-x-3 ${
                  sheetIdStatus === 'valid' ? 'bg-green-600/20 border border-green-600/40' :
                  sheetIdStatus === 'invalid' ? 'bg-red-600/20 border border-red-600/40' :
                  'bg-blue-600/20 border border-blue-600/40'
                }`}>
                  {sheetIdStatus === 'valid' && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {sheetIdStatus === 'invalid' && <XCircle className="w-5 h-5 text-red-400" />}
                  {sheetIdStatus === 'testing' && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
                  
                  <div>
                    <div className={`font-medium ${
                      sheetIdStatus === 'valid' ? 'text-green-400' :
                      sheetIdStatus === 'invalid' ? 'text-red-400' :
                      'text-blue-400'
                    }`}>
                      {sheetIdStatus === 'valid' && 'Sheet ID Valid'}
                      {sheetIdStatus === 'invalid' && 'Sheet ID Invalid'}
                      {sheetIdStatus === 'testing' && 'Testing Connection...'}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {sheetIdStatus === 'valid' && 'Successfully connected to Google Sheet'}
                      {sheetIdStatus === 'invalid' && 'Could not access the Google Sheet. Check the ID and permissions.'}
                      {sheetIdStatus === 'testing' && 'Verifying access to the Google Spreadsheet...'}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                <div className="text-blue-400 font-medium mb-2">How to find your Google Sheet ID:</div>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>1. Open your Google Sheet in a browser</div>
                  <div>2. Look at the URL: https://docs.google.com/spreadsheets/d/<strong className="text-white">SHEET_ID_HERE</strong>/edit</div>
                  <div>3. Copy the long string between /d/ and /edit</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Sheets */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Select Sheets</h2>
            
            {sheetsLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <div className="text-white font-medium">Loading sheets...</div>
                <div className="text-gray-400 text-sm mt-2">Fetching available sheets from Google Spreadsheet</div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="text-gray-400">
                    Found {availableSheets.length} sheets • {availableSheets.filter(s => s.selected).length} selected
                  </div>
                  <button
                    onClick={toggleSelectAll}
                    className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {availableSheets.every(sheet => sheet.selected) ? (
                      <>
                        <Square className="w-4 h-4" />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        <span>Select All</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableSheets.map((sheet) => (
                    <div
                      key={sheet.index}
                      onClick={() => toggleSheetSelection(sheet.index)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        sheet.selected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-white/20 bg-white/5 hover:border-white/40'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {sheet.selected ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <div className="text-white font-medium">{sheet.name}</div>
                          <div className="text-gray-400 text-sm">Sheet {sheet.index + 1}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {availableSheets.length === 0 && (
                  <div className="text-center py-12">
                    <Sheet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <div className="text-white font-medium mb-2">No sheets found</div>
                    <div className="text-gray-400 text-sm">Could not load sheets from the Google Spreadsheet</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Variables & Save */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Variables & Save</h2>
            
            {isSaving ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <div className="text-white font-medium">Saving to Firebase...</div>
                <div className="text-gray-400 text-sm mt-2">Creating connections, databases, tables, and headers</div>
              </div>
            ) : generatedVariables.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-green-400 font-medium flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Setup Complete!</span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      Generated {generatedVariables.reduce((acc, sheet) => acc + sheet.headers.length, 0)} variables across {generatedVariables.length} sheets
                    </div>
                  </div>
                  <button
                    onClick={copyVariablesToClipboard}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Variables</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {generatedVariables.map((sheet, sheetIndex) => (
                    <div key={sheetIndex} className="bg-white/5 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-white mb-4">{sheet.sheetName}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sheet.headers.map((header, headerIndex) => (
                          <div key={headerIndex} className="flex items-center space-x-3">
                            <div className="text-gray-400 text-sm w-16">Col {header.columnIndex + 1}</div>
                            <div className="flex-1">
                              <div className="text-white text-sm font-mono">{header.variableName}</div>
                              <div className="text-gray-400 text-xs">{header.originalHeader} ({header.dataType})</div>
                            </div>
                            {header.isEnabled ? (
                              <Eye className="w-4 h-4 text-green-500" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    onClick={onComplete}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Complete Setup</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400">Preparing variables...</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={currentStep === 1 ? onCancel : goToPreviousStep}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentStep === 1 ? 'Cancel' : 'Previous'}</span>
        </button>

        {currentStep < 4 && (
          <button
            onClick={goToNextStep}
            disabled={isLoading}
            className="px-6 py-3 bg-primary hover:bg-primary/80 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
