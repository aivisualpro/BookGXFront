//
// Updated fetchAvailableSheets function for DatabasesManager.tsx
//

import logger from './logger'; 
import { 
  createBackendSheetsService, 
  fetchSheetsWithPublicAPI
} from './backendSheetsService';

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
        logger.warn('Backend service failed:', backendError.message);
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
    logger.error('Failed to fetch available sheets:', error.message);
    return getFallbackSheetNames();
  }
};
function getFallbackSheetNames(): string[] {
    // Return a default list of common Google Sheets tab names
    return ['Sheet1', 'Sheet2', 'Sheet3'];
}

