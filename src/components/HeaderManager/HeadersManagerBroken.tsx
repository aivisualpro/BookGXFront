import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Settings,
  CheckCircle, 
  XCircle, 
  Save,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

// Firebase imports
import { 
  saveHeaders, 
  loadHeaders,
  loadConnections,
  loadDatabases,
  loadTables
} from '../../lib/firebase';

// Interfaces
interface HeaderMapping {
  id: string;
  columnIndex: number;
  originalHeader: string;
  variableName: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  isEnabled: boolean;
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

interface HeadersManagerProps {
  setCurrentView: (view: 'connections' | 'databases' | 'tables' | 'headers') => void;
  selectedConnection: string;
  selectedDatabase: string;
  selectedTable: string;
  activeTab: 'saudi' | 'egypt';
}

export function HeadersManager({ 
  setCurrentView, 
  selectedConnection, 
  selectedDatabase, 
  selectedTable, 
  activeTab 
}: HeadersManagerProps) {
  // State management
  const [headers, setHeaders] = useState<HeaderMapping[]>([]);
  const [selectedConnectionData, setSelectedConnectionData] = useState<GoogleConnection | null>(null);
  const [selectedDatabaseData, setSelectedDatabaseData] = useState<DatabaseConnection | null>(null);
  const [selectedTableData, setSelectedTableData] = useState<TableConnection | null>(null);

  // Local state for editing headers
  const [editingHeaders, setEditingHeaders] = useState<HeaderMapping[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      if (selectedConnection && selectedDatabase && selectedTable) {
        try {
          // Load headers from Firebase
          const headersData = await loadHeaders(selectedConnection, selectedDatabase, selectedTable);
          setHeaders(headersData);
          setEditingHeaders(headersData);

          // Load connection, database, and table data
          const connectionData = await getCurrentConnection();
          const databaseData = await getCurrentDatabase();
          const tableData = await getCurrentTable();
          setSelectedConnectionData(connectionData);
          setSelectedDatabaseData(databaseData);
          setSelectedTableData(tableData);
        } catch (error) {
          console.error('Error loading headers data:', error);
          setHeaders([]);
        }
      }
    };

    loadData();
  }, [selectedConnection, selectedDatabase, selectedTable, activeTab]);

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

  // Helper to get current table from Firebase
  const getCurrentTable = async (): Promise<TableConnection | null> => {
    try {
      const tables = await loadTables(selectedConnection, selectedDatabase);
      return tables.find(table => table.id === selectedTable) || null;
    } catch (error) {
      console.error('Error loading table:', error);
      return null;
    }
  };
        return null;
    }
  };

  // Header update functions
  const updateHeaderMapping = (headerId: string, field: keyof HeaderMapping, value: any) => {

  // Helper to save connections
  const saveConnections = (connections: GoogleConnection[]) => {
    const storageKey = activeTab === 'saudi' ? 'saudi_connections' : 'egypt_connections';
    localStorage.setItem(storageKey, JSON.stringify(connections));
  };

  // Helper to get current databases
  const getCurrentDatabases = (): DatabaseConnection[] => {
    const connections = getStoredConnections();
    const connection = connections.find(conn => conn.id === selectedConnection);
    return connection?.databases || [];
  };

  // Helper to get current tables
  const getCurrentTables = (): TableConnection[] => {
    const databases = getCurrentDatabases();
    const database = databases.find(db => db.id === selectedDatabase);
    return database?.tables || [];
  };

  // Helper to get current table
  const getCurrentTable = (): TableConnection | undefined => {
    const tables = getCurrentTables();
    return tables.find(table => table.id === selectedTable);
  };

  // Helper to update table headers
  const updateTableHeaders = (headers: HeaderMapping[]) => {
    const connections = getStoredConnections();
    const updatedConnections = connections.map(conn => 
      conn.id === selectedConnection 
        ? {
            ...conn,
            databases: (conn.databases || []).map(db =>
              db.id === selectedDatabase
                ? {
                    ...db,
                    tables: (db.tables || []).map(table =>
                      table.id === selectedTable
                        ? { 
                            ...table, 
                            headers,
                            headersConnected: headers.filter(h => h.isEnabled).length
                          }
                        : table
                    )
                  }
                : db
            )
          }
        : conn
    );
    saveConnections(updatedConnections);
  };

  // Initialize editing headers when component loads
  React.useEffect(() => {
    const currentTable = getCurrentTable();
    if (currentTable && editingHeaders.length === 0) {
      setEditingHeaders([...currentTable.headers]);
    }
  }, [selectedTable]);

  // Handle header changes
  const updateHeader = (headerId: string, field: keyof HeaderMapping, value: any) => {
    const updatedHeaders = editingHeaders.map(header =>
      header.id === headerId
        ? { ...header, [field]: value }
        : header
    );
    setEditingHeaders(updatedHeaders);
    setHasUnsavedChanges(true);
  };

  // Save changes
  const saveChanges = async () => {
    try {
      // Save headers to Firebase
      await saveHeaders(selectedConnection, selectedDatabase, selectedTable, editingHeaders);
      
      // Update local state
      setHeaders(editingHeaders);
      setHasUnsavedChanges(false);
      console.log('✅ Header mappings saved successfully');
    } catch (error) {
      console.error('Error saving headers:', error);
    }
  };

  // Reset changes
  const resetChanges = () => {
    setEditingHeaders([...headers]);
    setHasUnsavedChanges(false);
  };

  // Generate variable name based on header
  const generateVariableName = (connectionName: string, databaseName: string, tableName: string, headerName: string) => {
    const cleanName = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    return `${cleanName(connectionName)}_${cleanName(databaseName)}_${cleanName(tableName)}_${cleanName(headerName)}`;
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

  if (!selectedTableData) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Table Not Found</h3>
          <p className="text-gray-400 mb-4">The selected table could not be found.</p>
          <button
            onClick={() => setCurrentView('tables')}
            className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
          >
            Back to Tables
          </button>
        </div>
      </div>
    );
  }

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
        <button
          onClick={() => setCurrentView('tables')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {selectedDatabaseData?.name || 'Unknown Database'}
        </button>
        <div className="text-gray-400">/</div>
        <div className="text-white font-medium">
          {currentTable.name} - Headers
        </div>
      </div>

      {/* Header Management */}
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Header Mapping - {currentTable.name}
              </h2>
              <p className="text-gray-400 mt-1">
                Configure how sheet columns map to your application variables
              </p>
            </div>
            <div className="flex space-x-3">
              {hasUnsavedChanges && (
                <>
                  <button
                    onClick={resetChanges}
                    className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                  <button
                    onClick={saveChanges}
                    className="flex items-center space-x-2 bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table Info */}
          <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400">Table Name</div>
                <div className="text-white font-medium">{currentTable.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Sheet Name</div>
                <div className="text-white font-medium">{currentTable.sheetName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Status</div>
                <div className="flex items-center space-x-2">
                  {currentTable.status === 'connected' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-white capitalize">{currentTable.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Headers Table */}
          {editingHeaders.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Headers Found</h3>
              <p className="text-gray-400 mb-4">This table doesn't have any headers configured yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-4 px-4 text-white font-semibold">Enabled</th>
                    <th className="text-left py-4 px-4 text-white font-semibold">Column Index</th>
                    <th className="text-left py-4 px-4 text-white font-semibold">Original Header</th>
                    <th className="text-left py-4 px-4 text-white font-semibold">Variable Name</th>
                    <th className="text-left py-4 px-4 text-white font-semibold">Data Type</th>
                  </tr>
                </thead>
                <tbody>
                  {editingHeaders.map((header) => (
                    <tr 
                      key={header.id} 
                      className={`border-b border-white/10 transition-colors duration-200 ${
                        header.isEnabled ? 'hover:bg-white/5' : 'opacity-50'
                      }`}
                    >
                      {/* Enabled Toggle */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => updateHeader(header.id, 'isEnabled', !header.isEnabled)}
                          className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
                            header.isEnabled 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {header.isEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{header.isEnabled ? 'Enabled' : 'Disabled'}</span>
                        </button>
                      </td>
                      
                      {/* Column Index */}
                      <td className="py-4 px-4">
                        <div className="text-gray-300 font-mono">
                          {String.fromCharCode(65 + header.columnIndex)} ({header.columnIndex + 1})
                        </div>
                      </td>
                      
                      {/* Original Header */}
                      <td className="py-4 px-4">
                        <input
                          type="text"
                          value={header.originalHeader}
                          onChange={(e) => {
                            updateHeader(header.id, 'originalHeader', e.target.value);
                            autoGenerateVariableName(header.id, e.target.value);
                          }}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={!header.isEnabled}
                        />
                      </td>
                      
                      {/* Variable Name */}
                      <td className="py-4 px-4">
                        <input
                          type="text"
                          value={header.variableName}
                          onChange={(e) => updateHeader(header.id, 'variableName', e.target.value)}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                          disabled={!header.isEnabled}
                        />
                      </td>
                      
                      {/* Data Type */}
                      <td className="py-4 px-4">
                        <select
                          value={header.dataType}
                          onChange={(e) => updateHeader(header.id, 'dataType', e.target.value as any)}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={!header.isEnabled}
                        >
                          <option value="text" className="bg-gray-800">Text</option>
                          <option value="number" className="bg-gray-800">Number</option>
                          <option value="date" className="bg-gray-800">Date</option>
                          <option value="boolean" className="bg-gray-800">Boolean</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400">Total Headers</div>
                <div className="text-white font-medium">{editingHeaders.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Enabled Headers</div>
                <div className="text-white font-medium">{editingHeaders.filter(h => h.isEnabled).length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Disabled Headers</div>
                <div className="text-white font-medium">{editingHeaders.filter(h => !h.isEnabled).length}</div>
              </div>
            </div>
          </div>

          {/* Unsaved Changes Warning */}
          {hasUnsavedChanges && (
            <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium">You have unsaved changes</span>
              </div>
              <p className="text-yellow-300 mt-1 text-sm">
                Don't forget to save your header mappings before navigating away.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
