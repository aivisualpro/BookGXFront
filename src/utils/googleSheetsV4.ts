/**
 * Google Sheets API v4 Implementation
 * Following the directions provided for proper OAuth and API integration
 */

import { GoogleAuth } from 'google-auth-library';

// Types matching your directions
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleConnection {
  id: string;
  name: string;
  projectId: string;
  
  // Option A: OAuth (Recommended for frontend)
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  
  // Option B: Service Account (More secure but harder in browser)
  serviceAccountEmail?: string;
  privateKey?: string;
  
  // Option C: API Key (Limited access)
  apiKey?: string;
  
  authType: 'oauth' | 'service_account' | 'api_key';
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  createdAt: Date;
  lastTested?: Date;
  errorMessage?: string;
}

export interface SheetInfo {
  sheetId: number;
  title: string;
  index: number;
  sheetType: string;
  gridProperties: {
    rowCount: number;
    columnCount: number;
  };
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  sheets: SheetInfo[];
  spreadsheetUrl: string;
}

/**
 * Enhanced Google Sheets API v4 Client
 * Supports OAuth, Service Account, and API Key authentication
 */
export class GoogleSheetsV4API {
  private connection: GoogleConnection;
  private auth: GoogleAuth | null = null;
  
  constructor(connection: GoogleConnection) {
    this.connection = connection;
    this.initializeAuth();
  }
  
