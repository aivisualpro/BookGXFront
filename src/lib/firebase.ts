import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  query, 
  where,
  orderBy,
  writeBatch,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { 
  hasDataChanged, 
  Logger, 
  sessionCache, 
  PersistentCache, 
  CACHE_KEYS 
} from "../utils/optimizations";
import { verifyFirebaseConfig } from "./env-verification";

// Verify environment variables are loaded
verifyFirebaseConfig();

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that all required environment variables are present
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  throw new Error('Missing required Firebase environment variables. Please check your .env file.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Remove undefined values from an object to prevent Firestore errors
 * Firestore doesn't allow undefined values, so we need to sanitize data before saving
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefined(value);
    }
  }
  return cleaned;
}

/**
 * Safely convert Firestore Timestamp to Date
 * Handles cases where the timestamp might be null, undefined, or not a proper Timestamp
 */
function safeTimestampToDate(timestamp: any): Date | undefined {
  if (!timestamp) return undefined;
  if (typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch (err) {
      console.warn('Failed to convert timestamp to date:', err);
      return undefined;
    }
  }
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // If it's a string or number, try to parse it
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

// Type definitions for Firestore documents
export interface FirestoreConnection {
  id: string;
  name: string;
  projectId: string;
  apiKey: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  region: 'saudi' | 'egypt';
  createdAt: Timestamp;
  lastTested?: Timestamp;
  lastUpdated?: Timestamp;
  errorMessage?: string;
}

export interface FirestoreDatabase {
  id: string;
  name: string;
  googleSheetId: string;
  status: 'connected' | 'loading' | 'testing' | 'error';
  createdAt: Timestamp;
  lastTested?: Timestamp;
  lastUpdated?: Timestamp;
  sheetsConnected: number;
  totalSheetsAvailable?: number;
  availableSheetNames?: string[];
  errorMessage?: string;
}

export interface FirestoreTable {
  id: string;
  name: string;
  sheetName: string;
  sheetId: string;
  status: 'connected' | 'loading' | 'error';
  createdAt?: Timestamp;
  lastUpdated?: Timestamp;
  totalHeaders?: number;
  headersConnected?: number;
  rowCount?: number;
  errorMessage?: string;
}

export interface FirestoreHeader {
  id: string;
  columnIndex: number;
  originalHeader: string;
  variableName: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  isEnabled: boolean;
  isKey: boolean;
  createdAt?: Timestamp;
  lastUpdated?: Timestamp;
}

// =============================================================================
// CONNECTION CRUD OPERATIONS
// =============================================================================

/**
 * Save or update a connection in Firestore with optimization
 */
export async function saveConnection(connection: any, region: 'saudi' | 'egypt'): Promise<void> {
  try {
    Logger.debug('Checking if connection needs saving:', connection.name);
    
    // Check if connection already exists and if data has changed
    const ref = doc(db, "connections", connection.id);
    const existingDoc = await getDoc(ref);
    
    const newConnectionData: FirestoreConnection = {
      ...connection,
      region,
      lastUpdated: Timestamp.now(),
      createdAt: connection.createdAt ? Timestamp.fromDate(connection.createdAt) : Timestamp.now()
    };

    if (existingDoc.exists()) {
      const existingData = existingDoc.data() as FirestoreConnection;
      
      // Only save if data has actually changed
      if (!hasDataChanged(newConnectionData, existingData)) {
        Logger.debug('Connection data unchanged, skipping save:', connection.name);
        return;
      }
    }

    const cleanedData = removeUndefined(newConnectionData);
    await setDoc(ref, cleanedData);
    
    Logger.success(`Connection saved: ${connection.name}`);
    
    // Clear relevant caches
    sessionCache.clear(`connections_${region}`);
    PersistentCache.remove(CACHE_KEYS.CONNECTION_STATUS);
    
  } catch (err) {
    Logger.error("Error saving connection:", err);
    throw err;
  }
}

/**
 * Load all connections for a specific region with caching
 */
export async function loadConnections(region: 'saudi' | 'egypt'): Promise<any[]> {
  try {
    const cacheKey = `connections_${region}`;
    
    // Check session cache first
    if (sessionCache.has(cacheKey)) {
      Logger.debug(`Loading connections from cache: ${region}`);
      return sessionCache.get(cacheKey);
    }
    
    Logger.debug(`Loading connections from Firebase: ${region}`);
    
    const connectionsQuery = query(
      collection(db, "connections"),
      where("region", "==", region)
    );
    
    const snapshot = await getDocs(connectionsQuery);
    const connections = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreConnection;
      return {
        ...data,
        createdAt: safeTimestampToDate(data.createdAt) || new Date(),
        lastTested: safeTimestampToDate(data.lastTested),
        lastUpdated: safeTimestampToDate(data.lastUpdated)
      };
    });
    
    // Cache for 10 minutes
    sessionCache.set(cacheKey, connections, 10);
    
    Logger.success(`Loaded ${connections.length} connections for ${region}`);
    return connections;
  } catch (err) {
    Logger.error("Failed to load connections", err);
    return [];
  }
}

