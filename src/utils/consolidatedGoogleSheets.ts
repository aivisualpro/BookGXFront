/**
 * Consolidated Google Sheets Service
 * 
 * This file consolidates all Google Sheets related functionality from:
 * - authenticatedGoogleSheets.ts
 * - backendSheetsService.ts  
 * - dynamicGoogleSheets.ts
 * - googleSheets.ts
 * - googleSheetsV4.ts
 * - realSheetsDataService.ts
 * 
 * Provides a unified interface for all Google Sheets operations
 */

import { logger } from './logger';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface GoogleSheetsConnection {
  id: string;
  name: string;
  projectId: string;
  apiKey: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  region: 'saudi' | 'egypt';
}

export interface SheetMetadata {
  id: string;
  name: string;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface HeaderInfo {
  columnIndex: number;
  originalHeader: string;
  variableName: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  isEnabled: boolean;
}

export interface SheetData {
  headers: string[];
  rows: string[][];
  metadata: SheetMetadata;
}

// =============================================================================
// BACKEND SERVICE INTERFACE
// =============================================================================

class ConsolidatedGoogleSheetsService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  }

  /**
   * Test connection to backend service
   */
  async testBackendConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      logger.error('Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Fetch available sheet names from a spreadsheet
   */
  async fetchSheetNames(spreadsheetId: string, connection: GoogleSheetsConnection): Promise<string[]> {
    try {
      logger.debug('Fetching sheet names via backend service');
      
      const response = await fetch(`${this.baseUrl}/api/fetchSheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          connection: {
            clientEmail: connection.clientEmail,
            privateKey: connection.privateKey,
            projectId: connection.projectId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sheet names');
      }

      logger.success(`Fetched ${data.sheetNames.length} sheet names`);
      return data.sheetNames || [];
      
    } catch (error) {
      logger.error('Failed to fetch sheet names:', error);
      return this.getFallbackSheetNames();
    }
  }

  /**
   * Fetch headers from a specific sheet
   */
  async fetchSheetHeaders(
    spreadsheetId: string, 
    sheetName: string, 
    connection: GoogleSheetsConnection,
    range: string = 'A1:ZZ1'
  ): Promise<string[]> {
    try {
      logger.debug(`Fetching headers from sheet: ${sheetName}`);
      
      const response = await fetch(`${this.baseUrl}/api/fetchHeaders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          range,
          connection: {
            clientEmail: connection.clientEmail,
            privateKey: connection.privateKey,
            projectId: connection.projectId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch headers');
      }

      logger.success(`Fetched ${data.headers.length} headers`);
      return data.headers || [];
      
    } catch (error) {
      logger.error('Failed to fetch headers:', error);
      return [];
    }
  }

  /**
   * Fetch data from a specific sheet range
   */
  async fetchSheetData(
    spreadsheetId: string, 
    sheetName: string, 
    connection: GoogleSheetsConnection,
    range?: string
  ): Promise<SheetData> {
    try {
      logger.debug(`Fetching data from sheet: ${sheetName}`);
      
      const response = await fetch(`${this.baseUrl}/api/fetchData`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          range,
          connection: {
            clientEmail: connection.clientEmail,
            privateKey: connection.privateKey,
            projectId: connection.projectId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      const data = result.data || [];
      const headers = data.length > 0 ? data[0] : [];
      const rows = data.slice(1);

      const sheetData: SheetData = {
        headers,
        rows,
        metadata: {
          id: spreadsheetId,
          name: sheetName,
          title: sheetName,
          rowCount: data.length,
          columnCount: headers.length
        }
      };

      logger.success(`Fetched ${rows.length} rows of data`);
      return sheetData;
      
    } catch (error) {
      logger.error('Failed to fetch sheet data:', error);
      throw error;
    }
  }

  /**
   * Test access to a spreadsheet
   */
  async testSpreadsheetAccess(spreadsheetId: string, connection: GoogleSheetsConnection): Promise<boolean> {
    try {
      logger.debug('Testing spreadsheet access');
      
      const response = await fetch(`${this.baseUrl}/api/testAccess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          connection: {
            clientEmail: connection.clientEmail,
            privateKey: connection.privateKey,
            projectId: connection.projectId
          }
        })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success && data.hasAccess;
      
    } catch (error) {
      logger.error('Spreadsheet access test failed:', error);
      return false;
    }
  }

  /**
   * Get fallback sheet names when API fails
   */
  private getFallbackSheetNames(): string[] {
    return [
      'Sheet1',
      'Data',
      'Main',
      'Dashboard',
      'Raw Data',
      'Export'
    ];
  }
}

// =============================================================================
// DASHBOARD DATA TRANSFORMATION
// =============================================================================

/**
 * Transform raw Google Sheets data into dashboard format
 */
export function transformToDashboardData(rawData: any[], startDate?: string, endDate?: string) {
  if (!rawData || rawData.length === 0) {
    return {
      totalRevenue: 0,
      totalBookings: 0,
      averageBookingValue: 0,
      revenueByMonth: [],
      bookingsByStatus: [],
      bookingsByType: [],
      userEngagement: []
    };
  }

  // Filter by date range if provided
  let filteredData = rawData;
  if (startDate || endDate) {
    filteredData = rawData.filter(row => {
      if (!row.date) return true;
      const rowDate = new Date(row.date);
      if (startDate && rowDate < new Date(startDate)) return false;
      if (endDate && rowDate > new Date(endDate)) return false;
      return true;
    });
  }

  // Calculate metrics
  const totalRevenue = filteredData.reduce((sum, row) => {
    const amount = parseFloat(row.amount || row.revenue || row.total || '0');
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const totalBookings = filteredData.length;
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Group by month for revenue chart
  const revenueByMonth = filteredData.reduce((acc: any[], row) => {
    if (!row.date) return acc;
    
    const date = new Date(row.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const existing = acc.find(item => item.month === monthKey);
    const amount = parseFloat(row.amount || row.revenue || row.total || '0');
    
    if (existing) {
      existing.revenue += isNaN(amount) ? 0 : amount;
    } else {
      acc.push({
        month: monthKey,
        revenue: isNaN(amount) ? 0 : amount
      });
    }
    
    return acc;
  }, []);

  // Group by status
  const bookingsByStatus = filteredData.reduce((acc: any[], row) => {
    const status = row.status || 'Unknown';
    const existing = acc.find(item => item.status === status);
    
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ status, count: 1 });
    }
    
    return acc;
  }, []);

  // Group by type
  const bookingsByType = filteredData.reduce((acc: any[], row) => {
    const type = row.type || row.category || 'General';
    const existing = acc.find(item => item.type === type);
    
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ type, count: 1 });
    }
    
    return acc;
  }, []);

  return {
    totalRevenue,
    totalBookings,
    averageBookingValue,
    revenueByMonth: revenueByMonth.sort((a, b) => a.month.localeCompare(b.month)),
    bookingsByStatus,
    bookingsByType,
    userEngagement: [] // Placeholder for user engagement data
  };
}

/**
 * Create dashboard API instance
 */
export function createDashboardAPI() {
  return new ConsolidatedGoogleSheetsService();
}

/**
 * Create dynamic dashboard API for specific region
 */
export function createDynamicDashboardAPI(country: 'saudi' | 'egypt' = 'saudi') {
  const service = new ConsolidatedGoogleSheetsService();
  
  return {
    ...service,
    region: country,
    getRegionalConfig: () => ({
      country,
      currency: country === 'saudi' ? 'SAR' : 'EGP',
      locale: country === 'saudi' ? 'ar-SA' : 'ar-EG'
    })
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate spreadsheet ID format
 */
export function isValidSpreadsheetId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  
  // Google Sheets ID is typically 44 characters long
  const googleSheetsIdPattern = /^[a-zA-Z0-9-_]{25,}$/;
  return googleSheetsIdPattern.test(id);
}

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Format cell range notation
 */
export function formatCellRange(
  startRow: number, 
  endRow: number, 
  startCol: string = 'A', 
  endCol: string = 'ZZ'
): string {
  return `${startCol}${startRow}:${endCol}${endRow}`;
}

/**
 * Convert column number to letter notation
 */
export function numberToColumnLetter(num: number): string {
  let result = '';
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export the main service class
export { ConsolidatedGoogleSheetsService };

// Export singleton instance
export const googleSheetsService = new ConsolidatedGoogleSheetsService();

// Legacy exports for backward compatibility
export const backendSheetsService = googleSheetsService;
export const authenticatedGoogleSheets = googleSheetsService;
export const realSheetsDataService = googleSheetsService;
