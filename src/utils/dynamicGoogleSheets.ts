interface CountryApiConfig {
  serviceAccountEmail: string;
  projectId: string;
  apiKey: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
}

interface SheetConnection {
  name: string;
  googleSheetId: string;
  sheetId: string;
  status: 'connected' | 'disconnected' | 'error';
}

// Get API configuration for a specific country
export const getCountryApiConfig = (country: 'saudi' | 'egypt'): CountryApiConfig | null => {
  const configKey = `${country}_api_config`;
  const savedConfig = localStorage.getItem(configKey);
  
  if (savedConfig) {
    return JSON.parse(savedConfig);
  }
  
  // Return default Saudi config if no saved config
  if (country === 'saudi') {
    return {
      serviceAccountEmail: 'bookgx@bookgx.iam.gserviceaccount.com',
      projectId: 'bookgx',
      apiKey: '2c59f8157f7b5f82e994cf43c1aceacf2cdbc4db',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCWCTXLB617+pJX\nOFO7N9xz8SFpVvZby1aric8DETmQFkrAAHmuhs1ADKz6bFPd0oarAAwUkabvdqhK\njU5KTums1kvlYS1+5yglmD64BdbUiUj+NcFLvJeQN0jtFiVTnljaw4Ms54ySFBGd\nilAGIETe+eAD/0IwECMrESk6bKJwwLv3M6muF+gHvkbYTWuRkq5t4YD5qQb2rapd\nMI4qQIXm77KWzDiaB49pfVlCFDuXU5Uhre/S9o6rPkwSZMFmYdXTT34EWfUmMaJU\nPAlcUJhR1M0QWBZGvyKiYAOXnwFhgHoOKsxcOBaMjD1pjXguEHAF8F7/xGN/XBho\n86Wv6G6hAgMBAAECggEAHKTlgD2XAXR1O/GlCrk/fWMr3dCceCn6AgXtX8iKFNgs\nrTtp/8f8p53D6IuF93OaAkugAs1L8avVtWYE7Grkcfr3wnMrHG9FWugWEUwMF8ee\nB+p7XNpElWP4qEryFWTF0f5BrPEIBVuPgWRGouTGQUuzWRACsuphzHcaR+01lhDq\n+7bkUmFhCfVBe/rHU3bjbQpY3PsaPekhrn4SSsUfNVBFz0rtXvXMPpHnF7AtWDjD\n6wlparcANGD3smp6Hsa5NakqTx3EvoRFXjgQovVoQGelvp9h5TEypu7Nt+absAW/\nYzKSp2Oafkm0WCpa0+a/Y0eWgE3iCOyLmVA7ZyvRgQKBgQDF3xXU50XU8rm832Xs\n8RowI1zbD6XOFRy7w4cY57EEjEQSnDMBEXdLpluDI23+j4MQhohnzbA5QkDk7Jff\n+O3AgLteq2pmNC+0IwSR4Br2ozPH3Rio4uFSH6D8RM75JTU7nlf/h8Gc+nlneiHK\nDa+ubJH6F+Q9pNdNSo1ozANqqwKBgQDCHKlJyKsMTYXxETSvcLY5dsIScxkCBtEa\no3zrleMbVHYJZklob55whaAVbrSKHfNMOKoF+NOIPxAkn4kvzlYhLoUQck4WjP6T\nydJVin1sM95wcqbdQW4FtHnb+VpvOFYPHPW1YhWJPtY4G1BylONO0ODQHsiHmL9M\nor2MSeKL4wKBgHqsp0VaqRGv9nVhbzip9dl4Yx4xIlOVBT5np79KDZZLO/zpuDlm\nUbamCcBQ2+XhpZk+Px1UCXhGWiNTh4lFNGmPphq4XXvFyPl+aFvkO/NDFVxI9/vk\nxVr73vvn0QXoCovOzLHQwbmIFHKR5pb1S0DxcMNDwq5xH0Z8/RTGvyuHAoGAfyoz\npUi29epbkyAIed7HIkIwxdFtUqyQlHkCP3wEOkVMxr+h2680Btcjlqbd05Xna8m7\naQon2hwmQTfasdzlA/vr5Ghdy9w2cy9Ggg+mNxqL4PLbahuRLl+bbYafvjkT9/aq\n6VcGcNEfmcYbH9V2TI3+mZlxGZPxzwzWTG+i4K0CgYEAlUvzCSFFEJeJFcWfxaEs\nC9Z+3GkqNdHXmrKa5sU7wz5F9xdGHPnB+DvKCWIzJOrDdQbgpnDSwEgGq+kP42sC\nHf2QnS93VgvqaH7wU2JGKAPSf8yClDjpv1BBoGkA67PSTuh7mO9yjMSMJkCSgGxp\nUCYOjEYxzenEx6ZljXtYt4A=\n-----END PRIVATE KEY-----',
      clientEmail: 'bookgx@bookgx.iam.gserviceaccount.com',
      clientId: '115703284064487750533'
    };
  }
  
  return null;
};

