import React, { useState, useEffect } from 'react';
import logger from '../../utils/logger';
import { 
  Plus, 
  Trash2, 
  TestTube, 
  Shield, 
  Globe, 
  Edit, 
  CheckCircle, 
  XCircle, 
  RefreshCw 
} from 'lucide-react';

// Firebase imports
import { 
  saveConnection, 
  loadConnections, 
  deleteConnection as deleteFirebaseConnection,
  initializeFirebase 
} from '../../lib/firebase';

// Interfaces
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
}

interface ConnectionsManagerProps {
  setCurrentView: (view: 'connections' | 'databases' | 'tables' | 'headers') => void;
  setSelectedConnection: (connectionId: string) => void;
  activeTab: 'saudi' | 'egypt';
  setActiveTab: (tab: 'saudi' | 'egypt') => void;
}

export function ConnectionsManager({ setCurrentView, setSelectedConnection, activeTab, setActiveTab }: ConnectionsManagerProps) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  // Connection data
  const [saudiConnections, setSaudiConnections] = useState<GoogleConnection[]>([]);
  const [egyptConnections, setEgyptConnections] = useState<GoogleConnection[]>([]);

  // Modal states
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Form states
  const [newConnectionName, setNewConnectionName] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newPrivateKey, setNewPrivateKey] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);

  // Helper functions
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const getCurrentConnections = (): GoogleConnection[] => {
    return activeTab === 'saudi' ? saudiConnections : egyptConnections;
  };

  const setCurrentConnections = (connections: GoogleConnection[]) => {
    if (activeTab === 'saudi') {
      setSaudiConnections(connections);
    } else {
      setEgyptConnections(connections);
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

  // CRUD Operations
  const addConnection = async () => {
    if (!newConnectionName.trim() || !newProjectId.trim() || !newApiKey.trim()) return;

    const currentConnections = getCurrentConnections();
    
    // Generate meaningful ID based on region and connection name
    const sanitizedName = newConnectionName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const connectionId = editingConnectionId || `${activeTab === 'saudi' ? 'Saudi' : 'Egypt'}_${sanitizedName}`;

    setIsTesting(true);

    try {
      // Create connection object for testing
      const connectionToTest = {
        id: connectionId,
        name: newConnectionName.trim(),
        projectId: newProjectId.trim(),
        apiKey: newApiKey.trim(),
        privateKey: newPrivateKey.trim(),
        clientEmail: newClientEmail.trim(),
        clientId: newClientId.trim(),
        status: 'testing' as const,
        createdAt: editingConnectionId ? 
          currentConnections.find(c => c.id === editingConnectionId)?.createdAt || new Date() : 
          new Date()
      };

      // Update UI to show testing state
      if (editingConnectionId) {
        const testingConnections = currentConnections.map(conn => 
          conn.id === editingConnectionId ? connectionToTest : conn
        );
        setCurrentConnections(testingConnections);
      } else {
        setCurrentConnections([...currentConnections, connectionToTest]);
      }

      // Test the connection first
      const testResult = await testConnectionBeforeSave(connectionToTest);
      
      if (!testResult.success) {
        // Remove from UI or update with error status
        if (editingConnectionId) {
          const errorConnections = currentConnections.map(conn => 
            conn.id === editingConnectionId ? 
            { ...connectionToTest, status: 'error' as const, errorMessage: testResult.error } : 
            conn
          );
          setCurrentConnections(errorConnections);
        } else {
          // Remove the failed connection from the list
          setCurrentConnections(currentConnections);
        }
        
        // Show error to user
        alert(`Connection test failed: ${testResult.error}\n\nPlease fix the connection details before saving.`);
        return;
      }

      // If test successful, save to Firebase
      const finalConnection = {
        ...connectionToTest,
        status: 'connected' as const,
        lastTested: new Date(),
        errorMessage: undefined
      };

      // Save to Firebase
      await saveConnection(finalConnection, activeTab);

      // Update local state with successful connection
      if (editingConnectionId) {
        const updatedConnections = currentConnections.map(conn => 
          conn.id === editingConnectionId ? finalConnection : conn
        );
        setCurrentConnections(updatedConnections);
      } else {
        const updatedConnections = currentConnections.filter(conn => conn.id !== connectionId);
        setCurrentConnections([...updatedConnections, finalConnection]);
      }

      // Reset form only after successful save
      setNewConnectionName('');
      setNewProjectId('');
      setNewApiKey('');
      setNewPrivateKey('');
      setNewClientEmail('');
      setNewClientId('');
      setEditingConnectionId(null);
      setShowAddConnection(false);

    } catch (error) {
      console.error('❌ Failed to save connection:', error);
      
      // Remove failed connection from UI if it was a new one
      if (!editingConnectionId) {
        setCurrentConnections(currentConnections);
      }
      
      alert(`Failed to save connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      // Delete from Firebase
      await deleteFirebaseConnection(connectionId);

      // Update local state
      const currentConnections = getCurrentConnections();
      setCurrentConnections(currentConnections.filter(conn => conn.id !== connectionId));

    } catch (error) {
      console.error('❌ Failed to delete connection:', error);
      // You might want to show an error message to the user here
    }
  };

  const testConnectionBeforeSave = async (connection: GoogleConnection): Promise<{success: boolean, error?: string}> => {
    try {
      // Step 1: Verify API Key and credentials
      if (!connection.apiKey || connection.apiKey.trim() === '') {
        return { success: false, error: 'API Key is missing or empty' };
      }
      if (!connection.projectId || connection.projectId.trim() === '') {
        return { success: false, error: 'Project ID is missing or empty' };
      }
      
      // Basic API key format validation
      const apiKey = connection.apiKey.trim();
      if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
        return { success: false, error: 'API Key format appears invalid. Google API keys typically start with "AIza" and are longer than 30 characters.' };
      }
      
      // Step 2: Test API connectivity
      const publicSpreadsheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
      const apiTestUrl = `https://sheets.googleapis.com/v4/spreadsheets/${publicSpreadsheetId}?key=${connection.apiKey}`;
      
      let apiResponse;
      try {
        apiResponse = await fetch(apiTestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors'
        });
      } catch (fetchError) {
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          return { success: false, error: 'Network/CORS Error: Cannot verify API connectivity due to browser security restrictions. API key format appears valid.' };
        }
        throw fetchError;
      }
      
      // Step 3: Analyze response
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => null);
        
        let detailedError = '';
        switch (apiResponse.status) {
          case 401:
            detailedError = 'API Key is invalid or expired';
            break;
          case 403:
            if (errorData?.error?.message?.includes('API has not been used')) {
              detailedError = 'Google Sheets API is not enabled for this project. Enable it in Google Cloud Console.';
            } else if (errorData?.error?.message?.includes('quota')) {
              detailedError = 'API quota exceeded. Check your usage limits.';
            } else {
              detailedError = 'Permission denied - Check API key permissions.';
            }
            break;
          case 404:
            detailedError = 'Resource not found - Project ID may be invalid.';
            break;
          case 429:
            detailedError = 'Rate limit exceeded - Try again later.';
            break;
          default:
            detailedError = `API Error: ${apiResponse.status} ${apiResponse.statusText}`;
        }
        
        if (errorData?.error?.message) {
          detailedError += ` | ${errorData.error.message}`;
        }
        
        return { success: false, error: detailedError };
      }
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      return { success: false, error: errorMessage };
    }
  };

  const testConnectionRefresh = async (connectionId: string) => {
    const currentConnections = getCurrentConnections();
    const connection = currentConnections.find(conn => conn.id === connectionId);
    
    if (!connection) return;

    // Set connection to testing state
    const testingConnections = currentConnections.map(conn => 
      conn.id === connectionId 
        ? { ...conn, status: 'testing' as const }
        : conn
    );
    setCurrentConnections(testingConnections);

    try {
      // Step 1: Verify API Key and credentials
      if (!connection.apiKey || connection.apiKey.trim() === '') {
        throw new Error('API Key is missing or empty');
      }
      if (!connection.projectId || connection.projectId.trim() === '') {
        throw new Error('Project ID is missing or empty');
      }
      
      // Basic API key format validation
      const apiKey = connection.apiKey.trim();
      if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
        throw new Error('API Key format appears invalid. Google API keys typically start with "AIza" and are longer than 30 characters.');
      }
      
      // Step 2: Validate Google Project Settings & Check if Required APIs are Enabled
      
      // Use CORS-friendly approach with a valid public spreadsheet
      const publicSpreadsheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
      const apiTestUrl = `https://sheets.googleapis.com/v4/spreadsheets/${publicSpreadsheetId}?key=${connection.apiKey}`;
      
      let apiResponse;
      try {
        apiResponse = await fetch(apiTestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors'
        });
      } catch (fetchError) {
        // Handle CORS and network errors specifically
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          throw new Error('Network/CORS Error: Direct API validation failed. This is common in browser environments. API key format appears valid, but cannot verify connectivity due to browser security restrictions.');
        }
        throw fetchError;
      }
      
      
      // Step 3: Analyze response and provide detailed feedback
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => null);
        
        let detailedError = '';
        switch (apiResponse.status) {
          case 401:
            detailedError = 'Authentication failed - API Key is invalid or expired';
            break;
          case 403:
            if (errorData?.error?.message?.includes('API has not been used')) {
              detailedError = 'Google Sheets API is not enabled for this project. Enable it at: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview';
            } else if (errorData?.error?.message?.includes('quota')) {
              detailedError = 'API quota exceeded. Check your usage limits in Google Cloud Console';
            } else {
              detailedError = 'Permission denied - Check API key permissions or project access';
            }
            break;
          case 404:
            detailedError = 'Resource not found - Project ID may be invalid or API endpoint incorrect';
            break;
          case 429:
            detailedError = 'Rate limit exceeded - Too many requests. Try again later';
            break;
          default:
            detailedError = `API Error: ${apiResponse.status} ${apiResponse.statusText}`;
        }
        
        if (errorData?.error?.message) {
          detailedError += ` | Google says: ${errorData.error.message}`;
        }
        
        throw new Error(detailedError);
      }
      
      
      // Final Success
      const successConnections = currentConnections.map(conn => 
        conn.id === connectionId 
          ? { 
              ...conn, 
              status: 'connected' as const,
              lastTested: new Date(),
              errorMessage: undefined
            }
          : conn
      );
      setCurrentConnections(successConnections);
      
      
    } catch (error) {
      console.error('❌ COMPREHENSIVE TEST FAILED:', error);
      
      // Provide helpful suggestions based on error type
      let suggestion = '';
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      
      if (errorMessage.includes('Network/CORS Error') || errorMessage.includes('Failed to fetch')) {
        suggestion = '\n\n🔧 Browser Limitation: This is a browser security restriction (CORS policy).\n✅ Your API key format appears valid.\n💡 The connection will likely work in production or server environments.\n\n🧪 Alternative Test: Try using the API key directly in a tool like Postman or curl to verify functionality.';
      } else if (errorMessage.includes('API has not been used') || errorMessage.includes('not enabled')) {
        suggestion = '\n\n🔧 Solution: Enable Google Sheets API in your Google Cloud Console:\n1. Go to https://console.developers.google.com/apis/api/sheets.googleapis.com/overview\n2. Click "Enable" button\n3. Wait a few minutes and try again';
      } else if (errorMessage.includes('Authentication failed') || errorMessage.includes('invalid')) {
        suggestion = '\n\n🔧 Solution: Check your API key:\n1. Verify the API key is correct\n2. Ensure it has proper permissions\n3. Check if it has expired';
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        suggestion = '\n\n🔧 Solution: API usage limits reached:\n1. Check your quotas in Google Cloud Console\n2. Wait for quota reset\n3. Consider upgrading your plan';
      } else if (errorMessage.includes('Permission denied')) {
        suggestion = '\n\n🔧 Solution: Check permissions:\n1. Verify API key has Sheets API access\n2. Check project permissions\n3. Ensure service account has proper roles';
      }
      
      const errorConnections = currentConnections.map(conn => 
        conn.id === connectionId 
          ? { 
              ...conn, 
              status: 'error' as const,
              errorMessage: errorMessage + suggestion
            }
          : conn
      );
      setCurrentConnections(errorConnections);
    }
  };

  const updateApiKeyDirectly = (connectionId: string, newApiKey: string) => {
    const currentConnections = getCurrentConnections();
    const updatedConnections = currentConnections.map(conn => 
      conn.id === connectionId 
        ? { ...conn, apiKey: newApiKey }
        : conn
    );
    setCurrentConnections(updatedConnections);
  };

  // Load/Save configurations with Firebase
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Initialize Firebase
        await initializeFirebase();
        
        // Load connections from Firebase using operation grouping
        logger.operation('Loading All Connections', async () => {
          const saudiData = await loadConnections('saudi');
          const egyptData = await loadConnections('egypt');
          
          setSaudiConnections(saudiData);
          setEgyptConnections(egyptData);
          
          // Summary log instead of detailed logs (which are already in the firebase.ts file)
          logger.success(`Loaded ${saudiData.length + egyptData.length} total connections`);
        });
      } catch (error) {
        logger.error('Failed to load connections from Firebase', error);
        
        // Fallback to localStorage if Firebase fails
        logger.warn('Falling back to localStorage...');
        const savedSaudiConnections = localStorage.getItem('saudi_connections');
        const savedEgyptConnections = localStorage.getItem('egypt_connections');
        
        if (savedSaudiConnections) {
          const parsed = JSON.parse(savedSaudiConnections);
          setSaudiConnections(parsed.map((conn: any) => ({
            ...conn,
            databases: conn.databases || [],
            createdAt: new Date(conn.createdAt)
          })));
        }
        
        if (savedEgyptConnections) {
          const parsed = JSON.parse(savedEgyptConnections);
          setEgyptConnections(parsed.map((conn: any) => ({
            ...conn,
            databases: conn.databases || [],
            createdAt: new Date(conn.createdAt)
          })));
        }
      }

      // Check authentication
      const authCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('connection_auth='));
      
      if (authCookie && authCookie.split('=')[1] === '2026') {
        setIsAuthenticated(true);
      }
    };

    initializeData();
  }, []);

  // Keep localStorage as backup (optional)
  useEffect(() => {
    localStorage.setItem('saudi_connections', JSON.stringify(saudiConnections));
  }, [saudiConnections]);

  useEffect(() => {
    localStorage.setItem('egypt_connections', JSON.stringify(egyptConnections));
  }, [egyptConnections]);

  // Authentication
  const handleLogin = () => {
    if (password === '2026') {
      setIsAuthenticated(true);
      document.cookie = 'connection_auth=2026; path=/; max-age=86400';
    }
  };

  // Authentication check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="relative">
          <div className="glass rounded-2xl p-8 backdrop-blur-xl border border-white/10 w-96">
            <div className="text-center mb-6">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Connection Access</h1>
              <p className="text-gray-400">Enter password to access connection settings</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              
              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Access Connection Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentConnections = getCurrentConnections();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Connections Table */}
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Google Console Connections ({activeTab === 'saudi' ? 'Saudi' : 'Egypt'})
            </h2>
            <button
              onClick={() => setShowAddConnection(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Connection</span>
            </button>
          </div>

          {currentConnections.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Connections</h3>
              <p className="text-gray-400 mb-4">Add your first Google Cloud connection</p>
              <button
                onClick={() => setShowAddConnection(true)}
                className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Add Your First Connection
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-4 px-4 text-white font-semibold">Connection Name</th>
                    <th className="text-left py-4 px-4 text-white font-semibold">Project</th>
                    <th className="text-left py-4 px-4 text-white font-semibold">Status</th>
                    <th className="text-right py-4 px-4 text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentConnections.map((connection) => (
                    <tr 
                      key={connection.id} 
                      className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200 cursor-pointer"
                      onClick={() => {
                        setSelectedConnection(connection.id);
                      }}
                    >
                      {/* Connection Name */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white/10 rounded-lg">
                            {getStatusIcon(connection.status)}
                          </div>
                          <div>
                            <div className="text-white font-medium hover:text-blue-400 transition-colors">
                              {connection.name}
                            </div>
                            {connection.lastTested && (
                              <div className="text-xs text-gray-400 mt-1">
                                Last tested: {connection.lastTested.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Project */}
                      <td className="py-4 px-4">
                        <div className="text-gray-300">{connection.projectId}</div>
                      </td>
                      
                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${getStatusColor(connection.status)}`}>
                            {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                          </span>
                          {connection.errorMessage && (
                            <div className="text-xs text-red-400 mt-1 p-1 bg-red-500/10 rounded border border-red-500/20 max-w-xs">
                              ⚠️ {connection.errorMessage}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="py-4 px-4">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              testConnectionRefresh(connection.id);
                            }}
                            disabled={connection.status === 'testing'}
                            className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Test connection"
                          >
                            <TestTube className="w-3 h-3" />
                            <span>{connection.status === 'testing' ? 'Testing...' : 'Test'}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Set up edit mode
                              setNewConnectionName(connection.name);
                              setNewProjectId(connection.projectId);
                              setNewApiKey(connection.apiKey);
                              setNewPrivateKey(connection.privateKey || '');
                              setNewClientEmail(connection.clientEmail || '');
                              setNewClientId(connection.clientId || '');
                              setEditingConnectionId(connection.id);
                              setShowAddConnection(true);
                            }}
                            className="flex items-center space-x-1 bg-yellow-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-yellow-700 transition-colors"
                            title="Edit connection"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete the connection "${connection.name}"? This action cannot be undone.`)) {
                                deleteConnection(connection.id);
                              }
                            }}
                            className="flex items-center space-x-1 bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                            title="Delete connection"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Connection Modal */}
      {showAddConnection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingConnectionId ? 'Edit Connection' : 'Add New Connection'}
            </h3>
            
            <div className="space-y-4">
              <input
                type="text"
                value={newConnectionName}
                onChange={(e) => setNewConnectionName(e.target.value)}
                placeholder="Connection Name"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              
              <input
                type="text"
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                placeholder="Project ID"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              
              <input
                type="text"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="API Key"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              
              <textarea
                value={newPrivateKey}
                onChange={(e) => setNewPrivateKey(e.target.value)}
                placeholder="Private Key"
                rows={3}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              
              <input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="Client Email"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              
              <input
                type="text"
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
                placeholder="Client ID"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddConnection(false);
                  setEditingConnectionId(null);
                  setNewConnectionName('');
                  setNewProjectId('');
                  setNewApiKey('');
                  setNewPrivateKey('');
                  setNewClientEmail('');
                  setNewClientId('');
                  setIsTesting(false);
                }}
                disabled={isTesting}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={addConnection}
                disabled={!newConnectionName.trim() || !newProjectId.trim() || !newApiKey.trim() || isTesting}
                className="flex-1 bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Testing & Saving...</span>
                  </div>
                ) : (
                  editingConnectionId ? 'Update Connection' : 'Add Connection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
