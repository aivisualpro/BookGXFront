// Google Sheets integration utility
import { getCountryApiConfig, getSheetConnection, createDynamicAPI } from './dynamicGoogleSheets';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetId?: string;
}

// Enhanced config with country support
export interface DynamicGoogleSheetsConfig {
  country: 'saudi' | 'egypt';
  apiName: string;
}

export class GoogleSheetsAPI {
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  /**
   * Fetch data from Google Sheets as CSV
   * @param sheetId Optional sheet ID, uses the configured one if not provided
   */
  async fetchCSVData(sheetId?: string): Promise<string> {
    const targetSheetId = sheetId || this.config.sheetId;
    
    // Correct Google Sheets CSV export URL format
    let url: string;
    if (targetSheetId) {
      url = `https://docs.google.com/spreadsheets/d/${this.config.spreadsheetId}/export?format=csv&gid=${targetSheetId}`;
    } else {
      url = `https://docs.google.com/spreadsheets/d/${this.config.spreadsheetId}/export?format=csv`;
    }

    console.log('Fetching from URL:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvData = await response.text();
      console.log('Fetched CSV data length:', csvData.length, 'characters');
      return csvData;
    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      throw error;
    }
  }

  /**
   * Parse CSV data into structured objects
   * @param csvData Raw CSV string
   * @param hasHeaders Whether the first row contains headers
   */
  parseCSV(csvData: string, hasHeaders: boolean = true): any[] {
    const lines = csvData.trim().split('\n');
    if (lines.length === 0) return [];

    console.log('Parsing CSV - Total lines found:', lines.length);

    const headers = hasHeaders ? lines[0].split(',').map(h => h.trim().replace(/"/g, '')) : null;
    const dataRows = hasHeaders ? lines.slice(1) : lines;

    console.log('Headers found:', headers);
    console.log('Data rows count:', dataRows.length);

    return dataRows.map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (headers) {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      } else {
        return values;
      }
    });
  }

  /**
   * Fetch and parse data in one call
   * @param sheetId Optional sheet ID
   * @param hasHeaders Whether the first row contains headers
   */
  async fetchParsedData(sheetId?: string, hasHeaders: boolean = true): Promise<any[]> {
    try {
      const csvData = await this.fetchCSVData(sheetId);
      const parsedData = this.parseCSV(csvData, hasHeaders);
      console.log('Successfully parsed data - Total rows:', parsedData.length);
      return parsedData;
    } catch (error) {
      console.error('Error fetching and parsing Google Sheets data:', error);
      throw error;
    }
  }
}

// Example usage for your specific Google Sheets (legacy)
export const createDashboardAPI = () => {
  return new GoogleSheetsAPI({
    spreadsheetId: '1O5UEZNHxVgJSJQ49qWvos0AYXqzh8EzFTxzkhY7tprM',
    sheetId: '1794173347'
  });
};

// Create dynamic dashboard API instance with country-specific configuration
export const createDynamicDashboardAPI = (country: 'saudi' | 'egypt' = 'saudi') => {
  try {
    return createDynamicAPI(country);
  } catch (error) {
    console.warn(`Failed to create dynamic API for ${country}, falling back to default:`, error);
    // Fallback to original API
    return createDashboardAPI();
  }
};

