/**
 * Logger utility for BookGX+ app
 * Provides consistent, environment-aware logging with visual grouping
 * Shows only essential messages in production, detailed logs in development
 */

// Debug mode - turn off in production
// Can be controlled via .env or automatically based on environment
const DEBUG = process.env.NODE_ENV !== 'production';

// Different log levels with their emoji indicators
type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

const LOG_ICONS = {
  debug: '🔍', // For detailed steps (development only)
  info: '📣',  // For general information (development only)
  success: '✅', // For successful operations (always show)
  warn: '⚠️',   // For warnings (always show)
  error: '❌'    // For errors (always show)
};

/**
 * Primary logger function with environment awareness
 * In production, shows only success, warnings and errors
 * In development, shows all log levels
 */
export function log(level: LogLevel, message: string, ...data: any[]): void {
  // Skip debug and info logs in production
  if (!DEBUG && (level === 'debug' || level === 'info')) return;
  
  // Format the log with emoji and message
  const formattedMessage = `${LOG_ICONS[level]} ${message}`;
  
  // Use appropriate console method based on level
  switch (level) {
    case 'debug':
    case 'info':
      console.log(formattedMessage, ...data);
      break;
    case 'success':
      console.log(formattedMessage, ...data);
      break;
    case 'warn':
      console.warn(formattedMessage, ...data);
      break;
    case 'error':
      console.error(formattedMessage, ...data);
      break;
  }
}

/**
 * Start a collapsed group in the console (debug mode only)
 */
export function startGroup(title: string, collapsed = true): void {
  if (!DEBUG) return;
  
  const method = collapsed ? console.groupCollapsed : console.group;
  method(`📦 ${title}`);
}

/**
 * End a console group (debug mode only)
 */
export function endGroup(): void {
  if (!DEBUG) return;
  console.groupEnd();
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
  // Development-only logs
  debug: (message: string, ...data: any[]) => log('debug', message, ...data),
  info: (message: string, ...data: any[]) => log('info', message, ...data),
  
  // Essential logs (always shown)
  success: (message: string, ...data: any[]) => log('success', message, ...data),
  warn: (message: string, ...data: any[]) => log('warn', message, ...data),
  error: (message: string, ...data: any[]) => log('error', message, ...data),
  
  // Operation-specific grouped logging (debug mode only)
  operation: <T>(operationName: string, fn: () => T | Promise<T>): T | Promise<T> => {
    if (!DEBUG) {
      return fn();
    }
    
    startGroup(operationName);
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => endGroup());
      } else {
        endGroup();
        return result;
      }
    } catch (error) {
      endGroup();
      throw error;
    }
  },
  
  // Firebase data loading (detailed in debug mode only)
  firebaseLoad: (entity: string, id: string, details: Record<string, any> = {}) => {
    if (!DEBUG) return;
    
    startGroup(`Firebase: Loading ${entity}`);
    logger.debug(`${entity} ID: ${id}`);
    
    // Log additional details
    Object.entries(details).forEach(([key, value]) => {
      logger.debug(`${key}: ${value}`);
    });
  },
  
  // Firebase data result (success message always shown)
  firebaseResult: (entity: string, count: number, success = true) => {
    if (DEBUG) {
      if (success) {
        logger.debug(`Loaded ${count} ${entity}${count === 1 ? '' : 's'} from Firebase`);
      } else {
        logger.debug(`Failed to load ${entity}s from Firebase`);
      }
      endGroup();
    }
    
    // Always show essential success/error messages in production
    if (success) {
      if (count > 0) {
        logger.success(`${entity[0].toUpperCase() + entity.slice(1)}${count === 1 ? '' : 's'} loaded successfully`);
      }
    } else {
      logger.error(`Failed to load ${entity}s`);
    }
  },

  // Connection operations
  connectionOperation: (operation: string, connectionName: string) => {
    if (DEBUG) {
      startGroup(`Connection: ${operation} - ${connectionName}`);
    }
  },

  // Connection results (always shown)
  connectionResult: (operation: string, connectionName: string, success = true, details: any = null) => {
    if (DEBUG) {
      endGroup();
    }
    
    if (success) {
      logger.success(`${operation} for "${connectionName}" completed successfully`, details);
    } else {
      logger.error(`${operation} for "${connectionName}" failed`, details);
    }
  },

  // Google Sheets operations
  sheetsOperation: (operation: string, sheetId: string, details: Record<string, any> = {}) => {
    if (!DEBUG) return;
    
    startGroup(`Google Sheets: ${operation}`);
    logger.debug(`Spreadsheet ID: ${sheetId}`);
    
    // Log additional details
    Object.entries(details).forEach(([key, value]) => {
      logger.debug(`${key}: ${value}`);
    });
  },

  // Google Sheets results
  sheetsResult: (operation: string, success = true, details: any = null) => {
    if (DEBUG) {
      endGroup();
    }
    
    if (success) {
      logger.success(`${operation} completed successfully`, details);
    } else {
      logger.error(`${operation} failed`, details);
    }
  }
};

export default logger;
