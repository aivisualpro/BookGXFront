import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Database, 
  ArrowLeft,
  CheckCircle, 
  XCircle, 
  RefreshCw,
  TestTube,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Firebase imports
import { 
  saveTable, 
  loadTables, 
  deleteTable as deleteFirebaseTable,
  loadConnections,
  loadDatabases
} from '../../lib/firebase';

// Google Sheets API imports
import { 
  createBackendSheetsService, 
  getFallbackHeaders, 
  fetchHeadersWithPublicAPI 
} from '../../utils/backendSheetsService';

// Import optimization utilities
import { 
  Logger,
  checkBackendHealth,
  sessionCache
} from '../../utils/optimizations';

// Interfaces
interface TableConnection {
  id: string;
  name: string;
  sheetName: string;
  sheetId: string;
  status: 'connected' | 'loading' | 'testing' | 'error';
  headers: HeaderMapping[];
  totalHeaders?: number;
  headersConnected?: number;
  rowCount?: number;
  errorMessage?: string;
}

interface HeaderMapping {
  id: string;
  columnIndex: number;
  originalHeader: string;
  variableName: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  isEnabled: boolean;
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
  projectId: string;
  apiKey: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  createdAt: Date;
  lastTested?: Date;
  errorMessage?: string;
  databases?: DatabaseConnection[];
}

interface TablesManagerProps {
  setCurrentView: (view: 'connections' | 'databases' | 'tables' | 'headers') => void;
  selectedConnection: string;
  selectedDatabase: string;
  setSelectedTable: (tableId: string) => void;
  activeTab: 'saudi' | 'egypt';
}