// Transform raw Google Sheets data to dashboard format
export const transformToDashboardData = (rawData: any[], startDate?: string, endDate?: string) => {
  console.log('=== TRANSFORMING DATA ===');
  console.log('Raw data received - Total rows:', rawData.length);
  console.log('First 3 rows:', rawData.slice(0, 3));
  
  if (!rawData || rawData.length === 0) {
    throw new Error('No data available');
  }

  // Filter data by date range if provided
  let filteredData = rawData;
  if (startDate || endDate) {
    filteredData = rawData.filter(row => {
      const bookingDate = new Date(row['Booking Date']);
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-12-31');
      return bookingDate >= start && bookingDate <= end;
    });
  }

  // Calculate revenue metrics
  console.log('=== REVENUE CALCULATION DEBUG ===');
  console.log('Total filtered data rows:', filteredData.length);
  
  let debugCount = 0;
  const totalRevenue = filteredData.reduce((sum, row) => {
    // Clean the Total Book value by removing commas and quotes, then parse
    const originalValue = row['Total Book'];
    const totalBookStr = String(originalValue || '0').replace(/[,'"]/g, '');
    const totalBook = parseFloat(totalBookStr) || 0;
    
    if (debugCount < 10) {
      console.log(`Row ${debugCount + 1}: Original="${originalValue}" → Cleaned="${totalBookStr}" → Parsed=${totalBook}`);
      debugCount++;
    }
    
    return sum + totalBook;
  }, 0);
  
  console.log('=== FINAL REVENUE CALCULATION ===');
  console.log('Total Revenue calculated:', totalRevenue);
  console.log('====================================');

  // Revenue by location
  const locationRevenue = filteredData.reduce((acc, row) => {
    const location = row['Location'] || 'Unknown';
    // Clean the Total Book value by removing commas and quotes, then parse
    const totalBookStr = String(row['Total Book'] || '0').replace(/[,'"]/g, '');
    const revenue = parseFloat(totalBookStr) || 0;
    acc[location] = (acc[location] || 0) + revenue;
    return acc;
  }, {} as Record<string, number>);

  // Location data for pie chart
  const locationColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
  const locationPieData = Object.entries(locationRevenue).map(([location, revenue], index) => ({
    name: location,
    value: revenue as number,
    percentage: Math.round(((revenue as number) / totalRevenue) * 100 * 100) / 100,
    color: locationColors[index % locationColors.length]
  })).sort((a, b) => b.value - a.value);

  // Client metrics - using saudi1_maindb_bookingx_name field
  const uniqueClients = new Set(filteredData.map(row => row['saudi1_maindb_bookingx_name'] || 'Unknown')).size;
  
  // Acquisition channel analysis ("How did you know us?")
  const acquisitionChannels = filteredData.reduce((acc, row) => {
    const channel = row['How did you know us ?'] || 'Unknown';
    acc[channel] = (acc[channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Nature Booking analysis (new vs returning)
  const natureBooking = filteredData.reduce((acc, row) => {
    const nature = row['Nature Booking'] || 'Unknown';
    acc[nature] = (acc[nature] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate percentages for acquisition channels
  const totalBookings = filteredData.length;
  const acquisitionPercentages = Object.entries(acquisitionChannels).reduce((acc, [channel, count]) => {
    acc[channel] = (((count as number) / totalBookings) * 100).toFixed(1);
    return acc;
  }, {} as Record<string, string>);
  
  // Calculate percentages for nature booking
  const naturePercentages = Object.entries(natureBooking).reduce((acc, [nature, count]) => {
    acc[nature] = (((count as number) / totalBookings) * 100).toFixed(1);
    return acc;
  }, {} as Record<string, string>);

  // Acquisition channels data for pie chart
  const acquisitionColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
  const acquisitionPieData = Object.entries(acquisitionChannels).map(([channel, count], index) => ({
    name: channel,
    value: count as number,
    percentage: Math.round(((count as number) / totalBookings) * 100 * 100) / 100,
    color: acquisitionColors[index % acquisitionColors.length]
  })).sort((a, b) => b.value - a.value);

  // Nature booking data for pie chart
  const natureColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
  const naturePieData = Object.entries(natureBooking).map(([nature, count], index) => ({
    name: nature,
    value: count as number,
    percentage: Math.round(((count as number) / totalBookings) * 100 * 100) / 100,
    color: natureColors[index % natureColors.length]
  })).sort((a, b) => b.value - a.value);

  console.log('Acquisition Channels:', acquisitionChannels);
  console.log('Nature Booking:', natureBooking);
  
  // Booking status analysis
  const bookingStatuses = filteredData.reduce((acc, row) => {
    const status = row['Booking Status'] || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Revenue breakdown by booking status
  const revenueByStatus = filteredData.reduce((acc, row) => {
    const status = row['Booking Status'] || 'Unknown';
    // Clean the Total Book value by removing commas and quotes, then parse
    const totalBookStr = String(row['Total Book'] || '0').replace(/[,'"]/g, '');
    const revenue = parseFloat(totalBookStr) || 0;
    acc[status] = (acc[status] || 0) + revenue;
    return acc;
  }, {} as Record<string, number>);

  // Payment methods breakdown
  const paymentMethods = {
    cash: filteredData.reduce((sum, row) => sum + (parseFloat(row['Cash']) || 0), 0),
    mada: filteredData.reduce((sum, row) => sum + (parseFloat(row['Mada']) || 0), 0),
    tabby: filteredData.reduce((sum, row) => sum + (parseFloat(row['Tabby']) || 0), 0),
    tamara: filteredData.reduce((sum, row) => sum + (parseFloat(row['Tamara']) || 0), 0),
    bankTransfer: filteredData.reduce((sum, row) => sum + (parseFloat(row['Bank Transfer']) || 0), 0),
  };

  // Monthly revenue trend
  const monthlyRevenue = filteredData.reduce((acc, row) => {
    const date = new Date(row['Booking Date']);
    if (isNaN(date.getTime())) return acc;
    
    const monthKey = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const revenue = parseFloat(row['Total Book']) || 0;
    
    if (!acc[monthKey]) {
      acc[monthKey] = { total: 0, bookings: 0 };
    }
    acc[monthKey].total += revenue;
    acc[monthKey].bookings += 1;
    return acc;
  }, {} as Record<string, { total: number; bookings: number }>);

  // Convert to array format for charts
  const revenueChartData = Object.entries(monthlyRevenue)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .slice(-12) // Last 12 months
    .map(([month, data], index, array) => {
      const currentData = data as { total: number; bookings: number };
      const prevData = index > 0 ? array[index - 1][1] as { total: number; bookings: number } : currentData;
      const growth = prevData.total > 0 ? ((currentData.total - prevData.total) / prevData.total) * 100 : 0;
      
      return {
        month: month.split(' ')[0], // Just month name
        value: Math.round(currentData.total),
        growth: Math.round(growth * 10) / 10,
        bookings: currentData.bookings
      };
    });

   // Location performance for user engagement chart (different from pie chart data)
  const locationChartData = Object.entries(locationRevenue)
    .slice(0, 7) // Top 7 locations
    .map(([location, revenue]) => {
      const locationBookings = filteredData.filter(row => row['Location'] === location).length;
      const avgValue = locationBookings > 0 ? (revenue as number) / locationBookings : 0;
      
      return {
        date: location,
        active: Math.round(revenue as number),
        new: locationBookings,
        retention: Math.round(avgValue * 100) / 100 // Average order value
      };
    });

  // Conversion funnel (booking process)
  const totalInquiries = filteredData.length;
  const confirmedBookings = filteredData.filter(row => row['Booking Status'] === 'Confirmed').length;
  const completedBookings = filteredData.filter(row => row['Booking Status'] === 'Completed').length;
  const paidBookings = filteredData.filter(row => parseFloat(row['Total Paid']) > 0).length;
  const totalReviews = filteredData.filter(row => row['Manager Rating'] || row['Client Review'] || row['Rating']).length;
  const ratedBookings = filteredData.filter(row => row['Manager Rating']).length;

  // Reviews breakdown by booking status
  const reviewsByStatus = filteredData.reduce((acc, row) => {
    const hasReview = row['Manager Rating'] || row['Client Review'] || row['Rating'];
    if (hasReview) {
      const status = row['Booking Status'] || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const conversionData = [
    { stage: "Inquiries", users: totalInquiries, rate: 100 },
    { stage: "Confirmed", users: confirmedBookings, rate: Math.round((confirmedBookings / totalInquiries) * 100) },
    { stage: "Completed", users: completedBookings, rate: Math.round((completedBookings / confirmedBookings) * 100) },
    { stage: "Paid", users: paidBookings, rate: Math.round((paidBookings / completedBookings) * 100) },
    { stage: "Rated", users: ratedBookings, rate: Math.round((ratedBookings / completedBookings) * 100) }
  ];

  // Performance indicators
  const canceledBookings = filteredData.filter(row => row['Booking Status'] === 'Canceled').length;
  const rescheduledBookings = filteredData.filter(row => row['Booking Status'] === 'Rescheduled').length;
  const upSellingSuccess = filteredData.filter(row => parseFloat(row['Total Book Plus']) > 0).length;

  const avgOrderValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const cancelationRate = totalBookings > 0 ? (canceledBookings / totalBookings) * 100 : 0;
  const upSellingRate = totalBookings > 0 ? (upSellingSuccess / totalBookings) * 100 : 0;
  const paymentCompletionRate = totalBookings > 0 ? (paidBookings / totalBookings) * 100 : 0;

  return {
    revenue: revenueChartData,
    users: locationChartData,
    conversion: conversionData,
    performance: {
      serverUptime: paymentCompletionRate, // Payment completion rate as uptime equivalent
      responseTime: Math.round(avgOrderValue), // Average order value as response time equivalent
      errorRate: Math.round(cancelationRate * 100) / 100, // Cancellation rate as error rate
      throughput: upSellingRate // Up-selling rate as throughput
    },
    stats: {
      totalRevenue: Math.round(totalRevenue),
      totalUsers: uniqueClients,
      conversionRate: Math.round((completedBookings / totalInquiries) * 100 * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalReviews,
      reviewsByStatus,
      revenueByStatus,
      acquisitionChannels: acquisitionPercentages,
      natureBooking: naturePercentages,
      locationData: locationPieData,
      acquisitionPieData: acquisitionPieData,
      naturePieData: naturePieData
    },
    recordCount: filteredData.length,
    dataSource: 'google_sheets' as const,
    // Additional business-specific data
    locationBreakdown: locationRevenue,
    paymentMethods,
    acquisitionChannels,
    bookingStatuses
  };
};

// Instructions for setting up Google Sheets integration:
/* 
To connect your Google Sheets:

1. Make sure your Google Sheet is publicly accessible:
   - Open your Google Sheet
   - Click "Share" button
   - Click "Change to anyone with the link"
   - Set permission to "Viewer"

2. Get your sheet URL components:
   - Spreadsheet ID: The long string in your URL between /d/ and /edit
   - Sheet ID (optional): The number after gid= in your URL

3. Update the data transformation:
   - Modify the transformToDashboardData function
   - Map your actual column names to the dashboard data structure
   - Handle data type conversions (strings to numbers, dates, etc.)

4. Test the integration:
   - Use the refresh button in the dashboard
   - Check browser console for any errors
   - Verify data is loading correctly

Example Google Sheets structure:
| Month | Revenue | Growth | Users | Signups | Conversion |
|-------|---------|--------|-------|---------|------------|
| Jan   | 45000   | 12     | 15420 | 1200    | 87         |
| Feb   | 52000   | 15     | 16100 | 1350    | 89         |
*/