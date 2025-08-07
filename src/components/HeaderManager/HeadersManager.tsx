import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft,
  Settings,
  CheckCircle, 
  XCircle, 
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Trash2
} from 'lucide-react';

// UI imports
import { useToast } from "@/hooks/use-toast";

// Firebase imports
import { 
  saveHeaders, 
  loadHeaders,
  loadConnections,
  loadDatabases,
  loadTables,
  saveSpreadsheetData,
  loadSpreadsheetData,
  deleteSpreadsheetData
} from '../../lib/firebase';

// Import optimization utilities
import { 
  Logger,
  checkBackendHealth,
  shouldRefreshSheetMetadata,
  sessionCache,
  PersistentCache,
  CACHE_KEYS
} from '../../utils/optimizations';

// Interfaces
interface HeaderMapping {
  id: string;
  columnIndex: number;
  originalHeader: string;
  variableName: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  isEnabled: boolean;
  isKey: boolean; // New field to mark this as the primary key column
}

interface TableConnection {
  id: string;
  name: string;
  sheetName: string;
  sheetId: string;
  status: 'connected' | 'loading' | 'error';
  headers: HeaderMapping[];
  totalHeaders?: number;
  headersConnected?: number;
  rowCount?: number;
  errorMessage?: string;
}

interface DatabaseConnection {
  id: string;
  name: string;
  googleSheetId: string;
  status: 'connected' | 'loading' | 'testing' | 'error';
  createdAt: Date;
  sheetsConnected: number;
  totalSheetsAvailable?: number;
  availableSheetNames?: string[];
  lastTested?: Date;
  errorMessage?: string;
  tables?: TableConnection[];
}

interface GoogleConnection {
  id: string;
  name: string;
  serviceAccountEmail: string;
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  authUri: string;
  tokenUri: string;
  apiKey?: string; // Adding apiKey for fallback access
  region: 'saudi' | 'egypt';
  createdAt: Date;
  lastTested?: Date;
  status: 'connected' | 'testing' | 'error' | 'loading';
  errorMessage?: string;
  databases?: DatabaseConnection[];
}

interface HeadersManagerProps {
  setCurrentView: (view: 'connections' | 'databases' | 'tables' | 'headers') => void;
  selectedConnection: string;
  selectedDatabase: string;
  selectedTable: string;
}

