/**
 * Dashboard Data Source Configuration
 * This file handles the configuration for dashboard data sources
 */

// Configuration for Dashboard Firebase data source
let DASHBOARD_CONFIG = {
  connectionId: 'Saudi_main', // Default connection ID
  databaseId: 'main_BookingGXPlus', // Default database ID  
  tableId: 'BookingGXPlus_Bookings' // Default table ID for Dashboard/Bookings data
};

/**
 * Helper function to update the Firebase configuration for dashboard data
 * Call this function with your actual Firebase table IDs
 */
export function configureDashboardDataSource(connectionId: string, databaseId: string, tableId: string) {
  console.log('🔧 Updating dashboard data source configuration:');
  console.log('Connection ID:', connectionId);
  console.log('Database ID:', databaseId);
  console.log('Table ID:', tableId);
  
  DASHBOARD_CONFIG.connectionId = connectionId;
  DASHBOARD_CONFIG.databaseId = databaseId;
  DASHBOARD_CONFIG.tableId = tableId;
  
  console.log('✅ Dashboard configuration updated successfully');
}

/**
 * Helper function to get the current dashboard configuration
 */
export function getDashboardDataConfig() {
  return { ...DASHBOARD_CONFIG };
}