/**
 * Delete a connection and all its subcollections
 */
export async function deleteConnection(connectionId: string): Promise<void> {
  try {
    // First delete all subcollections (databases, tables, headers)
    await deleteConnectionSubcollections(connectionId);
    
    // Then delete the connection document
    const ref = doc(db, "connections", connectionId);
    await deleteDoc(ref);
  } catch (err) {
    console.error("❌ Error deleting connection:", err);
    throw err;
  }
}

/**
 * Delete all subcollections for a connection
 */
async function deleteConnectionSubcollections(connectionId: string): Promise<void> {
  try {
    // Get all databases
    const databasesSnapshot = await getDocs(collection(db, `connections/${connectionId}/databases`));
    
    for (const databaseDoc of databasesSnapshot.docs) {
      const databaseId = databaseDoc.id;
      
      // Get all tables for this database
      const tablesSnapshot = await getDocs(collection(db, `connections/${connectionId}/databases/${databaseId}/tables`));
      
      for (const tableDoc of tablesSnapshot.docs) {
        const tableId = tableDoc.id;
        
        // Get all headers for this table
        const headersSnapshot = await getDocs(collection(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`));
        
        // Delete all headers
        for (const headerDoc of headersSnapshot.docs) {
          await deleteDoc(headerDoc.ref);
        }
        
        // Delete the table
        await deleteDoc(tableDoc.ref);
      }
      
      // Delete the database
      await deleteDoc(databaseDoc.ref);
    }
  } catch (err) {
    console.error("❌ Error deleting connection subcollections:", err);
  }
}

// =============================================================================
// DATABASE CRUD OPERATIONS
// =============================================================================

/**
 * Save or update a database in Firestore with optimization
 */
export async function saveDatabase(connectionId: string, database: any): Promise<void> {
  try {
    Logger.debug('Checking if database needs saving:', database.name);
    
    // Check if database already exists and if data has changed
    const ref = doc(db, `connections/${connectionId}/databases`, database.id);
    const existingDoc = await getDoc(ref);
    
    const newDatabaseData: FirestoreDatabase = {
      ...database,
      lastUpdated: Timestamp.now(),
      createdAt: database.createdAt ? Timestamp.fromDate(database.createdAt) : Timestamp.now()
    };

    if (existingDoc.exists()) {
      const existingData = existingDoc.data() as FirestoreDatabase;
      
      // Only save if data has actually changed
      if (!hasDataChanged(newDatabaseData, existingData)) {
        Logger.debug('Database data unchanged, skipping save:', database.name);
        return;
      }
    }

    const cleanedData = removeUndefined(newDatabaseData);
    await setDoc(ref, cleanedData);
    
    Logger.success(`Database saved: ${database.name}`);
    
    // Clear relevant caches
    sessionCache.clear(`databases_${connectionId}`);
    
  } catch (err) {
    Logger.error("Error saving database:", err);
    throw err;
  }
}

/**
 * Load all databases for a connection with caching
 */
export async function loadDatabases(connectionId: string): Promise<any[]> {
  try {
    const cacheKey = `databases_${connectionId}`;
    
    // Check session cache first
    if (sessionCache.has(cacheKey)) {
      Logger.debug(`Loading databases from cache: ${connectionId}`);
      return sessionCache.get(cacheKey);
    }
    
    Logger.debug(`Loading databases from Firebase: ${connectionId}`);
    
    const snapshot = await getDocs(collection(db, `connections/${connectionId}/databases`));
    const databases = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreDatabase;
      return {
        ...data,
        createdAt: safeTimestampToDate(data.createdAt) || new Date(),
        lastTested: safeTimestampToDate(data.lastTested),
        lastUpdated: safeTimestampToDate(data.lastUpdated)
      };
    });
    
    // Cache for 10 minutes
    sessionCache.set(cacheKey, databases, 10);
    
    Logger.success(`Loaded ${databases.length} databases for connection`);
    return databases;
  } catch (err) {
    Logger.error("Failed to load databases", err);
    return [];
  }
}

/**
 * Delete a database and all its subcollections
 */
export async function deleteDatabase(connectionId: string, databaseId: string): Promise<void> {
  try {
    
    // First delete all subcollections (tables, headers)
    await deleteDatabaseSubcollections(connectionId, databaseId);
    
    // Then delete the database document
    const ref = doc(db, `connections/${connectionId}/databases`, databaseId);
    await deleteDoc(ref);
  } catch (err) {
    console.error("❌ Error deleting database:", err);
    throw err;
  }
}

/**
 * Delete all subcollections for a database
 */
async function deleteDatabaseSubcollections(connectionId: string, databaseId: string): Promise<void> {
  try {
    // Get all tables
    const tablesSnapshot = await getDocs(collection(db, `connections/${connectionId}/databases/${databaseId}/tables`));
    
    for (const tableDoc of tablesSnapshot.docs) {
      const tableId = tableDoc.id;
      
      // Get all headers for this table
      const headersSnapshot = await getDocs(collection(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`));
      
      // Delete all headers
      for (const headerDoc of headersSnapshot.docs) {
        await deleteDoc(headerDoc.ref);
      }
      
      // Delete the table
      await deleteDoc(tableDoc.ref);
    }
  } catch (err) {
    console.error("❌ Error deleting database subcollections:", err);
  }
}

// =============================================================================
// TABLE CRUD OPERATIONS
// =============================================================================

/**
 * Save or update a table in Firestore with optimization
 */
export async function saveTable(connectionId: string, databaseId: string, table: any): Promise<void> {
  try {
    Logger.debug('Checking if table needs saving:', table.name);
    
    // Check if table already exists and if data has changed
    const ref = doc(db, `connections/${connectionId}/databases/${databaseId}/tables`, table.id);
    const existingDoc = await getDoc(ref);
    
    const newTableData: FirestoreTable = {
      ...table,
      lastUpdated: Timestamp.now(),
      createdAt: table.createdAt ? Timestamp.fromDate(table.createdAt) : Timestamp.now()
    };

    if (existingDoc.exists()) {
      const existingData = existingDoc.data() as FirestoreTable;
      
      // Only save if data has actually changed
      if (!hasDataChanged(newTableData, existingData)) {
        Logger.debug('Table data unchanged, skipping save:', table.name);
        return;
      }
    }

    const cleanedData = removeUndefined(newTableData);
    await setDoc(ref, cleanedData);
    
    Logger.success(`Table saved: ${table.name}`);
    
    // Clear relevant caches
    sessionCache.clear(`tables_${connectionId}_${databaseId}`);
    
  } catch (err) {
    Logger.error("Error saving table:", err);
    throw err;
  }
}

/**
 * Load all tables for a database
 */
export async function loadTables(connectionId: string, databaseId: string): Promise<any[]> {
  try {
    
    const snapshot = await getDocs(collection(db, `connections/${connectionId}/databases/${databaseId}/tables`));
    const tables = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreTable;
      return {
        ...data,
        createdAt: safeTimestampToDate(data.createdAt),
        lastUpdated: safeTimestampToDate(data.lastUpdated)
      };
    });
    
    return tables;
  } catch (err) {
    console.error("❌ Error loading tables:", err);
    return [];
  }
}