export function HeadersManager({ 
  setCurrentView, 
  selectedConnection, 
  selectedDatabase, 
  selectedTable
}: HeadersManagerProps) {
  // UI hooks
  const { toast } = useToast();
  
  // State management
  const [headers, setHeaders] = useState<HeaderMapping[]>([]);
  const [selectedConnectionData, setSelectedConnectionData] = useState<GoogleConnection | null>(null);
  const [selectedDatabaseData, setSelectedDatabaseData] = useState<DatabaseConnection | null>(null);
  const [selectedTableData, setSelectedTableData] = useState<TableConnection | null>(null);

  // Local state for editing headers
  const [editingHeaders, setEditingHeaders] = useState<HeaderMapping[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for data synchronization
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [dataStats, setDataStats] = useState<{
    rowCount: number;
    lastSync: Date | null;
    hasData: boolean;
  }>({
    rowCount: 0,
    lastSync: null,
    hasData: false
  });

  // Helper function to show detailed API access guidance
  const showApiAccessGuidance = () => {
    toast({
      title: "How to Fix Google Sheets API Access",
      description: `1. Make your Google Sheet publicly viewable: Share → "Anyone with the link" → "Viewer" | 2. Check API key has Google Sheets API enabled | 3. Verify sheet name "${selectedTableData?.sheetName || 'BOOKING X'}" matches exactly (case-sensitive)`,
      variant: "default",
    });
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      if (selectedConnection && selectedDatabase && selectedTable) {
        setIsLoading(true);
        setError(null);
        
        try {
          Logger.debug('Loading headers data...', {
            connection: selectedConnection,
            database: selectedDatabase,
            table: selectedTable
          });

          // Load connection, database, and table data first
          const connectionData = await getCurrentConnection();
          const databaseData = await getCurrentDatabase();
          const tableData = await getCurrentTable();
          
          setSelectedConnectionData(connectionData);
          setSelectedDatabaseData(databaseData);
          setSelectedTableData(tableData);

          if (!tableData) {
            Logger.warn('Table data not found');
            setError('Table not found. Please check your selection.');
            setHeaders([]);
            setEditingHeaders([]);
            return;
          }

          // Try to load headers from Firebase first
          let headersData = await loadHeaders(selectedConnection, selectedDatabase, selectedTable);
          
          // If no headers in Firebase but table has headers, use table headers
          if (headersData.length === 0 && tableData.headers && tableData.headers.length > 0) {
            Logger.debug('No headers in Firebase, using table headers...');
            headersData = tableData.headers;
            
            // Save table headers to Firebase for future use
            try {
              await saveHeaders(selectedConnection, selectedDatabase, selectedTable, headersData);
              Logger.success('Synchronized table headers to Firebase');
            } catch (syncError) {
              Logger.warn('Could not sync headers to Firebase:', syncError);
            }
          }

          // If still no headers, generate default ones
          if (headersData.length === 0) {
            Logger.debug('No headers found, generating default headers...');
            headersData = await generateDefaultHeaders(connectionData, databaseData, tableData);
          }

          setHeaders(headersData);
          setEditingHeaders(headersData);
          
          // Load data stats
          await loadDataStats();
          
          Logger.success(`Loaded ${headersData.length} headers successfully`);
          
        } catch (error) {
          Logger.error('Error loading headers data:', error);
          setError(error instanceof Error ? error.message : 'Failed to load headers');
          setHeaders([]);
          setEditingHeaders([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [selectedConnection, selectedDatabase, selectedTable]);

  // Helper to get current connection from Firebase
  const getCurrentConnection = async (): Promise<GoogleConnection | null> => {
    try {
      const cacheKey = `connection_${selectedConnection}`;
      
      // Check session cache first
      if (sessionCache.has(cacheKey)) {
        return sessionCache.get(cacheKey);
      }
      
      // Determine region from connection ID
      const region = selectedConnection.startsWith('Saudi_') ? 'saudi' : 'egypt';
      const connections = await loadConnections(region);
      const connection = connections.find(conn => conn.id === selectedConnection) || null;
      
      // Cache for 10 minutes
      if (connection) {
        sessionCache.set(cacheKey, connection, 10);
      }
      
      return connection;
    } catch (error) {
      Logger.error('Error loading connection:', error);
      return null;
    }
  };

  // Helper to get current database from Firebase
  const getCurrentDatabase = async (): Promise<DatabaseConnection | null> => {
    try {
      const cacheKey = `database_${selectedConnection}_${selectedDatabase}`;
      
      // Check session cache first
      if (sessionCache.has(cacheKey)) {
        return sessionCache.get(cacheKey);
      }
      
      const databases = await loadDatabases(selectedConnection);
      const database = databases.find(db => db.id === selectedDatabase) || null;
      
      // Cache for 10 minutes
      if (database) {
        sessionCache.set(cacheKey, database, 10);
      }
      
      return database;
    } catch (error) {
      Logger.error('Error loading database:', error);
      return null;
    }
  };

  // Helper to get current table from Firebase
  const getCurrentTable = async (): Promise<TableConnection | null> => {
    try {
      const cacheKey = `table_${selectedConnection}_${selectedDatabase}_${selectedTable}`;
      
      // Check session cache first
      if (sessionCache.has(cacheKey)) {
        return sessionCache.get(cacheKey);
      }
      
      const tables = await loadTables(selectedConnection, selectedDatabase);
      const table = tables.find(table => table.id === selectedTable) || null;
      
      // Cache for 10 minutes
      if (table) {
        sessionCache.set(cacheKey, table, 10);
      }
      
      return table;
    } catch (error) {
      Logger.error('Error loading table:', error);
      return null;
    }
  };

  // Header update functions
  const updateHeaderMapping = (headerId: string, field: keyof HeaderMapping, value: any) => {
    console.log('updateHeaderMapping called:', { headerId, field, value });
    
    setEditingHeaders(prevHeaders => {
      console.log('Previous headers:', prevHeaders.map(h => ({ id: h.id, originalHeader: h.originalHeader })));
      
      const updatedHeaders = prevHeaders.map(header =>
        header.id === headerId
          ? { ...header, [field]: value }
          : header
      );
      
      console.log('Updated headers:', updatedHeaders.map(h => ({ id: h.id, originalHeader: h.originalHeader })));
      return updatedHeaders;
    });
    
    setHasUnsavedChanges(true);
  };

  // Set a header as the key (only one can be key at a time)
  const setHeaderAsKey = (headerId: string) => {
    const updatedHeaders = editingHeaders.map(header => ({
      ...header,
      isKey: header.id === headerId, // Only the selected header becomes the key
      isEnabled: header.id === headerId ? true : header.isEnabled // Key headers must be enabled
    }));
    setEditingHeaders(updatedHeaders);
    setHasUnsavedChanges(true);
    
    Logger.debug('Key header updated:', updatedHeaders.find(h => h.isKey)?.originalHeader);
  };

  // Save changes
  const saveChanges = async () => {
    try {
      // Save headers to Firebase
      await saveHeaders(selectedConnection, selectedDatabase, selectedTable, editingHeaders);
      
      // Update local state
      setHeaders(editingHeaders);
      setHasUnsavedChanges(false);
      Logger.success('Header mappings saved successfully');
      
      toast({
        title: "Headers Saved",
        description: "Header mappings have been saved successfully.",
        variant: "default",
      });
    } catch (error) {
      Logger.error('Error saving headers:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save header mappings. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Sync spreadsheet data to Firebase
  const syncDataToFirebase = async () => {
    if (!selectedConnectionData || !selectedDatabaseData || !selectedTableData) {
      toast({
        title: "Missing Data",
        description: "Connection, database, or table information is missing.",
        variant: "destructive",
      });
      return;
    }

    const enabledHeaders = editingHeaders.filter(h => h.isEnabled);
    const keyHeader = editingHeaders.find(h => h.isKey);
    
    if (enabledHeaders.length === 0) {
      toast({
        title: "No Headers Selected",
        description: "Please enable at least one header before syncing data.",
        variant: "destructive",
      });
      return;
    }

    if (!keyHeader) {
      toast({
        title: "No Key Column Selected",
        description: "Please select one header as the key column for unique document IDs.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncingData(true);
    setError(null);

    try {
      Logger.debug('Starting data sync to Firebase...');
      Logger.debug(`Using key column: ${keyHeader.originalHeader} (index: ${keyHeader.columnIndex})`);
      
      // First, check backend health
      const { createBackendSheetsService } = await import('../../utils/backendSheetsService');
      const backendService = createBackendSheetsService();
      
      const isBackendHealthy = await backendService.checkHealth();
      if (!isBackendHealthy) {
        throw new Error('Backend service is not available. Please check the server connection.');
      }

      // Test access to the spreadsheet
      const hasAccess = await backendService.testAccess(
        selectedDatabaseData.googleSheetId, 
        selectedConnectionData
      );
      
      if (!hasAccess) {
        throw new Error('Cannot access the Google Spreadsheet. Please check your connection credentials.');
      }

      toast({
        title: "Fetching Data",
        description: "Retrieving data from Google Sheets...",
        variant: "default",
      });

      // Fetch all data from the spreadsheet
      const sheetData = await backendService.fetchSheetData(
        selectedDatabaseData.googleSheetId,
        selectedTableData.sheetName,
        selectedConnectionData
      );

      if (!sheetData || sheetData.length === 0) {
        throw new Error('No data found in the spreadsheet or the sheet is empty.');
      }

      // Remove the header row if it exists
      const dataRows = sheetData.slice(1); // Skip first row (headers)
      
      Logger.debug(`Fetched ${dataRows.length} data rows from Google Sheets`);

      toast({
        title: "Clearing Old Data",
        description: "Removing existing data to prevent duplicates...",
        variant: "default",
      });

      // Clear existing data first to prevent duplicates
      await deleteSpreadsheetData(
        selectedConnection,
        selectedDatabase,
        selectedTable
      );

      Logger.debug('Cleared existing data from Firebase');

      toast({
        title: "Processing Data",
        description: `Processing ${dataRows.length} rows with key column "${keyHeader.originalHeader}"...`,
        variant: "default",
      });

      // Save data to Firebase with the key column as document ID
      await saveSpreadsheetData(
        selectedConnection,
        selectedDatabase,
        selectedTable,
        dataRows,
        editingHeaders
      );

      // Update local stats
      setDataStats({
        rowCount: dataRows.length,
        lastSync: new Date(),
        hasData: true
      });

      Logger.success(`Successfully synced ${dataRows.length} rows to Firebase`);

      toast({
        title: "Data Sync Complete",
        description: `Successfully synced ${dataRows.length} rows using "${keyHeader.originalHeader}" as key column.`,
        variant: "default",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error syncing data to Firebase:', error);
      setError(errorMessage);
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncingData(false);
    }
  };

  // Load existing data stats
  const loadDataStats = async () => {
    try {
      const existingData = await loadSpreadsheetData(
        selectedConnection,
        selectedDatabase,
        selectedTable
      );
      
      if (existingData.length > 0) {
        setDataStats({
          rowCount: existingData.length,
          lastSync: existingData[0]?.lastUpdated || null,
          hasData: true
        });
      }
    } catch (error) {
      Logger.debug('No existing data found or error loading data stats');
    }
  };

  // Reset changes
  const resetChanges = () => {
    setEditingHeaders([...headers]);
    setHasUnsavedChanges(false);
    Logger.debug('Header changes reset');
  };

  // Generate variable name based on header
  const generateVariableName = (connectionName: string, databaseName: string, tableName: string, headerName: string) => {
    const cleanName = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    return `${cleanName(connectionName)}_${cleanName(databaseName)}_${cleanName(tableName)}_${cleanName(headerName)}`;
  };

  // Generate default headers when none are found
  const generateDefaultHeaders = async (
    connectionData: GoogleConnection | null, 
    databaseData: DatabaseConnection | null, 
    tableData: TableConnection
  ): Promise<HeaderMapping[]> => {
    try {
      Logger.debug('Generating default headers for table:', tableData.name);
      
      if (!connectionData || !databaseData) {
        Logger.warn('Missing connection or database data for header generation');
        return [];
      }

      // Check if sheet metadata needs refresh
      if (!shouldRefreshSheetMetadata(databaseData)) {
        Logger.debug('Using cached sheet metadata for headers');
      }

      // Try to fetch headers from Google Sheets with optimized backend checking
      const { fetchHeadersWithPublicAPI, getFallbackHeaders } = await import('../../utils/authenticatedGoogleSheets');
      
      let sheetHeaders: string[] = [];
      
      // Check backend health first (force refresh cache)
      sessionCache.clear('backend_health'); // Clear cached health status
      const isBackendHealthy = await checkBackendHealth();
      
      if (isBackendHealthy && connectionData.clientEmail && connectionData.privateKey) {
        Logger.debug('Backend is healthy! Attempting backend service for headers');
        try {
          // Import backend service for headers
          const { createBackendSheetsService } = await import('../../utils/backendSheetsService');
          const backendService = createBackendSheetsService();
          
          // Test access first
          Logger.debug('Testing backend access to spreadsheet for headers...');
          const hasAccess = await backendService.testAccess(databaseData.googleSheetId, connectionData);
          if (hasAccess) {
            Logger.debug('Backend access test passed! Fetching headers...');
            // Fetch headers using backend service
            const headers = await backendService.fetchSheetHeaders(
              databaseData.googleSheetId, 
              tableData.sheetName, 
              connectionData
            );
            
            if (headers && headers.length > 0) {
              sheetHeaders = headers;
              Logger.success('✅ Successfully fetched REAL headers using backend service:', sheetHeaders.length);
              Logger.debug('Real headers:', sheetHeaders);
            } else {
              Logger.warn('Backend service returned empty headers list');
              throw new Error('Backend service returned no headers');
            }
          } else {
            Logger.warn('Backend access test failed for headers');
            throw new Error('Backend access test failed');
          }
        } catch (backendError) {
          Logger.warn('Backend service failed for headers:', backendError);
          Logger.debug('Trying public API fallback...');
        }
      } else {
        Logger.warn('Backend not healthy or missing credentials for backend service');
        if (!isBackendHealthy) {
          Logger.debug('Backend health check failed');
        }
        if (!connectionData.clientEmail || !connectionData.privateKey) {
          Logger.debug('Missing clientEmail or privateKey for backend authentication');
        }
      }
      
      // Try public API if API key is available
      if (connectionData.apiKey && sheetHeaders.length === 0) {
        try {
          sheetHeaders = await fetchHeadersWithPublicAPI(
            databaseData.googleSheetId,
            tableData.sheetName,
            connectionData.apiKey
          );
          Logger.success('Fetched headers from Google Sheets API:', sheetHeaders.length);
        } catch (apiError) {
          Logger.warn('Could not fetch headers from API, using fallback');
          Logger.debug('API Error details:', apiError);
          
          // Show user-friendly toast notification for API access issues
          toast({
            title: "Google Sheets API Access Issue",
            description: "Using fallback headers. For live headers, see the troubleshooting guide below.",
            variant: "default",
          });
          
          // Show detailed guidance after a short delay
          setTimeout(() => {
            showApiAccessGuidance();
          }, 2000);
          
          // Add user-friendly guidance for common issues
          if (apiError instanceof Error && apiError.message.includes('403')) {
            Logger.info('💡 To fix 403 errors: 1) Make spreadsheet public, 2) Check API key permissions, 3) Verify sheet name');
          }
        }
      }
      
      // If no headers from API, use fallback
      if (sheetHeaders.length === 0) {
        sheetHeaders = getFallbackHeaders(tableData.sheetName);
        Logger.debug('Using fallback headers:', sheetHeaders.length);
        
        // Show info toast when using fallback headers
        toast({
          title: "Using Fallback Headers",
          description: `Generated ${sheetHeaders.length} default headers for "${tableData.sheetName}". You can customize these as needed.`,
          variant: "default",
        });
      } else if (sheetHeaders.length > 0) {
        // Show success toast when headers are loaded successfully
        toast({
          title: "Headers Loaded Successfully",
          description: `Loaded ${sheetHeaders.length} headers from "${tableData.sheetName}".`,
          variant: "default",
        });
      }
      
      // Generate header mappings
      const headerMappings: HeaderMapping[] = sheetHeaders.map((header, index) => ({
        id: `header_${Date.now()}_${index}`,
        columnIndex: index,
        originalHeader: header,
        variableName: generateVariableName(
          connectionData.name,
          databaseData.name,
          tableData.name,
          header
        ),
        dataType: 'text' as const,
        isEnabled: true,
        isKey: false // Default to false, user can select which one is the key
      }));
      
      Logger.success(`Generated ${headerMappings.length} default header mappings`);
      return headerMappings;
      
    } catch (error) {
      Logger.error('Error generating default headers:', error);
      return [];
    }
  };

  // Auto-generate variable name when original header changes
  const autoGenerateVariableName = (headerId: string, originalHeader: string) => {
    if (selectedConnectionData && selectedDatabaseData && selectedTableData) {
      const variableName = generateVariableName(
        selectedConnectionData.name,
        selectedDatabaseData.name,
        selectedTableData.name,
        originalHeader
      );
      updateHeaderMapping(headerId, 'variableName', variableName);
    }
  };

  // Refresh headers from Google Sheets
  const refreshHeadersFromSheets = async () => {
    if (!selectedConnectionData || !selectedDatabaseData || !selectedTableData) {
      Logger.error('Missing connection, database, or table data');
      return;
    }

    try {
      Logger.debug('Refreshing headers from Google Sheets...');
      const freshHeaders = await generateDefaultHeaders(
        selectedConnectionData,
        selectedDatabaseData,
        selectedTableData
      );

      if (freshHeaders.length > 0) {
        // Merge with existing headers, preserving custom settings
        const mergedHeaders = freshHeaders.map(freshHeader => {
          const existingHeader = editingHeaders.find(
            h => h.columnIndex === freshHeader.columnIndex || h.originalHeader === freshHeader.originalHeader
          );

          if (existingHeader) {
            // Preserve existing settings but update original header
            return {
              ...existingHeader,
              originalHeader: freshHeader.originalHeader
            };
          } else {
            // New header
            return freshHeader;
          }
        });

        setEditingHeaders(mergedHeaders);
        setHasUnsavedChanges(true);
        Logger.success(`Refreshed ${mergedHeaders.length} headers from sheets`);
      }
    } catch (error) {
      Logger.error('Error refreshing headers:', error);
    }
  };

  // Add new header manually
  const addNewHeader = () => {
    if (!selectedConnectionData || !selectedDatabaseData || !selectedTableData) {
      return;
    }

    const newHeaderId = `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newHeader: HeaderMapping = {
      id: newHeaderId,
      columnIndex: editingHeaders.length,
      originalHeader: '', // Start with empty string so user can type immediately
      variableName: generateVariableName(
        selectedConnectionData.name,
        selectedDatabaseData.name,
        selectedTableData.name,
        `Column ${editingHeaders.length + 1}`
      ),
      dataType: 'text',
      isEnabled: true,
      isKey: false
    };

    console.log('Adding new header:', newHeader);
    setEditingHeaders(prev => {
      const updated = [...prev, newHeader];
      console.log('Headers after adding new one:', updated.map(h => ({ id: h.id, originalHeader: h.originalHeader })));
      return updated;
    });
    setHasUnsavedChanges(true);
    
    // Focus the new header's input field after React has updated the DOM
    requestAnimationFrame(() => {
      setTimeout(() => {
        const inputElement = document.querySelector(`input[data-header-id="${newHeaderId}"]`) as HTMLInputElement;
        console.log('Looking for input with ID:', newHeaderId);
        console.log('Found input element:', inputElement);
        
        if (inputElement) {
          inputElement.focus();
          inputElement.click(); // Trigger click to ensure cursor is positioned
          console.log('Successfully focused new header input:', newHeaderId);
          console.log('Input value:', inputElement.value);
          console.log('Input readOnly:', inputElement.readOnly);
          console.log('Input disabled:', inputElement.disabled);
        } else {
          console.warn('Could not find input element for new header:', newHeaderId);
          console.log('Available inputs:', Array.from(document.querySelectorAll('input[data-header-id]')).map(el => el.getAttribute('data-header-id')));
          
          // Try again with a longer delay
          setTimeout(() => {
            const retryElement = document.querySelector(`input[data-header-id="${newHeaderId}"]`) as HTMLInputElement;
            if (retryElement) {
              retryElement.focus();
              retryElement.click();
              console.log('Successfully focused new header input on retry:', newHeaderId);
            } else {
              console.error('Still could not find input element:', newHeaderId);
            }
          }, 500);
        }
      }, 200);
    });
  };

  // Remove header
  const removeHeader = (headerId: string) => {
    const updatedHeaders = editingHeaders.filter(header => header.id !== headerId);
    setEditingHeaders(updatedHeaders);
    setHasUnsavedChanges(true);
  };

  if (!selectedTableData && !isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Table Not Found</h3>
          <p className="text-gray-400 mb-4">The selected table could not be found.</p>
          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}
          <button
            onClick={() => setCurrentView('tables')}
            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Tables
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-white mb-2">Loading Headers...</h3>
          <p className="text-gray-400">Please wait while we load the header data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Render action buttons in the breadcrumb area via portal */}
      {typeof document !== 'undefined' && document.getElementById('action-buttons-container') && createPortal(
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-1 mr-4">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-yellow-400 text-xs">Unsaved</span>
            </div>
          )}
          <button
            onClick={addNewHeader}
            className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 text-xs"
            title="Add new header"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Add</span>
          </button>
          <button
            onClick={refreshHeadersFromSheets}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 text-xs"
            title="Refresh headers from Google Sheets"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={resetChanges}
            className="bg-gray-600 hover:bg-gray-700 text-white px-2.5 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={saveChanges}
            className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 text-xs"
          >
            <Save className="w-3 h-3" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={syncDataToFirebase}
            disabled={isSyncingData || editingHeaders.filter(h => h.isEnabled).length === 0}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 text-xs"
          >
            {isSyncingData ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">{isSyncingData ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>,
        document.getElementById('action-buttons-container')!
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <span className="text-red-400 font-medium">Error</span>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && (
        <div className="flex items-center space-x-1 mb-4">
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-yellow-400 text-xs">You have unsaved changes</span>
        </div>
      )}

      {/* Headers List */}
      <div className="bg-white/5 rounded-lg p-6">
        {editingHeaders.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Headers Found</h3>
            <p className="text-gray-400 mb-6">
              This table doesn't have any headers configured yet. 
              You can refresh headers from the connected Google Sheet or add them manually using the buttons above.
            </p>
          </div>
        ) : (
          <div>
            {/* Table Header */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center mb-4 pb-4 border-b border-white/20">
              <div className="lg:col-span-1 text-sm text-gray-400 font-medium">Column</div>
              <div className="lg:col-span-2 text-sm text-gray-400 font-medium">Original Header</div>
              <div className="lg:col-span-4 text-sm text-gray-400 font-medium">Variable Name</div>
              <div className="lg:col-span-2 text-sm text-gray-400 font-medium">Data Type</div>
              <div className="lg:col-span-1 text-sm text-gray-400 font-medium">Enabled</div>
              <div className="lg:col-span-1 text-sm text-gray-400 font-medium">Key Column</div>
              <div className="lg:col-span-1 text-sm text-gray-400 font-medium">Actions</div>
            </div>
            
            {/* Table Rows */}
            <div className="space-y-4">
              {editingHeaders
                .slice()
                .sort((a, b) => a.columnIndex - b.columnIndex)
                .map((header) => (
                <div key={header.id} className="bg-white/5 rounded-lg p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Column Index */}
                    <div className="lg:col-span-1">
                      <div className="text-white font-medium">{header.columnIndex + 1}</div>
                    </div>

                    {/* Original Header */}
                    <div className="lg:col-span-2">
                      <input
                        type="text"
                        value={header.originalHeader || ''}
                        data-header-id={header.id}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          console.log('Input onChange triggered:', {
                            headerId: header.id,
                            oldValue: header.originalHeader,
                            newValue: newValue,
                            timestamp: new Date().toISOString()
                          });
                          
                          updateHeaderMapping(header.id, 'originalHeader', newValue);
                          autoGenerateVariableName(header.id, newValue);
                        }}
                        onFocus={(e) => {
                          console.log('Input focused:', header.id, 'value:', e.target.value);
                        }}
                        onBlur={(e) => {
                          console.log('Input blurred:', header.id, 'value:', e.target.value);
                        }}
                        onKeyDown={(e) => {
                          console.log('Key pressed:', e.key, 'on header:', header.id, 'current value:', e.currentTarget.value);
                        }}
                        placeholder={!header.originalHeader ? 'Enter header name...' : ''}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                      />
                    </div>

                    {/* Variable Name */}
                    <div className="lg:col-span-4">
                      <input
                        type="text"
                        value={header.variableName}
                        onChange={(e) => updateHeaderMapping(header.id, 'variableName', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>

                    {/* Data Type */}
                    <div className="lg:col-span-2">
                      <select
                        value={header.dataType}
                        onChange={(e) => updateHeaderMapping(header.id, 'dataType', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>

                    {/* Enabled Toggle */}
                    <div className="lg:col-span-1">
                      <button
                        onClick={() => updateHeaderMapping(header.id, 'isEnabled', !header.isEnabled)}
                        disabled={header.isKey} // Key headers must stay enabled
                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                          header.isEnabled 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-gray-600 hover:bg-gray-700 text-gray-400'
                        } ${header.isKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {header.isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Key Column Toggle */}
                    <div className="lg:col-span-1">
                      <button
                        onClick={() => setHeaderAsKey(header.id)}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                          header.isKey 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'bg-gray-600 hover:bg-gray-700 text-gray-400'
                        }`}
                        title={header.isKey ? 'This is the key column' : 'Set as key column'}
                      >
                        {header.isKey ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Settings className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Remove Button */}
                    <div className="lg:col-span-1">
                      <button
                        onClick={() => removeHeader(header.id)}
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                        title="Remove header"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-8">
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Total Headers</div>
          <div className="text-white font-medium">{editingHeaders.length}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Enabled Headers</div>
          <div className="text-white font-medium">{editingHeaders.filter(h => h.isEnabled).length}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Key Column</div>
          <div className="text-white font-medium text-xs">
            {editingHeaders.find(h => h.isKey)?.originalHeader || 'Not Set'}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Data Rows in Firebase</div>
          <div className="text-white font-medium">{dataStats.rowCount}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Last Data Sync</div>
          <div className="text-white font-medium text-xs">
            {dataStats.lastSync ? 
              dataStats.lastSync.toLocaleString() : 
              'Never'
            }
          </div>
        </div>
      </div>

      {/* Data Sync Status */}
      {dataStats.hasData && (
        <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <span className="text-green-400 font-medium">Data Synchronized</span>
              <p className="text-green-300 text-sm mt-1">
                {dataStats.rowCount} rows of spreadsheet data are stored in Firebase with the current header configuration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Instructions */}
      {editingHeaders.filter(h => h.isEnabled).length > 0 && !dataStats.hasData && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            <div>
              <span className="text-blue-400 font-medium">Ready to Sync Data</span>
              <p className="text-blue-300 text-sm mt-1">
                You have {editingHeaders.filter(h => h.isEnabled).length} headers enabled. 
                {editingHeaders.find(h => h.isKey) ? 
                  ` Using "${editingHeaders.find(h => h.isKey)?.originalHeader}" as key column.` :
                  ' Please select a key column first.'
                } Click "Sync Data to Firebase" to import your Google Sheets data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Column Instructions */}
      {editingHeaders.length > 0 && !editingHeaders.find(h => h.isKey) && (
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-yellow-500" />
            <div>
              <span className="text-yellow-400 font-medium">Select Key Column</span>
              <p className="text-yellow-300 text-sm mt-1">
                Choose one header as the key column. This column's values will be used as unique Firebase document IDs, 
                enabling proper data synchronization and updates. Common key columns include ID, Email, or Name.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <div>
              <span className="text-yellow-400 font-medium">You have unsaved changes</span>
              <p className="text-yellow-300 text-sm mt-1">
                Don't forget to save your header mappings before navigating away.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
