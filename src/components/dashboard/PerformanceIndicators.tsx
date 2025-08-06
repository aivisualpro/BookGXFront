import { Server, Zap, AlertTriangle, Activity, Calendar, CalendarDays, CalendarRange, CalendarCheck, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface PerformanceIndicatorsProps {
  performance: {
    serverUptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
  stats?: {
    totalRevenue: number;
    totalUsers: number;
    locationData: { name: string; value: number; percentage: number; color: string }[];
    acquisitionChannels: { [channel: string]: string };
    natureBooking: { [nature: string]: string };
  };
  dateRange?: { start: string; end: string };
  onTimePeriodChange?: (period: string) => void;
  currentPeriod?: string;
  isLoading?: boolean;
}

export function PerformanceIndicators({ performance, stats, dateRange, onTimePeriodChange, currentPeriod, isLoading }: PerformanceIndicatorsProps) {
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

  const indicators = [
    {
      title: "Payment Success Rate",
      value: `${performance.serverUptime.toFixed(2)}%`,
      percentage: performance.serverUptime,
      icon: Server,
      status: performance.serverUptime >= 95 ? "excellent" : performance.serverUptime >= 85 ? "good" : "warning",
      target: "> 95%"
    },
    {
      title: "Average Order Value",
      value: `${performance.responseTime} SAR`,
      percentage: Math.min(100, (performance.responseTime / 500) * 100),
      icon: Zap,
      status: performance.responseTime >= 300 ? "excellent" : performance.responseTime >= 200 ? "good" : "warning",
      target: "> 250 SAR"
    },
    {
      title: "Cancellation Rate",
      value: `${performance.errorRate.toFixed(2)}%`,
      percentage: Math.max(0, 100 - (performance.errorRate * 2)),
      icon: AlertTriangle,
      status: performance.errorRate <= 5 ? "excellent" : performance.errorRate <= 10 ? "good" : "warning",
      target: "< 5%"
    },
    {
      title: "Up-selling Success",
      value: `${performance.throughput.toFixed(2)}%`,
      percentage: Math.min(100, performance.throughput * 2),
      icon: Activity,
      status: performance.throughput >= 30 ? "excellent" : performance.throughput >= 20 ? "good" : "warning",
      target: "> 25%"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-accent";
      case "good": return "text-primary";
      case "warning": return "text-warning";
      default: return "text-destructive";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "excellent": return "bg-accent";
      case "good": return "bg-primary";
      case "warning": return "bg-warning";
      default: return "bg-destructive";
    }
  };

  // Main KPI Cards Data - Dynamic based on stats
  const mainKPIs = [
    {
      title: "Total Revenue",
      subtitle: "SAR",
      value: stats?.totalRevenue ? stats.totalRevenue.toLocaleString() : "0",
      icon: "💰",
      gradient: "from-green-500/20 to-green-600/20",
      border: "border-green-500/30",
      textColor: "text-green-400"
    },
    {
      title: "Unique Clients",
      subtitle: "Customers",
      value: stats?.totalUsers ? stats.totalUsers.toLocaleString() : "0",
      icon: "👥",
      gradient: "from-blue-500/20 to-blue-600/20",
      border: "border-blue-500/30",
      textColor: "text-blue-400"
    },
    {
      title: "Total Locations",
      subtitle: "Branches",
      value: stats?.locationData ? stats.locationData.length.toString() : "0",
      icon: "📍",
      gradient: "from-purple-500/20 to-purple-600/20",
      border: "border-purple-500/30",
      textColor: "text-purple-400"
    },
    {
      title: "Acquisition Channels",
      subtitle: "Channels",
      value: stats?.acquisitionChannels ? Object.keys(stats.acquisitionChannels).length.toString() : "0",
      icon: "📈",
      gradient: "from-orange-500/20 to-orange-600/20",
      border: "border-orange-500/30",
      textColor: "text-orange-400"
    },
    {
      title: "Booking Types",
      subtitle: "Types",
      value: stats?.natureBooking ? Object.keys(stats.natureBooking).length.toString() : "0",
      icon: "🛒",
      gradient: "from-pink-500/20 to-pink-600/20",
      border: "border-pink-500/30",
      textColor: "text-pink-400"
    }
  ];

  return (
    <>
      {/* Filter Bar */}
      <div className="w-full mb-6">
        <div className="glass rounded-lg p-2 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/10 relative">
          {/* Beautiful animated loading progress bar at bottom */}
          {isLoading && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-green-500/10 to-transparent rounded-b-lg overflow-hidden">
              <div className="h-full rounded-b-lg shadow-lg shadow-green-500/30"
                   style={{
                     animation: 'loading-sweep-smooth 3s ease-in-out infinite',
                     background: 'linear-gradient(90deg, transparent, #10b981, #06d6a0, #10b981, transparent)',
                     backgroundSize: '300% 100%',
                   }}>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <p className={`text-xs font-medium transition-all duration-300 ${
                isLoading ? 'text-green-400 animate-pulse' : 'text-green-400'
              }`}>
                {isLoading ? 'Applying filters & fetching data...' : getDateDisplayText()}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {/* Time period buttons - Exact same as StatsOverview */}
              <div className="flex gap-0.5">
                <button
                  onClick={() => handleTimePeriodChange('today')}
                  data-tooltip="Today"
                  disabled={isLoading}
                  className={`relative p-1.5 rounded-md border transition-all duration-300 tooltip-trigger ${
                    isLoading 
                      ? 'bg-background/30 border-border/30 cursor-not-allowed opacity-50' 
                      : 'bg-background/50 border-border/50 hover:bg-background/70'
                  }`}
                >
                  <Calendar className={`w-3.5 h-3.5 transition-colors ${
                    isLoading ? 'text-primary/50' : 'text-primary'
                  }`} />
                </button>
                
                <button
                  onClick={() => handleTimePeriodChange('this-month')}
                  data-tooltip="This Month"
                  disabled={isLoading}
                  className={`relative p-1.5 rounded-md border transition-all duration-300 tooltip-trigger ${
                    isLoading 
                      ? 'bg-background/30 border-border/30 cursor-not-allowed opacity-50' 
                      : 'bg-background/50 border-border/50 hover:bg-background/70'
                  }`}
                >
                  <CalendarDays className={`w-3.5 h-3.5 transition-colors ${
                    isLoading ? 'text-primary/50' : 'text-primary'
                  }`} />
                </button>
                
                <button
                  onClick={() => handleTimePeriodChange('last-month')}
                  data-tooltip="Last Month"
                  disabled={isLoading}
                  className={`relative p-1.5 rounded-md border transition-all duration-300 tooltip-trigger ${
                    isLoading 
                      ? 'bg-background/30 border-border/30 cursor-not-allowed opacity-50' 
                      : 'bg-background/50 border-border/50 hover:bg-background/70'
                  }`}
                >
                  <CalendarRange className={`w-3.5 h-3.5 transition-colors ${
                    isLoading ? 'text-primary/50' : 'text-primary'
                  }`} />
                </button>
                
                <button
                  onClick={() => handleTimePeriodChange('this-year')}
                  data-tooltip="This Year"
                  disabled={isLoading}
                  className={`relative p-1.5 rounded-md border transition-all duration-300 tooltip-trigger ${
                    isLoading 
                      ? 'bg-background/30 border-border/30 cursor-not-allowed opacity-50' 
                      : 'bg-background/50 border-border/50 hover:bg-background/70'
                  }`}
                >
                  <CalendarCheck className={`w-3.5 h-3.5 transition-colors ${
                    isLoading ? 'text-primary/50' : 'text-primary'
                  }`} />
                </button>
                
                <button
                  onClick={() => handleTimePeriodChange('all')}
                  data-tooltip="All"
                  disabled={isLoading}
                  className={`relative p-1.5 rounded-md border transition-all duration-300 tooltip-trigger ${
                    isLoading 
                      ? 'bg-background/30 border-border/30 cursor-not-allowed opacity-50' 
                      : 'bg-background/50 border-border/50 hover:bg-background/70'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 transition-colors ${
                    isLoading ? 'text-primary/50' : 'text-primary'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards - Full Width Grid */}
      <div className="w-full mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {mainKPIs.map((kpi, index) => (
            <div 
              key={kpi.title}
              className={`glass rounded-xl p-6 hover-lift bg-gradient-to-r ${kpi.gradient} border ${kpi.border} hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl">{kpi.icon}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{kpi.title.split(' ')[0]}</p>
                  <p className="text-lg font-semibold text-white">{kpi.title.split(' ').slice(1).join(' ')}</p>
                </div>
              </div>
              <div className={`text-3xl font-bold ${kpi.textColor} mb-1`}>{kpi.value}</div>
              <div className="text-xs text-gray-400">{kpi.subtitle}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance KPI Cards - Full Width Grid */}
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {indicators.map((indicator, index) => {
            const Icon = indicator.icon;
            return (
              <div 
                key={indicator.title}
                className="glass rounded-xl p-6 hover-lift relative bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-3 rounded-lg bg-white/10 border border-white/20`}>
                    <Icon className={`w-5 h-5 ${getStatusColor(indicator.status)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm">{indicator.title}</h3>
                    <p className="text-xs text-gray-400">Target: {indicator.target}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className={`text-2xl font-bold ${getStatusColor(indicator.status)}`}>
                    {indicator.value}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {indicator.status}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="relative mb-2">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${getProgressColor(indicator.status)}`}
                      style={{ 
                        width: `${indicator.percentage}%`,
                        boxShadow: `0 0 8px ${
                          indicator.status === "excellent" ? "hsl(120 100% 50%)" :
                          indicator.status === "good" ? "hsl(192 100% 50%)" :
                          indicator.status === "warning" ? "hsl(45 100% 55%)" :
                          "hsl(0 100% 60%)"
                        }`
                      }}
                    />
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-3 right-3">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      indicator.status === "excellent" ? "bg-accent animate-pulse" :
                      indicator.status === "good" ? "bg-primary" :
                      indicator.status === "warning" ? "bg-warning animate-pulse" :
                      "bg-destructive animate-pulse"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}