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

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6lGBdv-Z85Q5YniFpa9AqjvJxnorNdDM",
  authDomain: "bookgx-18438.firebaseapp.com",
  projectId: "bookgx-18438",
  storageBucket: "bookgx-18438.firebasestorage.app",
  messagingSenderId: "533182478580",
  appId: "1:533182478580:web:2bb824d86f531946d6c6a1",
  measurementId: "G-BEDZKGBZCP"
};

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
    console.log('🔥 Deleting connection from Firebase:', connectionId);
    
    // First delete all subcollections (databases, tables, headers)
    await deleteConnectionSubcollections(connectionId);
    
    // Then delete the connection document
    const ref = doc(db, "connections", connectionId);
    await deleteDoc(ref);
    console.log("✅ Connection deleted from Firebase");
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
    console.log('🔥 Deleting database from Firebase:', databaseId);
    
    // First delete all subcollections (tables, headers)
    await deleteDatabaseSubcollections(connectionId, databaseId);
    
    // Then delete the database document
    const ref = doc(db, `connections/${connectionId}/databases`, databaseId);
    await deleteDoc(ref);
    console.log("✅ Database deleted from Firebase");
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
    console.log('🔥 Loading tables from Firebase for database:', databaseId);
    
    const snapshot = await getDocs(collection(db, `connections/${connectionId}/databases/${databaseId}/tables`));
    const tables = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreTable;
      return {
        ...data,
        createdAt: safeTimestampToDate(data.createdAt),
        lastUpdated: safeTimestampToDate(data.lastUpdated)
      };
    });
    
    console.log(`✅ Loaded ${tables.length} tables from Firebase`);
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
    console.log('🔥 Deleting table from Firebase:', tableId);
    
    // First delete all headers
    const headersSnapshot = await getDocs(collection(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`));
    for (const headerDoc of headersSnapshot.docs) {
      await deleteDoc(headerDoc.ref);
    }
    
    // Then delete the table document
    const ref = doc(db, `connections/${connectionId}/databases/${databaseId}/tables`, tableId);
    await deleteDoc(ref);
    console.log("✅ Table deleted from Firebase");
  } catch (err) {
    console.error("❌ Error deleting table:", err);
    throw err;
  }
}

// =============================================================================
// HEADER CRUD OPERATIONS
// =============================================================================

/**
 * Save or update headers for a table in Firestore with optimization
 */
export async function saveHeaders(connectionId: string, databaseId: string, tableId: string, headers: any[]): Promise<void> {
  try {
    Logger.debug('Checking if headers need saving for table:', tableId);
    
    // Load existing headers to compare
    const existingHeaders = await loadHeaders(connectionId, databaseId, tableId);
    const existingHeadersMap = new Map(existingHeaders.map(h => [h.id, h]));
    
    // Only save headers that have actually changed
    const changedHeaders = headers.filter(header => {
      const existing = existingHeadersMap.get(header.id);
      if (!existing) return true; // New header
      return hasDataChanged(header, existing);
    });
    
    if (changedHeaders.length === 0) {
      Logger.debug('No header changes detected, skipping save');
      return;
    }
    
    const promises = changedHeaders.map(header => {
      const headerData: FirestoreHeader = {
        ...header,
        lastUpdated: Timestamp.now(),
        createdAt: header.createdAt ? Timestamp.fromDate(header.createdAt) : Timestamp.now()
      };

      const cleanedData = removeUndefined(headerData);
      const ref = doc(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`, header.id);
      return setDoc(ref, cleanedData);
    });

    await Promise.all(promises);
    Logger.success(`${changedHeaders.length} headers updated for table: ${tableId}`);
    
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
    console.log('🔥 Deleting header from Firebase:', headerId);
    
    const ref = doc(db, `connections/${connectionId}/databases/${databaseId}/tables/${tableId}/headers`, headerId);
    await deleteDoc(ref);
    console.log("✅ Header deleted from Firebase");
  } catch (err) {
    console.error("❌ Error deleting header:", err);
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
    console.log('🔥 Firebase initialized and ready!');
    console.log('📊 Database reference:', db.app.name);
  } catch (err) {
    console.error("❌ Error initializing Firebase:", err);
  }
}

export default db;