  private async initializeAuth() {
    try {
      if (this.connection.authType === 'service_account' && this.connection.privateKey) {
        // Service Account Authentication
        this.auth = new GoogleAuth({
          credentials: {
            type: 'service_account',
            project_id: this.connection.projectId,
            private_key: this.connection.privateKey,
            client_email: this.connection.serviceAccountEmail,
            client_id: this.connection.clientId,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
          },
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.readonly'
          ]
        });
      }
      // OAuth and API Key will be handled differently
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error);
      throw error;
    }
  }
  
  /**
   * Get spreadsheet metadata including all sheet names
   * This replaces your CSV detection method
   */
  async getSpreadsheetInfo(spreadsheetId: string): Promise<SpreadsheetInfo> {
    try {
      let url: string;
      let headers: Record<string, string> = {};
      
      if (this.connection.authType === 'api_key' && this.connection.apiKey) {
        // API Key method (your current approach)
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${this.connection.apiKey}&fields=spreadsheetId,properties.title,sheets.properties`;
      } else if (this.connection.authType === 'oauth' && this.connection.accessToken) {
        // OAuth method (recommended)
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`;
        headers['Authorization'] = `Bearer ${this.connection.accessToken}`;
      } else if (this.connection.authType === 'service_account' && this.auth) {
        // Service Account method
        const authClient = await this.auth.getClient();
        const accessToken = await authClient.getAccessToken();
        
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`;
        headers['Authorization'] = `Bearer ${accessToken.token}`;
      } else {
        throw new Error('No valid authentication method configured');
      }
      
      console.log('🔍 Fetching spreadsheet info from:', url);
      console.log('🔑 Auth method:', this.connection.authType);
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Spreadsheet API error:', response.status, errorText);
        throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      const spreadsheetInfo: SpreadsheetInfo = {
        spreadsheetId: data.spreadsheetId,
        title: data.properties.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        sheets: data.sheets?.map((sheet: any) => ({
          sheetId: sheet.properties.sheetId,
          title: sheet.properties.title,
          index: sheet.properties.index,
          sheetType: sheet.properties.sheetType || 'GRID',
          gridProperties: {
            rowCount: sheet.properties.gridProperties?.rowCount || 0,
            columnCount: sheet.properties.gridProperties?.columnCount || 0
          }
        })) || []
      };
      
      console.log('✅ Successfully fetched spreadsheet info:', spreadsheetInfo);
      return spreadsheetInfo;
      
    } catch (error) {
      console.error('💥 Failed to get spreadsheet info:', error);
      throw error;
    }
  }
  
  /**
   * Get sheet headers (first row of a specific sheet)
   * Level 4: Column headers
   */
  async getSheetHeaders(spreadsheetId: string, sheetName: string): Promise<string[]> {
    try {
      let url: string;
      let headers: Record<string, string> = {};
      
      // Encode sheet name for URL
      const encodedSheetName = encodeURIComponent(sheetName);
      const range = `${encodedSheetName}!A1:1`;
      
      if (this.connection.authType === 'api_key' && this.connection.apiKey) {
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${this.connection.apiKey}`;
      } else if (this.connection.authType === 'oauth' && this.connection.accessToken) {
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
        headers['Authorization'] = `Bearer ${this.connection.accessToken}`;
      } else if (this.connection.authType === 'service_account' && this.auth) {
        const authClient = await this.auth.getClient();
        const accessToken = await authClient.getAccessToken();
        
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
        headers['Authorization'] = `Bearer ${accessToken.token}`;
      } else {
        throw new Error('No valid authentication method configured');
      }
      
      console.log('📋 Fetching headers from:', url);
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Headers API error:', response.status, errorText);
        throw new Error(`Failed to fetch headers: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const headerRow = data.values?.[0] || [];
      
      console.log(`✅ Fetched ${headerRow.length} headers from ${sheetName}:`, headerRow);
      return headerRow;
      
    } catch (error) {
      console.error('💥 Failed to get sheet headers:', error);
      throw error;
    }
  }
  
  /**
   * Get sheet data (all rows or specific range)
   */
  async getSheetData(spreadsheetId: string, sheetName: string, range?: string): Promise<any[][]> {
    try {
      let url: string;
      let headers: Record<string, string> = {};
      
      const encodedSheetName = encodeURIComponent(sheetName);
      const fullRange = range ? `${encodedSheetName}!${range}` : encodedSheetName;
      
      if (this.connection.authType === 'api_key' && this.connection.apiKey) {
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${fullRange}?key=${this.connection.apiKey}`;
      } else if (this.connection.authType === 'oauth' && this.connection.accessToken) {
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${fullRange}`;
        headers['Authorization'] = `Bearer ${this.connection.accessToken}`;
      } else if (this.connection.authType === 'service_account' && this.auth) {
        const authClient = await this.auth.getClient();
        const accessToken = await authClient.getAccessToken();
        
        url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${fullRange}`;
        headers['Authorization'] = `Bearer ${accessToken.token}`;
      } else {
        throw new Error('No valid authentication method configured');
      }
      
      console.log('📊 Fetching data from:', url);
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Data API error:', response.status, errorText);
        throw new Error(`Failed to fetch data: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const rows = data.values || [];
      
      console.log(`✅ Fetched ${rows.length} rows from ${sheetName}`);
      return rows;
      
    } catch (error) {
      console.error('💥 Failed to get sheet data:', error);
      throw error;
    }
  }
  
  /**
   * Test connection with detailed error reporting
   */
  async testConnection(spreadsheetId: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🧪 Testing connection...');
      console.log('🔑 Auth type:', this.connection.authType);
      console.log('📄 Spreadsheet ID:', spreadsheetId);
      
      const info = await this.getSpreadsheetInfo(spreadsheetId);
      
      return {
        success: true,
        message: `Successfully connected! Found ${info.sheets.length} sheets in "${info.title}"`,
        details: {
          spreadsheetTitle: info.title,
          sheetCount: info.sheets.length,
          sheetNames: info.sheets.map(s => s.title),
          url: info.spreadsheetUrl
        }
      };
      
    } catch (error) {
      console.error('🚨 Connection test failed:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {
          error: error instanceof Error ? error.message : String(error),
          authType: this.connection.authType,
          hasApiKey: !!this.connection.apiKey,
          hasAccessToken: !!this.connection.accessToken,
          hasPrivateKey: !!this.connection.privateKey
        }
      };
    }
  }
}

/**
 * OAuth Helper Functions (for implementing the recommended approach)
 */
export class GoogleOAuthHelper {
  private config: GoogleOAuthConfig;
  
  constructor(config: GoogleOAuthConfig) {
    this.config = config;
  }
  
  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline', // To get refresh token
      prompt: 'consent' // Force consent to get refresh token
    });
    
    return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }
    
    return response.json();
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }
    
    return response.json();
  }
}

// Default OAuth configuration following your directions
export const DEFAULT_OAUTH_CONFIG: GoogleOAuthConfig = {
  clientId: '', // Set from your Google Cloud Console
  clientSecret: '', // Set from your Google Cloud Console  
  redirectUri: window.location.origin + '/oauth/callback',
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly'
  ]
};