export function TablesManager({ 
  setCurrentView, 
  selectedConnection, 
  selectedDatabase, 
  setSelectedTable, 
  activeTab 
}: TablesManagerProps) {
  // State management
  const [tables, setTables] = useState<TableConnection[]>([]);
  const [selectedConnectionData, setSelectedConnectionData] = useState<GoogleConnection | null>(null);
  const [selectedDatabaseData, setSelectedDatabaseData] = useState<DatabaseConnection | null>(null);

  // Modal states
  const [showAddTable, setShowAddTable] = useState(false);

  // Form states
  const [newTableName, setNewTableName] = useState('');
  const [newTableSheetName, setNewTableSheetName] = useState('');

  // Load data on component mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      if (selectedConnection && selectedDatabase) {
        try {
          // Load tables from Firebase
          const tablesData = await loadTables(selectedConnection, selectedDatabase);
          setTables(tablesData);

          // Load connection and database data
          const connectionData = await getCurrentConnection();
          const databaseData = await getCurrentDatabase();
          setSelectedConnectionData(connectionData);
          setSelectedDatabaseData(databaseData);
        } catch (error) {
          console.error('Error loading tables data:', error);
          setTables([]);
        }
      }
    };

    loadData();
  }, [selectedConnection, selectedDatabase, activeTab]);

  // Helper functions
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Helper to get current connection from Firebase
  const getCurrentConnection = async (): Promise<GoogleConnection | null> => {
    try {
      const connections = await loadConnections(activeTab);
      return connections.find(conn => conn.id === selectedConnection) || null;
    } catch (error) {
      console.error('Error loading connection:', error);
      return null;
    }
  };

  // Helper to get current database from Firebase
  const getCurrentDatabase = async (): Promise<DatabaseConnection | null> => {
    try {
      const databases = await loadDatabases(selectedConnection);
      return databases.find(db => db.id === selectedDatabase) || null;
    } catch (error) {
      console.error('Error loading database:', error);
      return null;
    }
  };

  // Helper to get current tables
  const getCurrentTables = (): TableConnection[] => {
    return tables;
  };

  // Status helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'testing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-400';
      case 'testing':
        return 'text-blue-400';
      case 'loading':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };  // Fetch headers from a specific sheet using enhanced API approach with fallbacks
  const fetchSheetHeaders = async (googleSheetId: string, sheetName: string, connection?: GoogleConnection): Promise<string[]> => {
    try {
      if (!connection) {
        console.error('No connection provided for API access');
        return getFallbackHeaders(sheetName);
      }

      console.log('🔐 Attempting to fetch headers using enhanced API approach...');
      console.log('📄 Spreadsheet ID:', googleSheetId);
      console.log('📋 Sheet Name:', sheetName);
      
      // Method 1: Try backend service with service account authentication
      if (connection.clientEmail && connection.privateKey && connection.projectId) {
        console.log('🔐 Attempting backend service authentication for headers...');
        try {
          const backendService = createBackendSheetsService();
          
          // Check if backend is running
          const isBackendRunning = await backendService.checkHealth();
          if (!isBackendRunning) {
            console.warn('⚠️ Backend service is not running');
            throw new Error('Backend service is not available');
          }
          
          // Test access first
          const hasAccess = await backendService.testAccess(googleSheetId, connection);
          if (!hasAccess) {
            console.warn('⚠️ Backend access test failed, trying fallback methods');
            throw new Error('Backend access test failed');
          }

          // Fetch headers via backend
          const headers = await backendService.fetchSheetHeaders(googleSheetId, sheetName, connection, 'A1:ZZ1');
          console.log('✅ Successfully fetched headers using backend service:', headers);
          return headers;
          
        } catch (backendError: any) {
          console.log('⚠️ Backend service failed:', backendError.message);
          console.log('� Trying public API fallback...');
        }
      }

      // Method 2: Try public API with API key (works for public sheets)
      if (connection.apiKey) {
        console.log('🌐 Trying public API access for headers...');
        try {
          const headers = await fetchHeadersWithPublicAPI(googleSheetId, sheetName, connection.apiKey);
          if (headers.length > 0 && !headers.every(header => getFallbackHeaders(sheetName).includes(header))) {
            console.log('✅ Successfully fetched headers using public API:', headers);
            return headers;
          }
        } catch (publicApiError) {
          console.log('⚠️ Public API access failed for headers:', publicApiError);
        }
      }

      // Method 3: Use fallback headers
      console.log('🔄 Using fallback headers (API methods not available)');
      console.log('💡 For private sheets, consider implementing server-side authentication');
      return getFallbackHeaders(sheetName);
      
    } catch (error: any) {
      console.error('❌ Error in fetchSheetHeaders:', error);
      console.log('🔄 Falling back to default headers...');
      return getFallbackHeaders(sheetName);
    }
  };

  // Dynamic variable naming
  const generateVariableName = (connectionName: string, databaseName: string, tableName: string, headerName: string) => {
    const cleanName = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    return `${cleanName(connectionName)}_${cleanName(databaseName)}_${cleanName(tableName)}_${cleanName(headerName)}`;
  };

  // CRUD Operations
  const addTable = async () => {
    console.log('🔄 ADD TABLE CLICKED');
    console.log('📋 Table Name:', newTableName);
    console.log('📋 Sheet Name:', newTableSheetName);
    console.log('📋 Selected Database:', selectedDatabase);
    
    if (!selectedDatabase || !newTableName.trim() || !newTableSheetName.trim()) {
      console.error('❌ Missing required fields for adding table');
      return;
    }

    const currentConnection = await getCurrentConnection();
    const currentDatabase = await getCurrentDatabase();
    
    console.log('🔗 Current Connection:', currentConnection?.name);
    console.log('🗄️ Current Database:', currentDatabase?.name);
    
    if (!currentConnection || !currentDatabase) {
      console.error('❌ No connection or database selected');
      return;
    }

    const newTable: TableConnection = {
      id: generateId(),
      name: newTableName.trim(),
      sheetName: newTableSheetName.trim(),
      sheetId: generateId(),
      status: 'loading',
      headers: []
    };

    const currentTables = getCurrentTables();
    const tempTables = [...currentTables, newTable];
    setTables(tempTables);
    
    try {
      const headers = await fetchSheetHeaders(
        currentDatabase.googleSheetId, 
        newTableSheetName.trim(), 
        currentConnection
      );
      
      const finalTable = { 
        ...newTable, 
        status: 'connected' as const,
        totalHeaders: headers.length,
        headersConnected: 0,
        headers: headers.map((header, index) => ({
          id: generateId(),
          columnIndex: index,
          originalHeader: header,
          variableName: generateVariableName(
            currentConnection.name,
            currentDatabase.name,
            newTableName.trim(),
            header
          ),
          dataType: 'text' as const,
          isEnabled: true
        }))
      };

      // Save to Firebase
      await saveTable(selectedConnection, selectedDatabase, finalTable);

      // Update local state
      const finalTables = tempTables.map(table => 
        table.id === newTable.id ? finalTable : table
      );
      setTables(finalTables);
      
      console.log(`✅ Successfully connected to sheet "${newTableSheetName}" with ${headers.length} headers:`, headers);
      
    } catch (error) {
      console.error('❌ Failed to connect to sheet:', error);
      
      const errorTable = { 
        ...newTable, 
        status: 'error' as const,
        errorMessage: error instanceof Error ? error.message : 'Failed to connect to sheet'
      };

      // Save error state to Firebase
      await saveTable(selectedConnection, selectedDatabase, errorTable);

      // Update local state
      const errorTables = tempTables.map(table => 
        table.id === newTable.id ? errorTable : table
      );
      setTables(errorTables);
    }
    
    setNewTableName('');
    setNewTableSheetName('');
    setShowAddTable(false);
  };

  const deleteTable = async (tableId: string) => {
    try {
      // Delete from Firebase
      await deleteFirebaseTable(selectedConnection, selectedDatabase, tableId);

      // Update local state
      const currentTables = getCurrentTables();
      const updatedTables = currentTables.filter(table => table.id !== tableId);
      setTables(updatedTables);
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  const testTable = async (tableId: string) => {
    const currentTables = getCurrentTables();
    const table = currentTables.find(t => t.id === tableId);
    
    if (!table) return;

    // Set testing status
    const testingTable = { ...table, status: 'testing' as const };
    const testingTables = currentTables.map(t => 
      t.id === tableId ? testingTable : t
    );
    setTables(testingTables);

    try {
      Logger.debug('🧪 Testing table connection and fetching real headers...');
      Logger.debug('Table:', table.name);
      Logger.debug('Sheet Name:', table.sheetName);
      
      const currentConnection = await getCurrentConnection();
      const currentDatabase = await getCurrentDatabase();
      
      if (!currentConnection || !currentDatabase) {
        throw new Error('Missing connection or database data for testing');
      }

      Logger.debug('Using connection:', currentConnection.name);
      Logger.debug('Using database:', currentDatabase.name);
      Logger.debug('Google Sheet ID:', currentDatabase.googleSheetId);

      // Clear backend health cache to force fresh check
      sessionCache.clear('backend_health');
      
      let realHeaders: string[] = [];
      
      // Try backend service first
      const isBackendHealthy = await checkBackendHealth();
      
      if (isBackendHealthy && currentConnection.clientEmail && currentConnection.privateKey) {
        Logger.debug('Backend is healthy! Attempting backend service for table headers');
        try {
          const backendService = createBackendSheetsService();
          
          const hasAccess = await backendService.testAccess(currentDatabase.googleSheetId, currentConnection);
          if (hasAccess) {
            Logger.debug('Backend access test passed! Fetching real headers from sheet...');
            
            realHeaders = await backendService.fetchSheetHeaders(
              currentDatabase.googleSheetId, 
              table.sheetName, 
              currentConnection
            );
            
            if (realHeaders && realHeaders.length > 0) {
              Logger.success('✅ Successfully fetched REAL headers for table using backend service:', realHeaders.length);
              Logger.debug('Real headers:', realHeaders);
            } else {
              throw new Error('Backend service returned no headers');
            }
          } else {
            throw new Error('Backend access test failed');
          }
        } catch (backendError) {
          Logger.warn('Backend service failed for table headers:', backendError);
        }
      }
      
      // Try public API if backend failed and API key is available
      if (realHeaders.length === 0 && currentConnection.apiKey) {
        Logger.debug('Trying public API for table headers...');
        try {
          const { fetchHeadersWithPublicAPI } = await import('../../utils/authenticatedGoogleSheets');
          realHeaders = await fetchHeadersWithPublicAPI(
            currentDatabase.googleSheetId,
            table.sheetName,
            currentConnection.apiKey
          );
          
          if (realHeaders && realHeaders.length > 0) {
            Logger.success('✅ Successfully fetched REAL headers for table using public API:', realHeaders.length);
            Logger.debug('Real headers:', realHeaders);
          }
        } catch (apiError) {
          Logger.warn('Public API failed for table headers:', apiError);
        }
      }

      // Update table with real header count or error
      const updatedTable = { 
        ...table, 
        status: realHeaders.length > 0 ? 'connected' as const : 'error' as const,
        totalHeaders: realHeaders.length > 0 ? realHeaders.length : undefined,
        errorMessage: realHeaders.length === 0 ? 'Could not fetch real headers - using fallback data' : undefined
      };

      // Save to Firebase
      await saveTable(selectedConnection, selectedDatabase, updatedTable);

      // Update local state
      const updatedTables = currentTables.map(t => 
        t.id === tableId ? updatedTable : t
      );
      setTables(updatedTables);
      
      if (realHeaders.length > 0) {
        Logger.success(`✅ Table test successful! Found ${realHeaders.length} real columns in "${table.sheetName}"`);
      } else {
        Logger.warn(`⚠️ Table test completed but could not access real headers for "${table.sheetName}"`);
      }
      
    } catch (error) {
      Logger.error('Failed to test table:', error);
      
      const errorTable = { 
        ...table, 
        status: 'error' as const, 
        errorMessage: error instanceof Error ? error.message : 'Table test failed'
      };

      await saveTable(selectedConnection, selectedDatabase, errorTable);

      const errorTables = currentTables.map(t => 
        t.id === tableId ? errorTable : t
      );
      setTables(errorTables);
    }
  };

  // Get current tables for display
  const currentTables = getCurrentTables();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => setCurrentView('connections')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Connections</span>
        </button>
        <div className="text-gray-400">/</div>
        <button
          onClick={() => setCurrentView('databases')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {selectedConnectionData?.name || 'Unknown Connection'}
        </button>
        <div className="text-gray-400">/</div>
        <div className="text-white font-medium">
          {selectedDatabaseData?.name || 'Unknown Database'}
        </div>
      </div>

      {/* Level 3: Tables */}
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Tables (Sheets/Tabs)
            </h2>
            <button
              onClick={() => setShowAddTable(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
          </div>

          {currentTables.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Tables</h3>
              <p className="text-gray-400 mb-4">Add your first table from the Google Sheet</p>
              <button
                onClick={() => setShowAddTable(true)}
                className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Add Your First Table
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {currentTables.map((table) => (
                <div key={table.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-3 flex-1"
                      onClick={() => {
                        setSelectedTable(table.id);
                        setCurrentView('headers');
                      }}
                    >
                      {getStatusIcon(table.status)}
                      <div>
                        <div className="text-white font-medium hover:text-blue-400 transition-colors">{table.name}</div>
                        <div className="text-sm text-gray-400">
                          Sheet: {table.sheetName}
                        </div>
                        <div className={`text-sm ${getStatusColor(table.status)}`}>
                          {table.status.charAt(0).toUpperCase() + table.status.slice(1)} • 
                          {table.headersConnected || 0}/{table.totalHeaders || 0} headers mapped
                        </div>
                        {table.rowCount && (
                          <div className="text-xs text-gray-400">
                            {table.rowCount} rows
                          </div>
                        )}
                        {table.errorMessage && (
                          <div className="text-xs text-red-400 mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                            ⚠️ {table.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testTable(table.id);
                        }}
                        disabled={table.status === 'testing'}
                        className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Test table connection and fetch real column headers"
                      >
                        <TestTube className="w-3 h-3" />
                        <span>{table.status === 'testing' ? 'Testing...' : 'Test'}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete the table "${table.name}"? This action cannot be undone.`)) {
                            deleteTable(table.id);
                          }
                        }}
                        className="flex items-center space-x-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Add New Table</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Table Name"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              
              <select
                value={newTableSheetName}
                onChange={(e) => setNewTableSheetName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Sheet</option>
                {(() => {
                  const availableSheets = selectedDatabaseData?.availableSheetNames || [];
                  
                  console.log('🔍 DROPDOWN DEBUG:');
                  console.log('Selected Database:', selectedDatabaseData);
                  console.log('Available Sheets:', availableSheets);
                  console.log('Sheet Count:', availableSheets.length);
                  
                  if (availableSheets.length === 0) {
                    console.log('⚠️ NO SHEETS AVAILABLE! Database might not be properly connected.');
                  } else {
                    console.log('✅ SHEETS FOUND! First few names:', availableSheets.slice(0, 5));
                  }
                  
                  return availableSheets.map((sheetName) => (
                    <option key={sheetName} value={sheetName} className="bg-gray-800 text-white">
                      {sheetName}
                    </option>
                  ));
                })()}
              </select>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddTable(false)}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addTable}
                disabled={!newTableName.trim() || !newTableSheetName.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
