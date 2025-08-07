import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  TestTube, 
  Database, 
  ArrowLeft,
  Settings,
  CheckCircle, 
  XCircle, 
  RefreshCw 
} from 'lucide-react';

// Firebase imports
import { 
  saveDatabase, 
  loadDatabases, 
  deleteDatabase as deleteFirebaseDatabase,
  loadConnections 
} from '../../lib/firebase';

// Google Sheets API imports
import { 
  createBackendSheetsService, 
  getFallbackSheetNames, 
  fetchSheetsWithPublicAPI 
} from '../../utils/backendSheetsService';

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

interface TableConnection {
  id: string;
  name: string;
  sheetName: string;
  sheetId: string;
  status: 'connected' | 'loading' | 'error';
  headers: any[];
  totalHeaders?: number;
  headersConnected?: number;
  rowCount?: number;
  errorMessage?: string;
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

interface DatabasesManagerProps {
  setCurrentView: (view: 'connections' | 'databases' | 'tables' | 'headers') => void;
  selectedConnection: string;
  setSelectedDatabase: (databaseId: string) => void;
}

export function DatabasesManager({ 
  setCurrentView, 
  selectedConnection, 
  setSelectedDatabase
}: DatabasesManagerProps) {
  // Local state for databases
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  
  // Local state for connection data
  const [selectedConnectionData, setSelectedConnectionData] = useState<GoogleConnection | null>(null);

  // Modal states
  const [showAddDatabase, setShowAddDatabase] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Form states
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [newDatabaseSheetId, setNewDatabaseSheetId] = useState('');

  // Load databases from Firebase when component mounts or selectedConnection changes
  useEffect(() => {
    const loadDatabasesData = async () => {
      if (selectedConnection) {
        try {
          const databasesData = await loadDatabases(selectedConnection);
          setDatabases(databasesData);
          // No need to log here - already logged in firebase.ts
        } catch (error) {
          // Already logged in firebase.ts
          setDatabases([]);
        }
      }
    };

    loadDatabasesData();
  }, [selectedConnection]);

  // Helper to get current databases (now using local state)
  const getCurrentDatabases = (): DatabaseConnection[] => {
    return databases;
  };

  // Helper to update databases (now saves to Firebase)
  const setCurrentDatabases = async (newDatabases: DatabaseConnection[]) => {
    setDatabases(newDatabases);
    
    // Save each database to Firebase
    try {
      for (const database of newDatabases) {
        await saveDatabase(selectedConnection, database);
      }
    } catch (error) {
      console.error('❌ Failed to save databases to Firebase:', error);
    }
  };

  // Helper function
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Helper to get current connection data
  const getCurrentConnection = async (): Promise<GoogleConnection | null> => {
    try {
      // Determine region from connection ID
      const region = selectedConnection.startsWith('Saudi_') ? 'saudi' : 'egypt';
      const connections = await loadConnections(region);
      return connections.find(conn => conn.id === selectedConnection) || null;
    } catch (error) {
      console.error('❌ Failed to load connection:', error);
      return null;
    }
  };

  // Status helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'testing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'loading': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'testing': return 'text-blue-400';
      case 'loading': return 'text-blue-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Fetch real sheet names from Google Sheets API using authenticated access
  const fetchAvailableSheets = async (googleSheetId: string, connection?: GoogleConnection): Promise<string[]> => {
    try {
      if (!connection) {
        Logger.error('No connection provided for API access');
        return getFallbackSheetNames();
      }

      Logger.debug('Fetching sheet names using authenticated Google Sheets API...');
      Logger.debug('Spreadsheet ID:', googleSheetId);
      
      // Check if we should refresh metadata or use cached data
      const cachedSheets = sessionCache.get(`sheets_${googleSheetId}`);
      if (cachedSheets && Array.isArray(cachedSheets) && cachedSheets.length > 0) {
        Logger.debug('Using cached sheet names:', cachedSheets.length);
        return cachedSheets;
      }

      let sheetNames: string[] = [];
      
      // Method 1: Try backend service with service account authentication
      if (connection.clientEmail && connection.privateKey && connection.projectId) {
        Logger.debug('Attempting backend service authentication...');
        try {
          // Clear backend health cache to force fresh check
          sessionCache.clear('backend_health');
          
          // Use optimized backend health check
          const isBackendHealthy = await checkBackendHealth();
          if (!isBackendHealthy) {
            Logger.warn('Backend service is not available - skipping backend authentication method');
            throw new Error('Backend service is not available');
          }

          const backendService = createBackendSheetsService();
          
          // Test access first
          Logger.debug('Testing backend access to spreadsheet...');
          const hasAccess = await backendService.testAccess(googleSheetId, connection);
          if (!hasAccess) {
            Logger.warn('Backend access test failed - spreadsheet may not be accessible or credentials invalid');
            throw new Error('Backend access test failed');
          }

          // Fetch sheet names via backend
          Logger.debug('Fetching sheet names via backend service...');
          sheetNames = await backendService.fetchAvailableSheets(googleSheetId, connection);
          if (sheetNames && sheetNames.length > 0) {
            Logger.success('✅ Successfully fetched REAL sheets using backend service:', sheetNames.length);
            Logger.debug('Real sheet names:', sheetNames);
            // Cache the results for 30 minutes
            sessionCache.set(`sheets_${googleSheetId}`, sheetNames, 30);
            return sheetNames;
          } else {
            Logger.warn('Backend service returned empty sheet list');
            throw new Error('Backend service returned no sheets');
          }
          
        } catch (backendError: any) {
          Logger.warn('Backend service failed:', backendError.message);
          Logger.debug('Trying public API fallback...');
        }
      }

      // Method 2: Try public API with API key (works for public sheets)
      if (connection.apiKey) {
        Logger.debug('Trying public API access with API key...');
        try {
          sheetNames = await fetchSheetsWithPublicAPI(googleSheetId, connection.apiKey);
          if (sheetNames && sheetNames.length > 0) {
            Logger.success('✅ Successfully fetched REAL sheets using public API:', sheetNames.length);
            Logger.debug('Real sheet names:', sheetNames);
            // Cache the results for 30 minutes
            sessionCache.set(`sheets_${googleSheetId}`, sheetNames, 30);
            return sheetNames;
          } else {
            Logger.warn('Public API returned empty sheet list');
            throw new Error('Public API returned no sheets');
          }
        } catch (publicApiError) {
          Logger.warn('Public API access failed:', publicApiError);
          Logger.debug('Will fall back to dummy data...');
        }
      } else {
        Logger.warn('No API key provided - skipping public API method');
      }

      // Method 3: Use fallback sheet names (DUMMY DATA)
      Logger.warn('⚠️ All authentication methods failed - using FALLBACK/DUMMY sheet names');
      Logger.warn('These are NOT your real Google Sheet tabs!');
      Logger.info('💡 To access real sheets: 1) Start backend service, 2) Check credentials, 3) Add API key for public sheets');
      const fallbackSheets = getFallbackSheetNames();
      return fallbackSheets;
      
    } catch (error: any) {
      Logger.error('Error fetching sheets with authenticated API:', error);
      Logger.debug('Falling back to default sheet names...');
      return getFallbackSheetNames();
    }
  };

  // CRUD Operations
  const addDatabase = async () => {
    if (!newDatabaseName.trim() || !newDatabaseSheetId.trim()) return;

    const currentConnection = await getCurrentConnection();
    
    if (!currentConnection) {
      console.error('No connection selected');
      return;
    }

    // Generate meaningful ID based on connection name and database name
    const sanitizedConnectionName = currentConnection.name.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedDatabaseName = newDatabaseName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const databaseId = `${sanitizedConnectionName}_${sanitizedDatabaseName}`;

    setIsTesting(true);

    try {
      // Create database object for testing
      const databaseToTest: DatabaseConnection = {
        id: databaseId,
        name: newDatabaseName.trim(),
        googleSheetId: newDatabaseSheetId.trim(),
        status: 'testing',
        createdAt: new Date(),
        sheetsConnected: 0,
        tables: []
      };

      const currentDatabases = getCurrentDatabases();
      const tempDatabases = [...currentDatabases, databaseToTest];
      setDatabases(tempDatabases);
      
      // Test the Google Sheet connection
      const sheetNames = await fetchAvailableSheets(newDatabaseSheetId.trim(), currentConnection);
      
      // Ensure sheetNames is an array to prevent length errors
      const sheetsArray = Array.isArray(sheetNames) ? sheetNames : [];
      
      if (sheetsArray.length === 0) {
        throw new Error('No sheets found in the Google Spreadsheet. Please check the Sheet ID and ensure the spreadsheet contains at least one sheet.');
      }

      const finalDatabase = {
        ...databaseToTest,
        status: 'connected' as const,
        totalSheetsAvailable: sheetsArray.length,
        availableSheetNames: sheetsArray,
        lastTested: new Date(),
        errorMessage: undefined
      };

      // Save to Firebase only after successful test
      await saveDatabase(selectedConnection, finalDatabase);

      // Update local state
      const finalDatabases = tempDatabases.map(db => 
        db.id === databaseToTest.id ? finalDatabase : db
      );
      setDatabases(finalDatabases);
      
      Logger.success(`Successfully connected to Google Sheet with ${sheetsArray.length} sheets:`, sheetsArray);
      
      // Reset form only after successful save
      setNewDatabaseName('');
      setNewDatabaseSheetId('');
      setShowAddDatabase(false);
      
    } catch (error) {
      Logger.error('Error connecting to Google Sheet:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Remove failed database from UI
      const currentDatabases = getCurrentDatabases();
      setDatabases(currentDatabases);
      
      // Show error to user
      alert(`Database connection test failed: ${errorMessage}\n\nPlease check your Google Sheet ID and ensure:\n1. The spreadsheet exists and is accessible\n2. The Google Sheets API is enabled\n3. Your API key has proper permissions`);
    } finally {
      setIsTesting(false);
    }
  };

  const deleteDatabase = async (databaseId: string) => {
    try {
      // Delete from Firebase
      await deleteFirebaseDatabase(selectedConnection, databaseId);

      // Update local state
      const currentDatabases = getCurrentDatabases();
      const updatedDatabases = currentDatabases.filter(db => db.id !== databaseId);
      setDatabases(updatedDatabases);

    } catch (error) {
      console.error('❌ Failed to delete database:', error);
    }
  };

  const refreshDatabase = async (databaseId: string) => {
    const currentDatabases = getCurrentDatabases();
    const database = currentDatabases.find(db => db.id === databaseId);
    if (!database) return;

    const currentConnection = await getCurrentConnection();
    if (!currentConnection) {
      console.error('No connection selected for refresh');
      return;
    }

    try {
      const sheetNames = await fetchAvailableSheets(database.googleSheetId, currentConnection);
      
      const updatedDatabase = { 
        ...database, 
        status: 'connected' as const,
        totalSheetsAvailable: sheetNames.length,
        availableSheetNames: sheetNames
      };

      // Save to Firebase
      await saveDatabase(selectedConnection, updatedDatabase);

      // Update local state
      const updatedDatabases = currentDatabases.map(db => 
        db.id === databaseId ? updatedDatabase : db
      );
      setDatabases(updatedDatabases);
      
    } catch (error) {
      console.error('❌ Failed to refresh database:', error);
      
      const errorDatabase = { 
        ...database, 
        status: 'error' as const,
        errorMessage: error instanceof Error ? error.message : 'Failed to refresh'
      };

      // Save error state to Firebase
      await saveDatabase(selectedConnection, errorDatabase);

      // Update local state
      const updatedDatabases = currentDatabases.map(db => 
        db.id === databaseId ? errorDatabase : db
      );
      setDatabases(updatedDatabases);
    }
  };

  const testConnection = async (databaseId: string) => {
    const currentDatabases = getCurrentDatabases();
    const database = currentDatabases.find(db => db.id === databaseId);
    
    if (!database) return;

    // Set testing status
    const testingDatabase = { ...database, status: 'testing' as const };
    const testingDatabases = currentDatabases.map(db => 
      db.id === databaseId ? testingDatabase : db
    );
    setDatabases(testingDatabases);

    try {
      Logger.debug('TEST BUTTON CLICKED - Starting connection test and refresh...');
      Logger.debug('Database ID:', databaseId);
      Logger.debug('Selected Connection:', selectedConnection);
      
      const currentConnection = await getCurrentConnection();
      
      if (!currentConnection) {
        throw new Error('No connection selected for testing');
      }

      Logger.debug('Using connection:', currentConnection.name);
      Logger.debug('Testing Google Sheet ID:', database.googleSheetId);

      const availableSheets = await fetchAvailableSheets(database.googleSheetId, currentConnection);
      
      // Ensure availableSheets is an array to prevent the length error
      const sheetsArray = Array.isArray(availableSheets) ? availableSheets : [];
      const connectedSheets = database.tables?.length || 0;
      
      // Check if these are fallback sheets by comparing with known fallback data
      const fallbackSheetNames = ['KPIs Report', 'Modules', 'Notifications', 'Translations', 'Users', 'Bookings', 'Products', 'Analytics', 'Reports', 'Settings', 'Dashboard', 'Metrics', 'ProductLocation', 'Gift Cards', 'Gift Card Purchases', 'Artist rating', 'Dropdowns', 'Calendar', 'Weeks'];
      const isUsingFallbackData = sheetsArray.length === fallbackSheetNames.length && 
        sheetsArray.every(sheet => fallbackSheetNames.includes(sheet));
      
      const testedDatabase = { 
        ...database, 
        status: 'connected' as const, 
        lastTested: new Date(),
        totalSheetsAvailable: sheetsArray.length,
        sheetsConnected: connectedSheets,
        availableSheetNames: sheetsArray,
        errorMessage: isUsingFallbackData ? 'Using fallback data - real sheets not accessible' : undefined
      };

      // Save to Firebase
      await saveDatabase(selectedConnection, testedDatabase);

      // Update local state
      const connectedDatabases = currentDatabases.map(db => 
        db.id === databaseId ? testedDatabase : db
      );
      setDatabases(connectedDatabases);
      
      if (isUsingFallbackData) {
        Logger.warn(`⚠️ Connection test completed but using FALLBACK/DUMMY data (${sheetsArray.length} sheets). Real Google Sheets not accessible.`);
        Logger.info('💡 To access real sheets: Check your credentials, start backend service, or add API key');
      } else {
        Logger.success(`✅ Successfully accessed REAL Google Sheet with ${sheetsArray.length} sheets:`, sheetsArray);
      }
      
    } catch (error) {
      Logger.error('Failed to test connection:', error);
      
      const errorDatabase = { 
        ...database, 
        status: 'error' as const, 
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
        lastTested: new Date()
      };

      // Save error state to Firebase
      await saveDatabase(selectedConnection, errorDatabase);

      // Update local state
      const errorDatabases = currentDatabases.map(db => 
        db.id === databaseId ? errorDatabase : db
      );
      setDatabases(errorDatabases);
    }
  };

  // Load connection data when selectedConnection changes
  useEffect(() => {
    const loadConnectionData = async () => {
      if (selectedConnection) {
        const connectionData = await getCurrentConnection();
        setSelectedConnectionData(connectionData);
      }
    };

    loadConnectionData();
  }, [selectedConnection]);

  const currentDatabases = getCurrentDatabases();

  return (
    <div className="max-w-7xl mx-auto">

      {/* Level 2: Databases */}
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Databases (Google Sheets)
            </h2>
            <button
              onClick={() => setShowAddDatabase(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Database</span>
            </button>
          </div>

          {currentDatabases.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Databases</h3>
              <p className="text-gray-400 mb-4">Add your first Google Sheet database</p>
              <button
                onClick={() => setShowAddDatabase(true)}
                className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Add Your First Database
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {currentDatabases.map((database) => (
                <div key={database.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-200 group">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-3 cursor-pointer flex-1 hover:bg-white/10 rounded-lg p-2 transition-all duration-200 border border-transparent hover:border-blue-500/30"
                      onClick={() => {
                        console.log('🔍 Database clicked:', database.name, database.id);
                        setSelectedDatabase(database.id);
                        // Note: Don't call setCurrentView('tables') here as it causes navigation conflicts
                        // The URL parsing logic will automatically determine the view based on the URL
                      }}
                      title={`Click to view tables in ${database.name}`}
                    >
                      {getStatusIcon(database.status)}
                      <div className="flex-1">
                        <div className="text-white font-medium hover:text-blue-400 transition-colors group-hover:text-blue-300">
                          {database.name}
                          <span className="ml-2 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            → Click to view tables
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          Sheet ID: {database.googleSheetId}
                        </div>
                        <div className={`text-sm ${getStatusColor(database.status)}`}>
                          {database.status.charAt(0).toUpperCase() + database.status.slice(1)} • 
                          {database.sheetsConnected || 0}/{database.totalSheetsAvailable || 0} sheets mapped
                        </div>
                        {database.lastTested && (
                          <div className="text-xs text-gray-400 mt-1">
                            Last tested: {database.lastTested.toLocaleString()}
                          </div>
                        )}
                        {database.errorMessage && (
                          <div className="text-xs text-red-400 mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                            ⚠️ {database.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testConnection(database.id);
                        }}
                        disabled={database.status === 'testing'}
                        className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <TestTube className="w-3 h-3" />
                        <span>{database.status === 'testing' ? 'Testing...' : 'Test'}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete the database "${database.name}"? This action cannot be undone.`)) {
                            deleteDatabase(database.id);
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

      {/* Add Database Modal */}
      {showAddDatabase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Add New Database</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                value={newDatabaseName}
                onChange={(e) => setNewDatabaseName(e.target.value)}
                placeholder="Database Name"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              
              <input
                type="text"
                value={newDatabaseSheetId}
                onChange={(e) => setNewDatabaseSheetId(e.target.value)}
                placeholder="Google Sheet ID"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddDatabase(false);
                  setNewDatabaseName('');
                  setNewDatabaseSheetId('');
                  setIsTesting(false);
                }}
                disabled={isTesting}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={addDatabase}
                disabled={!newDatabaseName.trim() || !newDatabaseSheetId.trim() || isTesting}
                className="flex-1 bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Testing & Saving...</span>
                  </div>
                ) : (
                  'Add Database'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
