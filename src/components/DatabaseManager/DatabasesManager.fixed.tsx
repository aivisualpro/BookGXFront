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
import logger from '../../utils/logger';

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

interface DatabasesManagerProps {
  setCurrentView: (view: string) => void;
  selectedConnection: string;
  setSelectedDatabase: (databaseId: string) => void;
  activeTab: 'saudi' | 'egypt';
}

export default function DatabasesManager({ setCurrentView, selectedConnection, setSelectedDatabase, activeTab }: DatabasesManagerProps) {
  // State for databases
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);

  // Modal states
  const [showAddDatabase, setShowAddDatabase] = useState(false);

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

  // Generate a unique ID for new databases
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Get the current connection details
  const getCurrentConnection = async (): Promise<GoogleConnection | null> => {
    try {
      const connections = await loadConnections(activeTab);
      return connections.find(conn => conn.id === selectedConnection) || null;
    } catch (error) {
      logger.error('Failed to load connection', error);
      return null;
    }
  };

  // Get status icon based on database status
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
        logger.error('No connection provided for API access');
        return getFallbackSheetNames();
      }

      logger.debug('Fetching sheet names using authenticated Google Sheets API');
      logger.debug('Spreadsheet ID:', googleSheetId);
      
      // Method 1: Try backend service with service account authentication
      if (connection.clientEmail && connection.privateKey && connection.projectId) {
        logger.sheetsOperation('Fetch Sheet Names', googleSheetId, {
          method: 'Backend Authentication',
          connection: connection.name
        });
        
        try {
          const backendService = createBackendSheetsService();
          
          // Check if backend is running
          const isBackendRunning = await backendService.checkHealth();
          if (!isBackendRunning) {
            logger.warn('Backend service is not running');
            throw new Error('Backend service is not available');
          }
          
          // Test access first
          const hasAccess = await backendService.testAccess(googleSheetId, connection);
          if (!hasAccess) {
            logger.warn('Backend access test failed, trying fallback methods');
            throw new Error('Backend access test failed');
          }

          // Fetch sheet names via backend
          const sheetNames = await backendService.fetchAvailableSheets(googleSheetId, connection);
          logger.sheetsResult('Sheet Names Fetch', true, { count: sheetNames.length });
          return sheetNames;
          
        } catch (backendError: any) {
          logger.warn('Backend service failed', backendError.message);
          logger.debug('Trying public API fallback...');
        }
      }
      
      // Method 2: Try public API with API key
      if (connection.apiKey) {
        logger.debug('Attempting public API authentication...');
        try {
          const sheetNames = await fetchSheetsWithPublicAPI(googleSheetId, connection.apiKey);
          logger.success('Successfully fetched sheets using public API');
          return sheetNames;
        } catch (publicApiError) {
          logger.warn('Public API failed, falling back to predefined list');
        }
      }
      
      // Method 3: Fall back to predefined list
      logger.warn('All API methods failed, using fallback sheet names');
      return getFallbackSheetNames();
      
    } catch (error: any) {
          logger.error('Failed to fetch available sheets', error.message);
          return getFallbackSheetNames();
        }
      };
    
      // Add the rest of your component code here (e.g., JSX rendering, handlers, etc.)
    }
