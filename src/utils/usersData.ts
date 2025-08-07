import { loadSpreadsheetData, loadConnections, loadDatabases, loadTables } from '../lib/firebase';

export interface User {
  Name: string;
  Role: string;
  Password: string;
  Cards?: string; // Comma-separated list of cards user can access
}

// Configuration for Firebase data source
// You'll need to update these IDs based on your actual Firebase structure
let USERS_CONFIG = {
  connectionId: 'Saudi_BookGX_API', // Update this with your actual connection ID
  databaseId: 'BookGX_API_main_bookinggxplus_users_s', // Update this with your actual database ID  
  tableId: 'main_bookinggxplus_users_s_Users' // Update this with your actual table ID for Users
};

/**
 * Auto-detect the Users table by searching through connections/databases/tables
 */
async function autoDetectUsersTable(): Promise<{connectionId: string, databaseId: string, tableId: string} | null> {
  try {
    console.log('🔍 Auto-detecting Users table...');
    
    // Check both regions
    const regions: ('saudi' | 'egypt')[] = ['saudi', 'egypt'];
    
    for (const region of regions) {
      try {
        const connections = await loadConnections(region);
        console.log(`📋 Found ${connections.length} connections in ${region} region`);
        
        for (const connection of connections) {
          try {
            const databases = await loadDatabases(connection.id);
            console.log(`📋 Found ${databases.length} databases in connection ${connection.name}`);
            
            for (const database of databases) {
              try {
                const tables = await loadTables(connection.id, database.id);
                console.log(`📋 Found ${tables.length} tables in database ${database.name}`);
                
                // Look for tables with "user" in the name
                const userTables = tables.filter(table => 
                  table.name.toLowerCase().includes('user') || 
                  table.sheetName.toLowerCase().includes('user')
                );
                
                if (userTables.length > 0) {
                  const userTable = userTables[0]; // Take the first match
                  console.log('✅ Found potential Users table:', {
                    connection: connection.name,
                    database: database.name, 
                    table: userTable.name,
                    sheetName: userTable.sheetName
                  });
                  
                  return {
                    connectionId: connection.id,
                    databaseId: database.id,
                    tableId: userTable.id
                  };
                }
              } catch (tableError) {
                console.debug(`Could not load tables for database ${database.name}:`, tableError);
              }
            }
          } catch (dbError) {
            console.debug(`Could not load databases for connection ${connection.name}:`, dbError);
          }
        }
      } catch (connectionError) {
        console.debug(`Could not load connections for region ${region}:`, connectionError);
      }
    }
    
    console.log('⚠️ No Users table found via auto-detection');
    return null;
  } catch (error) {
    console.error('❌ Error during auto-detection:', error);
    return null;
  }
}