// Get sheet connections for a specific country
export const getCountrySheetConnections = (country: 'saudi' | 'egypt'): SheetConnection[] => {
  const configKey = `${country}_connections`;
  const savedConnections = localStorage.getItem(configKey);
  
  if (savedConnections) {
    return JSON.parse(savedConnections);
  }
  
  // Return default empty connections
  return [
    { name: "Users", googleSheetId: "", sheetId: "", status: 'disconnected' },
    { name: "Bookings", googleSheetId: "", sheetId: "", status: 'disconnected' },
    { name: "Products", googleSheetId: "", sheetId: "", status: 'disconnected' },
    { name: "Product Sales", googleSheetId: "", sheetId: "", status: 'disconnected' },
    { name: "Gift Card Sales", googleSheetId: "", sheetId: "", status: 'disconnected' },
    { name: "Coming Soon 1", googleSheetId: "", sheetId: "", status: 'disconnected' },
    { name: "Coming Soon 2", googleSheetId: "", sheetId: "", status: 'disconnected' },
    { name: "Coming Soon 3", googleSheetId: "", sheetId: "", status: 'disconnected' },
    { name: "Coming Soon 4", googleSheetId: "", sheetId: "", status: 'disconnected' },
    { name: "Coming Soon 5", googleSheetId: "", sheetId: "", status: 'disconnected' },
  ];
};

// Get specific sheet connection
export const getSheetConnection = (country: 'saudi' | 'egypt', apiName: string): SheetConnection | null => {
  const connections = getCountrySheetConnections(country);
  return connections.find(conn => conn.name.toLowerCase() === apiName.toLowerCase()) || null;
};

// Create Service Account credentials object for Google Sheets API
export const createServiceAccountCredentials = (country: 'saudi' | 'egypt') => {
  const config = getCountryApiConfig(country);
  
  if (!config || !config.privateKey) {
    throw new Error(`Missing API configuration for ${country}. Please configure in Connection settings.`);
  }
  
  return {
    type: "service_account",
    project_id: config.projectId,
    private_key: config.privateKey,
    client_email: config.clientEmail,
    client_id: config.clientId,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(config.clientEmail)}`
  };
};

// Enhanced Google Sheets API with dynamic configuration
export class DynamicGoogleSheetsAPI {
  private country: 'saudi' | 'egypt';
  private apiConfig: CountryApiConfig;

  constructor(country: 'saudi' | 'egypt') {
    this.country = country;
    const config = getCountryApiConfig(country);
    
    if (!config) {
      throw new Error(`No API configuration found for ${country}. Please configure in Connection settings.`);
    }
    
    this.apiConfig = config;
  }

  // Get data from a specific API endpoint
  async getData(apiName: string): Promise<any[]> {
    const connection = getSheetConnection(this.country, apiName);
    
    if (!connection || !connection.googleSheetId || !connection.sheetId) {
      console.warn(`No sheet connection configured for ${apiName} in ${this.country}`);
      return [];
    }

    try {
      // For now, we'll use the public CSV method but with dynamic URLs
      // In production, you'd use the Service Account authentication
      const csvUrl = `https://docs.google.com/spreadsheets/d/${connection.googleSheetId}/export?format=csv&gid=${connection.sheetId}`;
      
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      return this.parseCSV(csvText);
    } catch (error) {
      console.error(`Error fetching data for ${apiName}:`, error);
      throw error;
    }
  }

  // Parse CSV data
  private parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      
      data.push(row);
    }

    return data;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  // Test connection
  async testConnection(apiName: string): Promise<boolean> {
    try {
      const data = await this.getData(apiName);
      return data.length > 0;
    } catch {
      return false;
    }
  }

  // Get API configuration info
  getConfigInfo() {
    return {
      country: this.country,
      serviceAccountEmail: this.apiConfig.serviceAccountEmail,
      projectId: this.apiConfig.projectId,
      hasApiKey: !!this.apiConfig.apiKey,
      hasPrivateKey: !!this.apiConfig.privateKey
    };
  }
}

// Factory function to create API instance
export const createDynamicAPI = (country: 'saudi' | 'egypt') => {
  return new DynamicGoogleSheetsAPI(country);
};

// Export utility functions
export const exportUtilities = {
  getCountryApiConfig,
  getCountrySheetConnections,
  getSheetConnection,
  createServiceAccountCredentials,
  createDynamicAPI
};