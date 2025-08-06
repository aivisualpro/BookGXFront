import _ from 'lodash';

// Cache keys for localStorage/sessionStorage
export const CACHE_KEYS = {
  CONNECTION_STATUS: 'bookgx_connection_status',
  SHEET_METADATA: 'bookgx_sheet_metadata',
  LAST_VERIFIED: 'bookgx_last_verified',
  BACKEND_STATUS: 'bookgx_backend_status'
} as const;

// Session cache for temporary data
export class SessionCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMinutes: number = 30): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

// Global session cache instance
export const sessionCache = new SessionCache();

// Deep equality check for Firebase data
export function hasDataChanged(newData: any, existingData: any): boolean {
  // Remove timestamps and generated fields for comparison
  const cleanData = (data: any) => {
    const cleaned = { ...data };
    delete cleaned.lastUpdated;
    delete cleaned.createdAt;
    delete cleaned.lastTested;
    return cleaned;
  };

  return !_.isEqual(cleanData(newData), cleanData(existingData));
}

// Check if connection needs re-verification
export function shouldReVerifyConnection(connection: any): boolean {
  if (!connection.status || connection.status === 'error') return true;
  if (!connection.lastTested) return true;
  
  // Re-verify if last test was more than 1 hour ago
  const lastTested = connection.lastTested instanceof Date 
    ? connection.lastTested 
    : new Date(connection.lastTested);
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return lastTested < oneHourAgo;
}

// Check if sheet metadata needs refresh
export function shouldRefreshSheetMetadata(database: any): boolean {
  if (!database.availableSheetNames || database.availableSheetNames.length === 0) return true;
  if (!database.lastTested) return true;
  
  // Refresh if last update was more than 24 hours ago
  const lastTested = database.lastTested instanceof Date 
    ? database.lastTested 
    : new Date(database.lastTested);
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return lastTested < twentyFourHoursAgo;
}

// Clean console logging utility
export class Logger {
  private static isDebugMode = process.env.NODE_ENV === 'development';
  private static suppressedMessages = new Set<string>();

  static info(message: string, data?: any): void {
    if (this.isDebugMode) {
      console.log(message, data || '');
    }
  }

  static success(message: string, data?: any): void {
    console.log(`✅ ${message}`, data || '');
  }

  static warn(message: string, data?: any): void {
    console.warn(`⚠️ ${message}`, data || '');
  }

  static error(message: string, error?: any): void {
    console.error(`❌ ${message}`, error || '');
  }

  static debug(message: string, data?: any): void {
    if (this.isDebugMode) {
      console.debug(`🔍 ${message}`, data || '');
    }
  }

  // Only log once for repeated operations
  static infoOnce(key: string, message: string, data?: any): void {
    if (!this.suppressedMessages.has(key)) {
      this.info(message, data);
      this.suppressedMessages.add(key);
    }
  }

  static clearSuppressed(): void {
    this.suppressedMessages.clear();
  }
}

// Backend health check with caching
export async function checkBackendHealth(baseUrl: string = 'http://localhost:3001'): Promise<boolean> {
  const cacheKey = 'backend_health';
  
  // Check cache first (5 minute TTL)
  if (sessionCache.has(cacheKey)) {
    return sessionCache.get(cacheKey);
  }

  try {
    const response = await fetch(`${baseUrl}/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const isHealthy = response.ok;
    sessionCache.set(cacheKey, isHealthy, 5); // Cache for 5 minutes
    
    if (!isHealthy) {
      Logger.warn('Backend service is not responding');
    }
    
    return isHealthy;
  } catch (error) {
    Logger.warn('Backend offline. Falling back to public API');
    sessionCache.set(cacheKey, false, 1); // Cache failure for 1 minute
    return false;
  }
}

// Persistent storage utilities
export class PersistentCache {
  static set(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      Logger.warn('Failed to save to localStorage', error);
    }
  }

  static get(key: string, maxAgeMinutes: number = 60): any | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const ageMinutes = (Date.now() - parsed.timestamp) / (1000 * 60);
      
      if (ageMinutes > maxAgeMinutes) {
        localStorage.removeItem(key);
        return null;
      }
      
      return parsed.data;
    } catch (error) {
      Logger.warn('Failed to read from localStorage', error);
      return null;
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      Logger.warn('Failed to remove from localStorage', error);
    }
  }

  static clear(): void {
    try {
      Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      Logger.warn('Failed to clear localStorage', error);
    }
  }
}

// Utility to clear all caches (useful for troubleshooting)
export function clearAllCaches(): void {
  sessionCache.clear();
  PersistentCache.clear();
  Logger.success('All caches cleared');
}

// Utility to get cache status
export function getCacheStatus(): {
  sessionCacheSize: number;
  persistentCacheKeys: string[];
} {
  const persistentKeys = Object.values(CACHE_KEYS).filter(key => {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  });

  return {
    sessionCacheSize: (sessionCache as any).cache.size,
    persistentCacheKeys: persistentKeys
  };
}