/**
 * Delete a table and all its headers
 */
export async function deleteTable(connectionId: string, databaseId: string, tableId: string): Promise<void> {
  try {
    
    // First delete all headers
    const headersSnapshot = await getDocs(collection(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`));
    for (const headerDoc of headersSnapshot.docs) {
      await deleteDoc(headerDoc.ref);
    }
    
    // Then delete the table document
    const ref = doc(db, `connections/${connectionId}/databases/${databaseId}/tables`, tableId);
    await deleteDoc(ref);
  } catch (err) {
    console.error("❌ Error deleting table:", err);
    throw err;
  }
}

// =============================================================================
// HEADER CRUD OPERATIONS
// =============================================================================

/**
 * Save or update headers for a table in Firestore with optimization and handle deletions
 */
export async function saveHeaders(connectionId: string, databaseId: string, tableId: string, headers: any[]): Promise<void> {
  try {
    Logger.debug('Checking if headers need saving for table:', tableId);
    
    // Load existing headers to compare
    const existingHeaders = await loadHeaders(connectionId, databaseId, tableId);
    const existingHeadersMap = new Map(existingHeaders.map(h => [h.id, h]));
    const newHeaderIds = new Set(headers.map(h => h.id));
    
    // Find headers that need to be deleted (exist in Firebase but not in new headers array)
    const headersToDelete = existingHeaders.filter(header => !newHeaderIds.has(header.id));
    
    // Find headers that have changed or are new
    const changedHeaders = headers.filter(header => {
      const existing = existingHeadersMap.get(header.id);
      if (!existing) return true; // New header
      return hasDataChanged(header, existing);
    });
    
    // Check if there are any changes to process
    if (changedHeaders.length === 0 && headersToDelete.length === 0) {
      Logger.debug('No header changes or deletions detected, skipping save');
      return;
    }
    
    const promises = [];
    
    // Handle updates and new headers
    if (changedHeaders.length > 0) {
      const updatePromises = changedHeaders.map(header => {
        const headerData: FirestoreHeader = {
          ...header,
          lastUpdated: Timestamp.now(),
          createdAt: header.createdAt ? Timestamp.fromDate(header.createdAt) : Timestamp.now()
        };

        const cleanedData = removeUndefined(headerData);
        const ref = doc(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`, header.id);
        return setDoc(ref, cleanedData);
      });
      promises.push(...updatePromises);
      Logger.debug(`${changedHeaders.length} headers will be updated/added`);
    }
    
    // Handle deletions
    if (headersToDelete.length > 0) {
      const deletePromises = headersToDelete.map(header => {
        const ref = doc(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`, header.id);
        Logger.debug(`Deleting header: ${header.originalHeader} (ID: ${header.id})`);
        return deleteDoc(ref);
      });
      promises.push(...deletePromises);
      Logger.debug(`${headersToDelete.length} headers will be deleted`);
    }

    // Execute all operations
    await Promise.all(promises);
    
    let successMessage = '';
    if (changedHeaders.length > 0 && headersToDelete.length > 0) {
      successMessage = `${changedHeaders.length} headers updated/added and ${headersToDelete.length} headers deleted for table: ${tableId}`;
    } else if (changedHeaders.length > 0) {
      successMessage = `${changedHeaders.length} headers updated/added for table: ${tableId}`;
    } else if (headersToDelete.length > 0) {
      successMessage = `${headersToDelete.length} headers deleted for table: ${tableId}`;
    }
    
    Logger.success(successMessage);
    
    // Clear relevant caches
    sessionCache.clear(`headers_${connectionId}_${databaseId}_${tableId}`);
    
  } catch (err) {
    Logger.error("Error saving headers:", err);
    throw err;
  }
}

/**
 * Load all headers for a table with caching
 */
export async function loadHeaders(connectionId: string, databaseId: string, tableId: string): Promise<any[]> {
  try {
    const cacheKey = `headers_${connectionId}_${databaseId}_${tableId}`;
    
    // Check session cache first
    if (sessionCache.has(cacheKey)) {
      Logger.debug(`Loading headers from cache: ${tableId}`);
      return sessionCache.get(cacheKey);
    }
    
    Logger.debug('Loading headers from Firebase for table:', tableId);
    
    const snapshot = await getDocs(collection(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`));
    const headers = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreHeader;
      return {
        ...data,
        createdAt: safeTimestampToDate(data.createdAt),
        lastUpdated: safeTimestampToDate(data.lastUpdated)
      };
    });
    
    // Cache for 15 minutes
    sessionCache.set(cacheKey, headers, 15);
    
    Logger.success(`Loaded ${headers.length} headers for table: ${tableId}`);
    return headers;
  } catch (err) {
    Logger.error("Error loading headers:", err);
    return [];
  }
}

