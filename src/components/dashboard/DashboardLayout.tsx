import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { StatsOverview } from "./StatsOverview";
import { RevenueChart } from "./RevenueChart";
import { PerformanceIndicators } from "./PerformanceIndicators";
import { TurnoverActivityCard } from "./TurnoverActivityCard";
import { BookingStatusActivityCard } from "./BookingStatusActivityCard";
import { BookingTypesActivityCard } from "./BookingTypesActivityCard";

import { DateRangeFilter } from "./DateRangeFilter";
import { createDashboardAPI, transformToDashboardData } from "@/utils/googleSheets";
import { fetchRealDashboardData } from "@/utils/realSheetsDataService";
import { User } from "@/utils/usersData";
import { logger, startGroup, endGroup } from "@/utils/logger";

interface DashboardData {
  revenue: { month: string; value: number; growth: number }[];
  users: { date: string; active: number; new: number; retention: number }[];
  conversion: { stage: string; users: number; rate: number }[];
  performance: {
    serverUptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
  stats: {
    totalRevenue: number;
    totalUsers: number;
    conversionRate: number;
    avgOrderValue: number;
    totalReviews: number;
    reviewsByStatus: { [status: string]: number };
    revenueByStatus: { [status: string]: number };
    acquisitionChannels: { [channel: string]: string };
    natureBooking: { [nature: string]: string };
    locationData: { name: string; value: number; percentage: number; color: string }[];
    acquisitionPieData: { name: string; value: number; percentage: number; color: string }[];
    naturePieData: { name: string; value: number; percentage: number; color: string }[];
  };
  recordCount: number;
  dataSource: 'google_sheets' | 'mock_data';
}

interface DashboardLayoutProps {
  user?: User;
  onNavigateHome?: () => void;
  onNavigateUsers?: () => void;
  onLogout?: () => void;
  onDataUpdate?: (data: { dataSource: 'google_sheets' | 'mock_data'; recordCount?: number; lastUpdated: Date; businessHealth?: number }) => void;
}

export function DashboardLayout({ user, onNavigateHome, onNavigateUsers, onLogout, onDataUpdate }: DashboardLayoutProps) {
  // State management
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<string>('this-month');
  
  // Refs to prevent infinite loops and track auto-refresh
  const initialLoadRef = useRef(false);
  const dataUpdateRef = useRef(false);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<{ start: string; end: string }>({ start: '', end: '' });

  // Get user's allowed cards - memoized to prevent recalculation on every render
  const allowedCards = useMemo(() => {
    startGroup('User Permission Check');
    
    try {
      // Admin users can see all cards
      if (user?.Role === 'Admin') {
        logger.info(`Admin user detected, showing all cards for: ${user.Name}`);
        return [
          'ConnectionStatus', 
          'StatsOverview', 
          'RevenueChart', 
          'PerformanceIndicators',
          'TurnoverActivityCard',
          'BookingStatusActivityCard',
          'BookingTypesActivityCard'
        ];
      }
      
      if (!user?.Cards) {
        logger.warn('No cards found for user:', user);
        return ['ConnectionStatus', 'StatsOverview'];
      }
      
      const cards = user.Cards.split(',').map(card => card.trim());
      logger.info(`User cards for ${user.Name}:`, cards);
      
      // Special debugging for newrec user
      if (user?.Name?.toLowerCase().includes('newrec')) {
        logger.debug('🔍 NEWREC USER DEBUG:');
        logger.debug('🔍 Original Cards string:', user.Cards);
        logger.debug('🔍 Parsed cards array:', cards);
        logger.debug('🔍 ConnectionStatus check:', cards.includes('ConnectionStatus'));
        logger.debug('🔍 StatsOverview check:', cards.includes('StatsOverview'));
      }
      
      return cards;
    } finally {
      endGroup();
    }
  }, [user?.Role, user?.Name, user?.Cards]); // Only recalculate when user role or cards change

  // Function to fetch data from Google Sheets
  const fetchData = useCallback(async (startDate?: string, endDate?: string): Promise<DashboardData> => {
    return logger.operation<Promise<DashboardData>>(`Fetching dashboard data (${startDate || 'all'} to ${endDate || 'all'})`, async () => {
      try {
        // Try to fetch real data using our new service
        // Only create dateRange if both dates are provided and not empty
        const dateRange = (startDate && startDate.trim() && endDate && endDate.trim()) 
          ? { start: startDate, end: endDate } 
          : undefined;
        
        logger.info(`🔍 Date range for real data fetch:`, dateRange ? `${dateRange.start} to ${dateRange.end}` : 'NO FILTER (ALL DATA)');
        
        const realData = await fetchRealDashboardData(dateRange);
        
        logger.success('Successfully fetched REAL data from Google Sheets');
        logger.info(`📊 Real data summary: Revenue=${realData.totalRevenue}, Records=${realData.recordCount}`);
        
        // Transform real data to dashboard format
        return {
          revenue: [
            { month: "Jan", value: Math.round(realData.totalRevenue * 0.08), growth: 12 },
            { month: "Feb", value: Math.round(realData.totalRevenue * 0.09), growth: 15 },
            { month: "Mar", value: Math.round(realData.totalRevenue * 0.07), growth: -8 },
            { month: "Apr", value: Math.round(realData.totalRevenue * 0.10), growth: 27 },
            { month: "May", value: Math.round(realData.totalRevenue * 0.11), growth: 13 },
            { month: "Jun", value: Math.round(realData.totalRevenue * 0.12), growth: 9 },
            { month: "Jul", value: Math.round(realData.totalRevenue * 0.13), growth: 9 },
            { month: "Aug", value: Math.round(realData.totalRevenue * 0.12), growth: -4 },
            { month: "Sep", value: Math.round(realData.totalRevenue * 0.14), growth: 10 },
            { month: "Oct", value: Math.round(realData.totalRevenue * 0.15), growth: 8 },
            { month: "Nov", value: Math.round(realData.totalRevenue * 0.16), growth: 7 },
            { month: "Dec", value: Math.round(realData.totalRevenue * 0.17), growth: 7 }
          ],
          users: realData.locationData.map(location => ({
            date: location.name,
            active: Math.round(location.value / 100), // Convert revenue to user count estimate
            new: Math.round(Math.random() * 25) + 10,
            retention: Math.round(Math.random() * 10) + 85
          })),
          conversion: [
            { stage: "Inquiries", users: Math.round(realData.totalUsers * 1.4), rate: 100 },
            { stage: "Confirmed", users: Math.round(realData.totalUsers * 1.2), rate: 85 },
            { stage: "Completed", users: realData.totalUsers, rate: 90 },
            { stage: "Paid", users: Math.round(realData.totalUsers * 0.95), rate: 94 },
            { stage: "Rated", users: Math.round(realData.totalUsers * 0.8), rate: 80 }
          ],
          performance: {
            serverUptime: 94.2,
            responseTime: realData.avgOrderValue,
            errorRate: 8.5,
            throughput: 23.4
          },
          stats: {
            totalRevenue: realData.totalRevenue, // 🎯 REAL DATA FROM GOOGLE SHEETS
            totalUsers: realData.totalUsers,     // 🎯 REAL DATA FROM GOOGLE SHEETS  
            conversionRate: realData.conversionRate || 76.5,
            avgOrderValue: realData.avgOrderValue,
            totalReviews: realData.totalReviews,
            reviewsByStatus: { 'Completed': Math.round(realData.totalReviews * 0.8), 'Confirmed': Math.round(realData.totalReviews * 0.15), 'Canceled': Math.round(realData.totalReviews * 0.05) },
            revenueByStatus: { 'Completed': Math.round(realData.totalRevenue * 0.85), 'Confirmed': Math.round(realData.totalRevenue * 0.10), 'Canceled': Math.round(realData.totalRevenue * 0.05) },
            acquisitionChannels: { 'Direct': '45%', 'Social Media': '30%', 'Referral': '15%', 'Other': '10%' },
            natureBooking: { 'Online': '60%', 'Phone': '25%', 'Walk-in': '15%' },
            locationData: realData.locationData, // 🎯 REAL DATA FROM GOOGLE SHEETS
            acquisitionPieData: [
              { name: 'Direct', value: 45, percentage: 45, color: '#8884d8' },
              { name: 'Social Media', value: 30, percentage: 30, color: '#82ca9d' },
              { name: 'Referral', value: 15, percentage: 15, color: '#ffc658' },
              { name: 'Other', value: 10, percentage: 10, color: '#ff7300' }
            ],
            naturePieData: [
              { name: 'Online', value: 60, percentage: 60, color: '#8884d8' },
              { name: 'Phone', value: 25, percentage: 25, color: '#82ca9d' },
              { name: 'Walk-in', value: 15, percentage: 15, color: '#ffc658' }
            ]
          },
          recordCount: realData.recordCount,
          dataSource: realData.dataSource
        };
      } catch (error) {
        logger.warn('Failed to fetch real data, falling back to mock data:', error);
        
        // Fallback to mock data if Google Sheets fails
        return {
          revenue: [
            { month: "Jan", value: 45000, growth: 12 },
            { month: "Feb", value: 52000, growth: 15 },
            { month: "Mar", value: 48000, growth: -8 },
            { month: "Apr", value: 61000, growth: 27 },
            { month: "May", value: 69000, growth: 13 },
            { month: "Jun", value: 75000, growth: 9 },
            { month: "Jul", value: 82000, growth: 9 },
            { month: "Aug", value: 79000, growth: -4 },
            { month: "Sep", value: 87000, growth: 10 },
            { month: "Oct", value: 94000, growth: 8 },
            { month: "Nov", value: 101000, growth: 7 },
            { month: "Dec", value: 108000, growth: 7 }
          ],
          users: [
            { date: "Location A", active: 15420, new: 12, retention: 87 },
            { date: "Location B", active: 16100, new: 18, retention: 89 },
            { date: "Location C", active: 15800, new: 15, retention: 85 },
            { date: "Location D", active: 17200, new: 22, retention: 91 },
            { date: "Location E", active: 18500, new: 16, retention: 88 },
            { date: "Location F", active: 17900, new: 19, retention: 86 },
            { date: "Location G", active: 19300, new: 25, retention: 92 }
          ],
          conversion: [
            { stage: "Inquiries", users: 1000, rate: 100 },
            { stage: "Confirmed", users: 850, rate: 85 },
            { stage: "Completed", users: 765, rate: 90 },
            { stage: "Paid", users: 720, rate: 94 },
            { stage: "Rated", users: 580, rate: 80 }
          ],
          performance: {
            serverUptime: 94.2, // Payment completion rate
            responseTime: 275, // Average order value
            errorRate: 8.5, // Cancellation rate
            throughput: 23.4 // Up-selling rate
          },
          stats: {
            totalRevenue: 847000,
            totalUsers: 1250, // Unique clients
            conversionRate: 76.5, // Booking completion rate
            avgOrderValue: 275.50,
            totalReviews: 580,
            reviewsByStatus: { 'Completed': 450, 'Confirmed': 100, 'Canceled': 30 },
            revenueByStatus: { 'Completed': 720000, 'Confirmed': 80000, 'Canceled': 47000 },
            acquisitionChannels: { 'Direct': '45%', 'Social Media': '30%', 'Referral': '15%', 'Other': '10%' },
            natureBooking: { 'Online': '60%', 'Phone': '25%', 'Walk-in': '15%' },
            locationData: [
              { name: 'Location A', value: 250000, percentage: 29.5, color: '#8884d8' },
              { name: 'Location B', value: 220000, percentage: 26.0, color: '#82ca9d' },
              { name: 'Location C', value: 180000, percentage: 21.3, color: '#ffc658' },
              { name: 'Location D', value: 150000, percentage: 17.7, color: '#ff7300' },
              { name: 'Location E', value: 47000, percentage: 5.5, color: '#ff0000' }
            ],
            acquisitionPieData: [
              { name: 'Direct', value: 45, percentage: 45, color: '#8884d8' },
              { name: 'Social Media', value: 30, percentage: 30, color: '#82ca9d' },
              { name: 'Referral', value: 15, percentage: 15, color: '#ffc658' },
              { name: 'Other', value: 10, percentage: 10, color: '#ff7300' }
            ],
            naturePieData: [
              { name: 'Online', value: 60, percentage: 60, color: '#8884d8' },
              { name: 'Phone', value: 25, percentage: 25, color: '#82ca9d' },
              { name: 'Walk-in', value: 15, percentage: 15, color: '#ffc658' }
            ]
          },
          recordCount: 1250,
          dataSource: 'mock_data'
        };
      }
    });
  }, []);

  // Load data function with smart caching to prevent unnecessary re-fetching
  const loadData = useCallback(async (startDate?: string, endDate?: string, forceRefresh = false) => {
    const currentParams = { start: startDate || '', end: endDate || '' };
    
    // Check if we should skip this fetch (same parameters and not forced)
    if (!forceRefresh && 
        currentParams.start === lastFetchParamsRef.current.start && 
        currentParams.end === lastFetchParamsRef.current.end &&
        data !== null) {
      logger.info('⏭️ Skipping fetch - same parameters and data already exists');
      return;
    }

    logger.info('🔄 Loading dashboard data...', { 
      startDate, 
      endDate, 
      forceRefresh,
      reason: forceRefresh ? 'Forced refresh' : 'New parameters or initial load'
    });

    setLoading(true);
    try {
      const dashboardData = await fetchData(startDate, endDate);
      setData(dashboardData);
      setLastUpdated(new Date());
      lastFetchParamsRef.current = currentParams; // Update last fetch params
      logger.success('✅ Dashboard data loaded successfully');
    } catch (error) {
      logger.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchData, data]);

  // Setup 30-minute auto-refresh timer
  const setupAutoRefresh = useCallback(() => {
    // Clear existing timer
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
    }

    // Set up 30-minute interval (1800000 ms)
    autoRefreshTimerRef.current = setInterval(() => {
      logger.info('⏰ Auto-refresh triggered (30 minutes elapsed)');
      loadData(dateRange.start, dateRange.end, true); // Force refresh
    }, 30 * 60 * 1000); // 30 minutes

    logger.info('⏰ Auto-refresh timer set for 30 minutes');
  }, [loadData, dateRange]);

  // Clean up auto-refresh timer on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        logger.info('🧹 Auto-refresh timer cleaned up');
      }
    };
  }, []);

  const handleRefresh = useCallback(() => {
    logger.info('🔄 Manual refresh triggered');
    loadData(dateRange.start, dateRange.end, true); // Force refresh
  }, [loadData, dateRange]);

  const handleFilterClick = useCallback(() => {
    setShowFilters(prevState => !prevState);
  }, []);

  const handleTimePeriodChange = useCallback((period: string) => {
    logger.info('📅 Time period changed:', period);
    setCurrentPeriod(period);
    let endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case 'today':
        // Set start and end to today's date range
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Beginning of today
        endDate.setHours(23, 59, 59, 999); // End of today
        break;
      case 'this-month':
        // Full current month - first day to last day
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        // Last day of current month
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last-month':
        // Full previous month
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        // Last day of previous month
        endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this-year':
        // First day of current year to today
        startDate = new Date(endDate.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'all':
        logger.info('📊 Loading ALL data (no date filter)');
        setDateRange({ start: '', end: '' }); // Clear date range for "all"
        loadData('', '', true); // Force refresh for filter change
        return;
      default:
        // Default to last 90 days
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    // Update dateRange state to keep it in sync - use local date format to avoid timezone issues
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const newStartDate = formatLocalDate(startDate);
    const newEndDate = formatLocalDate(endDate);
    
    logger.info(`📅 Date range calculated: ${newStartDate} to ${newEndDate} for period "${period}"`);
    
    setDateRange({ start: newStartDate, end: newEndDate });
    loadData(newStartDate, newEndDate, true); // Force refresh for filter change
  }, [loadData]);

  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    logger.info('📅 Date range changed:', { startDate, endDate });
    // Update the dateRange state first
    setDateRange({ start: startDate, end: endDate });
    // Then load data with the new range (force refresh for filter change)
    loadData(startDate, endDate, true);
  }, [loadData]);

  // Debug helper to track component renders
  useEffect(() => {
    logger.debug("RENDERING DashboardLayout...");
  }, []);
  
  // Load initial data only once on mount and setup auto-refresh
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      logger.info('🚀 Initial dashboard load triggered - loading this month data by default');
      // Trigger this month filter instead of all data
      handleTimePeriodChange('this-month');
    }
  }, [handleTimePeriodChange]);

  // Notify parent component when data changes - with anti-loop protection
  useEffect(() => {
    // Skip if no data or no update function
    if (!data || !onDataUpdate) return;
    
    // Reset data update ref on new data
    const currentDataSource = data.dataSource;
    const currentRecordCount = data.recordCount;
    
    // Debug to track effect firing
    logger.debug("Data update effect triggered", { 
      dataSource: currentDataSource, 
      recordCount: currentRecordCount 
    });
    
    // Use the ref to prevent multiple updates in the same render cycle
    if (!dataUpdateRef.current) {
      dataUpdateRef.current = true;
      
      // Calculate business health
      const businessHealth = Math.round(
        (data.performance.serverUptime + 
         (data.performance.responseTime / 500 * 100) + 
         (100 - data.performance.errorRate * 2) + 
         (data.performance.throughput * 2)) / 4
      );
      
      // Create a stable update object
      const updateData = {
        dataSource: currentDataSource,
        recordCount: currentRecordCount,
        lastUpdated, // Using the lastUpdated state but not including in deps
        businessHealth
      };
      
      // Log before sending update
      logger.debug("Sending dashboard update to parent", { 
        dataSource: updateData.dataSource,
        recordCount: updateData.recordCount, 
        businessHealth 
      });
      
      // Schedule the update for next tick to avoid render loop
      setTimeout(() => {
        onDataUpdate(updateData);
        // Reset the ref after a short delay to allow future updates
        setTimeout(() => {
          dataUpdateRef.current = false;
        }, 100);
      }, 0);
    }
  }, [data, onDataUpdate]); // Only depend on these two

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
      <div className="relative z-10 p-6 space-y-6">
        {showFilters && (
          <div className="flex justify-start">
            <DateRangeFilter onDateRangeChange={handleDateRangeChange} loading={loading} />
          </div>
        )}

        {loading && !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass h-48 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-6 animate-fade-in">
            {/* PerformanceIndicators (moved to top after header) */}
            {allowedCards.includes('PerformanceIndicators') && (
              <PerformanceIndicators 
                performance={data.performance} 
                stats={data.stats}
                dateRange={dateRange} 
                onTimePeriodChange={handleTimePeriodChange} 
                currentPeriod={currentPeriod} 
                isLoading={loading}
              />
            )}

            {/* StatsOverview */}
            {allowedCards.includes('StatsOverview') && (
              <StatsOverview 
                stats={data.stats} 
                dateRange={dateRange} 
                onTimePeriodChange={handleTimePeriodChange} 
                currentPeriod={currentPeriod} 
              />
            )}
            
            <div className="space-y-6">
              {/* Activity Cards Row - 3 cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* TurnoverActivityCard */}
                {allowedCards.includes('TurnoverActivityCard') && (
                  <TurnoverActivityCard 
                    data={{
                      locationData: data.stats.locationData,
                      totalTurnover: data.stats.totalRevenue
                    }}
                  />
                )}
                
                {/* BookingStatusActivityCard */}
                {allowedCards.includes('BookingStatusActivityCard') && (
                  <BookingStatusActivityCard 
                    data={{
                      revenueByStatus: data.stats.revenueByStatus,
                      totalRevenue: data.stats.totalRevenue
                    }}
                  />
                )}
                
                {/* BookingTypesActivityCard */}
                {allowedCards.includes('BookingTypesActivityCard') && (
                  <BookingTypesActivityCard 
                    data={{
                      naturePieData: data.stats.naturePieData,
                      totalBookings: data.stats.naturePieData.reduce((sum, type) => sum + type.value, 0)
                    }}
                  />
                )}
              </div>
              
              {/* RevenueChart */}
              {allowedCards.includes('RevenueChart') && (
                <RevenueChart data={data.revenue} />
              )}
            </div>
          </div>
        ) : (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted-foreground">Failed to load dashboard data</p>
          </div>
        )}
      </div>
    </div>
  );
}