// Backend API service for authenticated Google Sheets access
// This replaces direct browser-based authentication with secure server-side calls

import { checkBackendHealth, Logger } from './optimizations';

const BACKEND_URL = 'http://localhost:3001';

export interface BackendResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface SheetNamesResponse {
  success?: boolean;
  sheetNames: string[];
  count: number;
  spreadsheetId: string;
  error?: string;
}

export interface HeadersResponse {
  success?: boolean;
  headers: string[];
  count: number;
  sheetName: string;
  spreadsheetId: string;
  error?: string;
}

export interface AccessTestResponse {
  hasAccess: boolean;
  spreadsheetTitle?: string;
  spreadsheetId: string;
  error?: string;
}

/**
 * Backend API service for authenticated Google Sheets operations
 */
export class BackendSheetsService {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if backend server is running (uses optimized caching)
   */
  async checkHealth(): Promise<boolean> {
    return checkBackendHealth();
  }

  /**
   * Fetch all sheet names from a Google Spreadsheet via backend
   */
  async fetchAvailableSheets(spreadsheetId: string, connection: any): Promise<string[]> {
    try {
      Logger.debug('Fetching sheets via secure backend...');
      Logger.debug('Spreadsheet ID:', spreadsheetId);
      Logger.debug('Backend URL:', `${this.baseUrl}/api/fetchSheets`);

      const response = await fetch(`${this.baseUrl}/api/fetchSheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId,
          connection: {
            name: connection.name,
            clientEmail: connection.clientEmail,
            privateKey: connection.privateKey,
            projectId: connection.projectId
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SheetNamesResponse = await response.json();
      
      if (data.success !== false) {
        Logger.success('Successfully fetched sheets via backend:', {
          count: data.sheetNames.length,
          sheets: data.sheetNames
        });
        return data.sheetNames;
      } else {
        throw new Error(data.error || 'Backend request failed');
      }
    } catch (error: any) {
      Logger.error('Error fetching sheets via backend', error);
      
      // Provide detailed error information
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Backend server is not running. Please start the backend service.');
      } else if (error.message.includes('Permission denied')) {
        throw new Error('Service account does not have access to this spreadsheet');
      } else if (error.message.includes('not found')) {
        throw new Error('Spreadsheet not found. Check the spreadsheet ID.');
      }
      
      throw new Error(`Backend API error: ${error.message}`);
    }
  }

  /**
   * Fetch headers from a specific sheet via backend
   */
  async fetchSheetHeaders(spreadsheetId: string, sheetName: string, connection: any, range: string = 'A1:ZZ1'): Promise<string[]> {
    try {
      console.log('🔐 Fetching headers via secure backend...');
      console.log('📄 Spreadsheet ID:', spreadsheetId);
      console.log('📋 Sheet Name:', sheetName);
      console.log('🌐 Backend URL:', `${this.baseUrl}/api/fetchHeaders`);

      const response = await fetch(`${this.baseUrl}/api/fetchHeaders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          range,
          connection: {
            name: connection.name,
            clientEmail: connection.clientEmail,
            privateKey: connection.privateKey,
            projectId: connection.projectId
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: HeadersResponse = await response.json();
      
      if (data.success !== false) {
        console.log('✅ Successfully fetched headers via backend:', data.headers);
        return data.headers;
      } else {
        throw new Error(data.error || 'Backend request failed');
      }
    } catch (error: any) {
      console.error('❌ Error fetching headers via backend:', error);
      
      // Provide detailed error information
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Backend server is not running. Please start the backend service.');
      } else if (error.message.includes('Permission denied')) {
        throw new Error('Service account does not have access to this spreadsheet');
      } else if (error.message.includes('not found')) {
        throw new Error('Sheet not found. Check the sheet name.');
      }
      
      throw new Error(`Backend API error: ${error.message}`);
    }
  }

  /**
   * Test access to a spreadsheet via backend
   */
  async testAccess(spreadsheetId: string, connection: any): Promise<boolean> {
    try {
      Logger.debug('Testing access via secure backend...');
      Logger.debug('Backend URL:', `${this.baseUrl}/api/testAccess`);

      const response = await fetch(`${this.baseUrl}/api/testAccess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId,
          connection: {
            name: connection.name,
            clientEmail: connection.clientEmail,
            privateKey: connection.privateKey,
            projectId: connection.projectId
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        Logger.error('Backend access test failed', errorData.error);
        return false;
      }

      const data: AccessTestResponse = await response.json();
      
      if (data.hasAccess) {
        Logger.success('Access confirmed to Google Sheet', { title: data.spreadsheetTitle });
        return true;
      } else {
        Logger.warn('Backend access test failed', data.error);
        return false;
      }
    } catch (error: any) {
      Logger.error('Error testing access via backend', error);
      return false;
    }
  }

  /**
   * Fetch data from a specific sheet range via backend (bonus feature)
   */
  async fetchSheetData(spreadsheetId: string, sheetName: string, connection: any, range?: string): Promise<any[][]> {
    try {
      Logger.debug('Fetch Sheet Data operation starting...', {
        spreadsheetId,
        sheetName,
        range
      });

      const response = await fetch(`${this.baseUrl}/api/fetchData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          range,
          connection: {
            name: connection.name,
            clientEmail: connection.clientEmail,
            privateKey: connection.privateKey,
            projectId: connection.projectId
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success !== false) {
        Logger.success('Sheet Data Fetch completed successfully:', { rows: data.rowCount });
        return data.data;
      } else {
        throw new Error(data.error || 'Backend request failed');
      }
    } catch (error: any) {
      Logger.error('Error fetching data via backend', error);
      throw new Error(`Backend API error: ${error.message}`);
    }
  }
}

/**
 * Create a backend sheets service instance
 */
export function createBackendSheetsService(): BackendSheetsService {
  return new BackendSheetsService();
}

/**
 * Enhanced public API fallback (when backend is not available)
 */
export async function fetchSheetsWithPublicAPI(spreadsheetId: string, apiKey: string): Promise<string[]> {
  try {
    console.log('🌐 Using public Google Sheets API as fallback...');
    console.log('📄 Spreadsheet ID:', spreadsheetId);
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=sheets.properties.title`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('⚠️ Public API call failed');
      return getFallbackSheetNames();
    }
    
    const data = await response.json();
    if (data.sheets) {
      const sheetNames = data.sheets.map((sheet: any) => sheet.properties.title);
      console.log('✅ Successfully fetched sheets via public API:', sheetNames);
      return sheetNames;
    } else {
      console.warn('⚠️ No sheets found, using fallback data');
      return getFallbackSheetNames();
    }
  } catch (error) {
    console.error('❌ Error with public API fallback:', error);
    return getFallbackSheetNames();
  }
}

/**
 * Enhanced public API fallback for headers (when backend is not available)
 */
export async function fetchHeadersWithPublicAPI(spreadsheetId: string, sheetName: string, apiKey: string): Promise<string[]> {
  try {
    console.log('🌐 Using public Google Sheets API for headers...');
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:ZZ1?key=${apiKey}`
    );
    
    if (!response.ok) {
      console.warn('⚠️ Public API call failed for headers');
      return getFallbackHeaders(sheetName);
    }
    
    const data = await response.json();
    const headers = data.values?.[0] || [];
    console.log(`✅ Fetched headers from ${sheetName}:`, headers);
    return headers.filter((header: string) => header && header.trim() !== '');
  } catch (error) {
    console.error('❌ Error fetching headers with public API:', error);
    return getFallbackHeaders(sheetName);
  }
}

/**
 * Fallback function for when all API methods fail
 */
export function getFallbackSheetNames(): string[] {
  Logger.warn('🔄 Using FALLBACK/DUMMY sheet names - these are NOT your real Google Sheet tabs!');
  return [
    'KPIs Report',
    'Modules', 
    'Notifications',
    'Translations',
    'Users',
    'Bookings',
    'Products',
    'Analytics',
    'Reports',
    'Settings',
    'Dashboard',
    'Metrics',
    'ProductLocation',
    'Gift Cards',
    'Gift Card Purchases',
    'Artist rating',
    'Dropdowns',
    'Calendar',
    'Weeks'
  ];
}

/**
 * Fallback function for headers when all API methods fail
 */
export function getFallbackHeaders(sheetName: string): string[] {
  console.log(`🔄 Using fallback headers for ${sheetName}...`);
  
  const fallbackHeaders: { [key: string]: string[] } = {
    'ProductLocation': ['ID', 'Product Name', 'Location', 'Quantity', 'Price'],
    'Gift Cards': ['Card ID', 'Value', 'Status', 'Created Date', 'Expiry Date'],
    'Gift Card Purchases': ['Purchase ID', 'Card ID', 'Amount', 'Date', 'Customer'],
    'Artist rating': ['Artist ID', 'Name', 'Rating', 'Reviews', 'Category'],
    'Dropdowns': ['Option ID', 'Option Name', 'Category', 'Value', 'Active'],
    'Calendar': ['Date', 'Event', 'Description', 'Time', 'Location'],
    'Weeks': ['Week Number', 'Start Date', 'End Date', 'Revenue', 'Bookings'],
    'Users': ['User ID', 'Name', 'Email', 'Role', 'Status', 'Created Date'],
    'Bookings': ['Booking ID', 'User ID', 'Service', 'Date', 'Status', 'Amount'],
    'Products': ['Product ID', 'Name', 'Category', 'Price', 'Stock', 'Description'],
    'Analytics': ['Date', 'Metric', 'Value', 'Source', 'Category'],
    'Reports': ['Report ID', 'Title', 'Type', 'Generated Date', 'Status'],
    'Settings': ['Setting ID', 'Name', 'Value', 'Category', 'Description'],
    'KPIs Report': ['Date', 'KPI', 'Value', 'Target', 'Performance'],
    'Modules': ['Module ID', 'Name', 'Version', 'Status', 'Description'],
    'Notifications': ['ID', 'Title', 'Message', 'Type', 'Date', 'Read'],
    'Translations': ['Key', 'English', 'Arabic', 'Context', 'Status'],
    'Dashboard': ['Widget ID', 'Name', 'Type', 'Position', 'Settings'],
    'Metrics': ['Date', 'Metric Name', 'Value', 'Unit', 'Category']
  };
  
  return fallbackHeaders[sheetName] || ['ID', 'Name', 'Description', 'Status', 'Created Date'];
}