/**
 * Delete a specific header
 */
export async function deleteHeader(connectionId: string, databaseId: string, tableId: string, headerId: string): Promise<void> {
  try {
    Logger.debug(`Deleting header with ID: ${headerId} from table: ${tableId}`);
    
    const ref = doc(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`, headerId);
    await deleteDoc(ref);
    
    Logger.success(`Header deleted successfully: ${headerId}`);
    
    // Clear relevant caches
    sessionCache.clear(`headers_${connectionId}_${databaseId}_${tableId}`);
    
  } catch (err) {
    Logger.error("Error deleting header:", err);
    throw err;
  }
}

/**
 * Save spreadsheet data to Firebase for a specific table
 */
export async function saveSpreadsheetData(
  connectionId: string, 
  databaseId: string, 
  tableId: string, 
  data: any[], 
  headers: any[]
): Promise<void> {
  try {
    Logger.debug('Saving spreadsheet data to Firebase for table:', tableId);
    
    // Get enabled headers only
    const enabledHeaders = headers.filter(h => h.isEnabled);
    const keyHeader = headers.find(h => h.isKey);
    
    Logger.debug(`Processing ${data.length} rows with ${enabledHeaders.length} enabled headers`);
    
    if (!keyHeader) {
      throw new Error('No key header found. Please select a key column before syncing data.');
    }
    
    Logger.debug(`Using key column: ${keyHeader.originalHeader} (index: ${keyHeader.columnIndex})`);
    
    // Track document IDs to prevent duplicates within the same sync
    const documentIdTracker = new Map<string, number>();
    const duplicateKeyValues = new Set<string>();
    
    // Process and filter data based on enabled headers
    const filteredData = data.map((row, rowIndex) => {
      // Get the key value from the specified column
      const keyValue = row[keyHeader.columnIndex];
      
      if (!keyValue || String(keyValue).trim() === '') {
        Logger.warn(`Skipping row ${rowIndex + 1}: empty key value in column "${keyHeader.originalHeader}"`);
        return null; // Skip rows with empty key values
      }
      
      Logger.debug(`Processing row ${rowIndex + 1} with key value: "${keyValue}"`);
      
      // Clean the key value to make it a valid Firebase document ID
      let documentId = String(keyValue).trim();
      
      // Firebase document ID restrictions:
      // - Must not be empty
      // - Must not contain forward slashes (/)
      // - Must not solely consist of periods (.)
      // - Must not be longer than 1,500 bytes
      // - Must not start with '__' (reserved for Firebase)
      
      // Replace invalid characters and patterns
      documentId = documentId
        .replace(/\//g, '_slash_')          // Replace forward slashes
        .replace(/\./g, '_dot_')            // Replace periods
        .replace(/\s+/g, '_')               // Replace spaces with underscores
        .replace(/[^a-zA-Z0-9_-]/g, '_')    // Replace other invalid characters
        .replace(/_+/g, '_')                // Replace multiple underscores with single
        .replace(/^_|_$/g, '');             // Remove leading/trailing underscores
      
      // Ensure it doesn't start with __ (reserved by Firebase)
      if (documentId.startsWith('__')) {
        documentId = 'doc_' + documentId;
      }
      
      // Ensure it's not empty and not just periods
      if (!documentId || documentId === '' || /^\.+$/.test(documentId)) {
        documentId = `doc_${Date.now()}_${rowIndex}`;
      }
      
      // Limit length to 100 characters (well under Firebase's 1500 byte limit)
      documentId = documentId.substring(0, 100);
      
      // Final safety check - ensure it ends with alphanumeric if it got truncated
      if (documentId.endsWith('_')) {
        documentId = documentId.slice(0, -1) + 'x';
      }
      
      Logger.debug(`Original key: "${keyValue}" -> Document ID: "${documentId}"`);
      
      // Check for duplicate document IDs within this sync batch
      if (documentIdTracker.has(documentId)) {
        const previousRowIndex = documentIdTracker.get(documentId)!;
        Logger.warn(`Duplicate key detected! Row ${rowIndex + 1} has same key as row ${previousRowIndex + 1}: "${keyValue}" -> Document ID: "${documentId}"`);
        duplicateKeyValues.add(keyValue);
        
        // Append row index to make it unique for this sync
        documentId = `${documentId}_row${rowIndex}`;
        Logger.debug(`Modified duplicate to unique ID: "${documentId}"`);
      }
      
      // Track this document ID
      documentIdTracker.set(documentId, rowIndex);
      
      const processedRow: any = {
        id: documentId,
        originalKeyValue: keyValue, // Store the original key value
        rowIndex: rowIndex,
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now()
      };
      
      // Add data for each enabled header
      enabledHeaders.forEach(header => {
        const cellValue = row[header.columnIndex];
        let processedValue = cellValue;
        
        // Process value based on data type
        switch (header.dataType) {
          case 'number':
            processedValue = cellValue ? parseFloat(cellValue) : null;
            break;
          case 'date':
            if (cellValue) {
              try {
                processedValue = Timestamp.fromDate(new Date(cellValue));
              } catch {
                processedValue = cellValue; // Keep as string if date parsing fails
              }
            }
            break;
          case 'boolean':
            processedValue = cellValue ? 
              ['true', '1', 'yes', 'on'].includes(String(cellValue).toLowerCase()) : 
              false;
            break;
          default: // text
            processedValue = cellValue ? String(cellValue) : '';
        }
        
        processedRow[header.variableName] = processedValue;
      });
      
      return processedRow;
    }).filter(row => row !== null); // Remove null rows (empty key values)
    
    Logger.debug(`Filtered to ${filteredData.length} valid rows with non-empty key values`);
    
    // Report duplicate key statistics
    if (duplicateKeyValues.size > 0) {
      Logger.warn(`Found ${duplicateKeyValues.size} duplicate key values in the spreadsheet:`);
      duplicateKeyValues.forEach(key => {
        Logger.warn(`  - Duplicate key: "${key}"`);
      });
      Logger.info('Duplicate rows have been made unique by appending row numbers to their document IDs');
    }
    
    // Verify all document IDs are unique
    const uniqueDocIds = new Set(filteredData.map(row => row.id));
    if (uniqueDocIds.size !== filteredData.length) {
      throw new Error('Internal error: Document IDs are not unique after processing. This should not happen.');
    }
    
    Logger.success(`All ${filteredData.length} document IDs are verified unique`);
    
    // Save data in batches to avoid Firestore limits
    const batchSize = 450; // Firestore batch limit is 500, keeping some margin
    const batches: any[] = [];
    
    for (let i = 0; i < filteredData.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchData = filteredData.slice(i, i + batchSize);
      
      batchData.forEach(rowData => {
        const cleanedData = removeUndefined(rowData);
        // Use the processed key value as the document ID
        const ref = doc(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/data`, rowData.id);
        batch.set(ref, cleanedData, { merge: true }); // Use merge to update existing documents
      });
      
      batches.push(batch);
    }
    
    // Execute all batches
    await Promise.all(batches.map(batch => batch.commit()));
    
    Logger.success(`Successfully committed ${batches.length} batches to Firebase`);
    
    // Update table metadata with data info
    const tableRef = doc(db, `connections/${connectionId}/databases/${databaseId}/tables`, tableId);
    await updateDoc(tableRef, {
      dataRowCount: filteredData.length,
      dataHeaders: enabledHeaders.map(h => h.variableName),
      keyColumn: keyHeader.variableName,
      keyColumnOriginal: keyHeader.originalHeader,
      lastDataSync: Timestamp.now(),
      lastUpdated: Timestamp.now(),
      // Add sync statistics
      syncStats: {
        totalRowsProcessed: data.length,
        validRowsSaved: filteredData.length,
        skippedRows: data.length - filteredData.length,
        duplicateKeysFound: duplicateKeyValues.size,
        lastSyncDate: Timestamp.now()
      }
    });
    
    Logger.success(`Successfully saved ${filteredData.length} rows of spreadsheet data to Firebase using key column "${keyHeader.originalHeader}"`);
    
    if (duplicateKeyValues.size > 0) {
      Logger.info(`Sync completed with ${duplicateKeyValues.size} duplicate key values handled. Each duplicate was made unique with row number suffix.`);
    }
    
    // Clear relevant caches
    sessionCache.clear(`table_data_${connectionId}_${databaseId}_${tableId}`);
    
  } catch (err) {
    Logger.error("Error saving spreadsheet data:", err);
    throw err;
  }
}

