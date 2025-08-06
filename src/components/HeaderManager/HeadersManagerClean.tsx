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
  serviceAccountEmail: string;
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  authUri: string;
  tokenUri: string;
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

  // Header update functions
  const updateHeaderMapping = (headerId: string, field: keyof HeaderMapping, value: any) => {
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
            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg transition-colors"
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
          {selectedTableData.name} - Headers
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Header Mapping - {selectedTableData.name}
          </h1>
          <p className="text-gray-400">Configure variable names and data types for your sheet headers</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-yellow-400 text-sm">Unsaved changes</span>
            </div>
          )}
          <button
            onClick={resetChanges}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={saveChanges}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Table Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Table Information</h3>
          <div className="space-y-3">
            <div>
              <div className="text-gray-400 text-sm">Table Name</div>
              <div className="text-white font-medium">{selectedTableData.name}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Sheet Name</div>
              <div className="text-white font-medium">{selectedTableData.sheetName}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Status</div>
              <div className="flex items-center space-x-2">
                {selectedTableData.status === 'connected' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-white capitalize">{selectedTableData.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Headers List */}
      <div className="bg-white/5 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-6">Header Mappings</h3>
        
        {editingHeaders.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Headers Found</h3>
            <p className="text-gray-400">
              This table doesn't have any headers configured yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {editingHeaders.map((header) => (
              <div key={header.id} className="bg-white/5 rounded-lg p-4">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                  {/* Column Index */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Column</label>
                    <div className="text-white font-medium">{header.columnIndex + 1}</div>
                  </div>

                  {/* Original Header */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Original Header</label>
                    <input
                      type="text"
                      value={header.originalHeader}
                      onChange={(e) => {
                        updateHeaderMapping(header.id, 'originalHeader', e.target.value);
                        autoGenerateVariableName(header.id, e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Variable Name */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Variable Name</label>
                    <input
                      type="text"
                      value={header.variableName}
                      onChange={(e) => updateHeaderMapping(header.id, 'variableName', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    />
                  </div>

                  {/* Data Type */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Data Type</label>
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
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Enabled</label>
                    <button
                      onClick={() => updateHeaderMapping(header.id, 'isEnabled', !header.isEnabled)}
                      className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                        header.isEnabled 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-600 hover:bg-gray-700 text-gray-400'
                      }`}
                    >
                      {header.isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Total Headers</div>
          <div className="text-white font-medium">{editingHeaders.length}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Enabled Headers</div>
          <div className="text-white font-medium">{editingHeaders.filter(h => h.isEnabled).length}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Disabled Headers</div>
          <div className="text-white font-medium">{editingHeaders.filter(h => !h.isEnabled).length}</div>
        </div>
      </div>

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