export async function fetchUsersData(): Promise<User[]> {
  try {
    console.log('🔥 Fetching users data from Firebase...');
    
    // Try auto-detection first
    const detectedConfig = await autoDetectUsersTable();
    if (detectedConfig) {
      console.log('✅ Auto-detected Users table configuration:', detectedConfig);
      // Update config with detected values
      USERS_CONFIG = detectedConfig;
    } else {
      console.log('⚠️ Using default configuration:', USERS_CONFIG);
    }
    
    console.log('📋 Final configuration:', USERS_CONFIG);
    
    // Static Super Admin (not stored in Firebase)
    const staticSuperAdmin: User = {
      Name: 'Adeel',
      Role: 'Super Admin',
      Password: 'Abc123***',
      Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators,FullAccess'
    };
    
    try {
      // Fetch data from Firebase using the loadSpreadsheetData function
      const firebaseData = await loadSpreadsheetData(
        USERS_CONFIG.connectionId,
        USERS_CONFIG.databaseId, 
        USERS_CONFIG.tableId
      );
      
      console.log('✅ Firebase data loaded:', firebaseData.length, 'records');
      if (firebaseData.length > 0) {
        console.log('📋 Sample Firebase record:', firebaseData[0]);
        console.log('📋 Available fields:', Object.keys(firebaseData[0]));
      }
      
      // Map Firebase data to User interface
      const users: User[] = firebaseData.map((record: any, index: number) => {
        // Try multiple field name variations for mapping
        const nameFields = ['name', 'Name', 'username', 'email', 'user_name', 'full_name'];
        const roleFields = ['role', 'Role', 'user_type', 'position', 'job_title'];
        const passwordFields = ['password', 'Password', 'pass', 'pwd'];
        const cardFields = ['cards', 'Cards', 'access_cards', 'permissions', 'access_level'];
        
        const getName = () => {
          for (const field of nameFields) {
            if (record[field]) return String(record[field]).trim();
          }
          return `User ${index + 1}`;
        };
        
        const getRole = () => {
          for (const field of roleFields) {
            if (record[field]) return String(record[field]).trim();
          }
          return 'User';
        };
        
        const getPassword = () => {
          for (const field of passwordFields) {
            if (record[field]) return String(record[field]).trim();
          }
          return '';
        };
        
        const getCards = () => {
          for (const field of cardFields) {
            if (record[field]) return String(record[field]).trim();
          }
          return getDefaultCardsForRole(getRole());
        };
        
        const user: User = {
          Name: getName(),
          Role: getRole(),
          Password: getPassword(),
          Cards: getCards()
        };
        
        // Debug first few users
        if (index < 3) {
          console.log(`👤 Mapped user ${index + 1}:`, user);
        }
        
        return user;
      });
      
      // Add static super admin to the beginning of the list
      const allUsers = [staticSuperAdmin, ...users];
      console.log('✅ Successfully mapped', users.length, 'users from Firebase + 1 static super admin');
      return allUsers;
      
    } catch (firebaseError) {
      console.warn('⚠️ Firebase data fetch failed, using static super admin + mock data:', firebaseError);
      // Even if Firebase fails, we still have the static super admin
      return [staticSuperAdmin, ...getMockUsers()];
    }
    
  } catch (error) {
    console.error('❌ Error in fetchUsersData:', error);
    console.log('🔄 Falling back to static super admin + mock data...');
    
    // Static Super Admin + Mock data fallback
    const staticSuperAdmin: User = {
      Name: 'Adeel',
      Role: 'Super Admin', 
      Password: 'Abc123***',
      Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators,FullAccess'
    };
    
    return [staticSuperAdmin, ...getMockUsers()];
  }
}

// Extract mock users into separate function for reusability
function getMockUsers(): User[] {
  return [
      { Name: 'adeel', Role: 'Admin', Password: '123', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'Abdul Hadi', Role: 'Admin', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'Yasser', Role: 'Admin', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'دينا', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'بشري', Role: 'Branch Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'anaml.rawda@gmail.com', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: '.jeddah Team', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'نظيرة', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'منسقة1', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'منسقة', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'مها', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'منسة', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'Alhnoaf', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'Rana', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'Francela', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'VANIA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Luana', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Israa', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Angham', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Jessica', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Thatiane', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'PAULA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'SARA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'GABRIELA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'GLEICE', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'VIVIANA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'ESRAA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'RAFAELA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'SOLANA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Samah', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'ANGAM', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'anaml.artist10@gmail.com', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'رغد', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'البندري', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'سلمي', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'رولا', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'رحمة', Role: 'Branch Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'شروق', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'الاء', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'روز', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'روضة', Role: 'Branch Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'رغدالعمري', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'لانا', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'بسمة', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'العنود', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'رنا', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'روان', Role: 'Branch Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'سعادة العملاء', Role: 'Customer Service', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'امل احمد', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'Raed', Role: 'Admin', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'Esraa Receiptionist', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'DR:ahmed', Role: 'Admin', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'Gehan', Role: 'Artist Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' }
    ];
  }

// Helper function to get default cards based on role
function getDefaultCardsForRole(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators';
    case 'branch manager':
      return 'ConnectionStatus,StatsOverview,RevenueChart';
    case 'sales officer':
      return 'ConnectionStatus,StatsOverview,RevenueChart';
    case 'artist manager':
      return 'ConnectionStatus,StatsOverview,RevenueChart';
    case 'receiptionist':
    case 'customer service':
    case 'artist':
      return 'ConnectionStatus,StatsOverview';
    default:
      return 'ConnectionStatus,StatsOverview';
  }
}

/**
 * Helper function to update the Firebase configuration for users data
 * Call this function with your actual Firebase table IDs
 */
export function configureUsersDataSource(connectionId: string, databaseId: string, tableId: string) {
  console.log('🔧 Updating users data source configuration:');
  console.log('Connection ID:', connectionId);
  console.log('Database ID:', databaseId);
  console.log('Table ID:', tableId);
  
  USERS_CONFIG.connectionId = connectionId;
  USERS_CONFIG.databaseId = databaseId;
  USERS_CONFIG.tableId = tableId;
  
  console.log('✅ Configuration updated successfully');
}

/**
 * Helper function to get the current configuration
 */
export function getUsersDataConfig() {
  return { ...USERS_CONFIG };
} 