/**
 * Load spreadsheet data from Firebase for a specific table
 */
export async function loadSpreadsheetData(
  connectionId: string, 
  databaseId: string, 
  tableId: string
): Promise<any[]> {
  try {
    const cacheKey = `table_data_${connectionId}_${databaseId}_${tableId}`;
    
    // Check session cache first
    if (sessionCache.has(cacheKey)) {
      Logger.debug('Loading spreadsheet data from cache');
      return sessionCache.get(cacheKey);
    }
    
    Logger.debug('Loading spreadsheet data from Firebase for table:', tableId);
    
    const dataRef = collection(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/data`);
    const snapshot = await getDocs(query(dataRef, orderBy('rowIndex', 'asc')));
    
    const data = snapshot.docs.map(doc => ({
      firestoreId: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      lastUpdated: doc.data().lastUpdated?.toDate?.() || new Date()
    }));
    
    // Cache for 5 minutes
    sessionCache.set(cacheKey, data, 5);
    
    Logger.success(`Loaded ${data.length} rows of spreadsheet data from Firebase`);
    return data;
    
  } catch (err) {
    Logger.error("Error loading spreadsheet data:", err);
    throw err;
  }
}

/**
 * Delete all spreadsheet data for a specific table
 */
export async function deleteSpreadsheetData(
  connectionId: string, 
  databaseId: string, 
  tableId: string
): Promise<void> {
  try {
    Logger.debug('Deleting all spreadsheet data for table:', tableId);
    
    const dataRef = collection(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/data`);
    const snapshot = await getDocs(dataRef);
    
    // Delete in batches
    const batchSize = 450;
    const batches: any[] = [];
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      batches.push(batch);
    }
    
    // Execute all batches
    await Promise.all(batches.map(batch => batch.commit()));
    
    // Update table metadata
    const tableRef = doc(db, `connections/${connectionId}/databases/${databaseId}/tables`, tableId);
    await updateDoc(tableRef, {
      dataRowCount: 0,
      dataHeaders: [],
      lastDataSync: null,
      lastUpdated: Timestamp.now()
    });
    
    Logger.success(`Deleted all spreadsheet data for table: ${tableId}`);
    
    // Clear relevant caches
    sessionCache.clear(`table_data_${connectionId}_${databaseId}_${tableId}`);
    
  } catch (err) {
    Logger.error("Error deleting spreadsheet data:", err);
    throw err;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Initialize Firebase collections with proper security rules
 */
export async function initializeFirebase(): Promise<void> {
  try {
    // Firebase initialized and ready
  } catch (err) {
    console.error("❌ Error initializing Firebase:", err);
  }
}

export default db;
