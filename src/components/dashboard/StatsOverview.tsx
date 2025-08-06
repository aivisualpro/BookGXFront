import { Banknote, Users, TrendingUp, ShoppingCart, Star, MapPin, Calendar, Clock, CalendarDays, CalendarRange, CalendarCheck, Activity, Target, BarChart3, PieChart as PieChartIcon, Settings } from "lucide-react";
import { ResponsiveContainer } from 'recharts';
import { useState } from "react";

interface StatsOverviewProps {
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
  dateRange?: { start: string; end: string };
  onTimePeriodChange?: (period: string) => void;
  currentPeriod?: string;
}

export function StatsOverview({ stats, dateRange, onTimePeriodChange, currentPeriod }: StatsOverviewProps) {
  const getDateDisplayText = () => {
    switch (currentPeriod) {
      case 'today':
        return `Showing today's data (${new Date().toLocaleDateString()})`;
      case 'this-month':
        return `Showing this month's data (${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
      case 'last-month':
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return `Showing last month's data (${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
      case 'this-year':
        return `Showing this year's data (${new Date().getFullYear()})`;
      case 'all':
        return dateRange?.start && dateRange?.end 
          ? `Data From ${new Date(dateRange.start).toLocaleDateString()} and To ${new Date(dateRange.end).toLocaleDateString()}`
          : "Showing all data";
      default:
        return dateRange?.start && dateRange?.end 
          ? `Data showing from Date ${new Date(dateRange.start).toLocaleDateString()} and To ${new Date(dateRange.end).toLocaleDateString()} (${Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days)`
          : "Data showing from Date 5/5/2025 and To 8/3/2025 (90 days)";
    }
  };

  const handleTimePeriodChange = (period: string) => {
    if (onTimePeriodChange) {
      onTimePeriodChange(period);
    }
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: `${stats.totalRevenue.toLocaleString()}`,
      change: "+12.5%",
      changeType: "positive" as const,
      icon: Banknote,
      gradient: "bg-gradient-primary",
      glow: "glow-primary"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Regular stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isRevenue = stat.title === "Total Revenue";
          const isRevenueByStatus = stat.title === "Revenue by Booking Status";
          const isClients = stat.title === "Total Clients";
          const isLocation = stat.title === "Location Distribution";
          
          if (isRevenue) {
            // Skip the KPI Dashboard card - it's been removed
            return null;
          }

          if (isRevenueByStatus) {
            // Revenue by Booking Status pie chart card
            const revenueByStatusData = Object.entries(stats.revenueByStatus).map(([status, revenue], index) => ({
              name: status,
              value: revenue,
              percentage: Math.round(((revenue as number) / stats.totalRevenue) * 100 * 100) / 100,
              color: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'][index % 6]
            })).sort((a, b) => b.value - a.value);

            
          }

          if (isClients) {
            // Special design for Total Clients card
            return (
              <div
                key={stat.title}
                className="glass rounded-2xl p-6 hover-lift relative overflow-hidden group glow-secondary"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Enhanced background with gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-secondary/10 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-secondary/5 to-secondary/15" />
                
                {/* Animated background particles */}
                <div className="absolute top-2 right-2 w-16 h-16 bg-gradient-radial from-secondary/15 to-transparent rounded-full animate-pulse" />
                <div className="absolute bottom-2 left-2 w-12 h-12 bg-gradient-radial from-secondary/10 to-transparent rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-secondary shadow-lg shadow-secondary/25">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                  {/* Test comments */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {stat.title}
                    </h3>
                    <p className="text-2xl font-bold text-foreground bg-gradient-to-r from-foreground to-secondary bg-clip-text">
                      {stat.value}
                    </p>
                  </div>
                </div>

                {/* Enhanced shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-secondary/10 to-transparent" />
                <div className="absolute inset-0 -translate-y-full group-hover:translate-y-full transition-transform duration-1500 bg-gradient-to-b from-transparent via-white/5 to-transparent" style={{ animationDelay: '0.4s' }} />
              </div>
            );
          }

          // Regular design for other cards
          return (
            <div
              key={stat.title}
              className={`glass rounded-xl p-6 hover-lift relative overflow-hidden group ${stat.glow}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Background gradient overlay */}
              <div className={`absolute inset-0 opacity-5 ${stat.gradient}`} />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.gradient} bg-opacity-20`}>
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <span
                    className={`text-sm font-medium px-2 py-1 rounded-full ${
                      stat.changeType === "positive"
                        ? "text-accent bg-accent/10"
                        : "text-destructive bg-destructive/10"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </h3>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  {'breakdown' in stat && stat.breakdown && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {String(stat.breakdown)}
                    </p>
                  )}
                </div>
              </div>

              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
          );
        })}
      </div>

      {/* Pie Charts Section removed */}
    </div>
  );
}