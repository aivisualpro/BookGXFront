import { useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";

interface BookingStatus {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface BookingStatusActivityCardProps {
  data?: {
    revenueByStatus: { [status: string]: number };
    totalRevenue: number;
  };
}

export function BookingStatusActivityCard({ data }: BookingStatusActivityCardProps) {
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Mock data matching the exact structure of revenueByStatus from StatsOverview
  const mockData = {
    revenueByStatus: {
      "Confirmed": 1400000,
      "Completed": 1200000,
      "Cancelled": 800000,
      "Pending": 350000
    },
    totalRevenue: 3750000
  };

  const displayData = data || mockData;
  const { revenueByStatus, totalRevenue } = displayData;

  // Convert revenueByStatus to array format
  const statusData: BookingStatus[] = Object.entries(revenueByStatus).map(([status, revenue], index) => ({
    name: status,
    value: revenue as number,
    percentage: Math.round(((revenue as number) / totalRevenue) * 100 * 100) / 100,
    color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'][index % 5]
  })).sort((a, b) => b.value - a.value);

  const formatFullCurrency = (amount: number) => {
    return amount.toLocaleString();
  };

  // Filter data based on selected status
  const filteredData = selectedStatus === "All Status" 
    ? statusData 
    : statusData.filter(status => status.name === selectedStatus);

  const displayTotal = selectedStatus === "All Status" 
    ? totalRevenue 
    : filteredData.reduce((sum, status) => sum + status.value, 0);

  const statusOptions = ["All Status", ...statusData.map(status => status.name)];

  return (
    <div className="bg-[#1f1f1f] rounded-xl p-6 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-gray-400 text-lg font-medium">Booking Status</h3>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-600 transition-colors"
          >
            <span>{selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50">
              <div className="py-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setSelectedStatus(status);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedStatus === status
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* Center Section - Concentric Rings */}
        <div className="relative w-48 h-48 mb-4">
          {filteredData.map((status, index) => {
            const maxRadius = 90;
            const minRadius = 40;
            const radiusStep = (maxRadius - minRadius) / Math.max(filteredData.length - 1, 1);
            const radius = maxRadius - (index * radiusStep);
            const circumference = 2 * Math.PI * radius;
            const strokeDasharray = circumference;
            const strokeDashoffset = circumference - (status.percentage / 100) * circumference;

            return (
              <svg
                key={status.name}
                className="absolute inset-0 w-full h-full transform -rotate-90"
                viewBox="0 0 192 192"
              >
                {/* Background circle */}
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  fill="none"
                  stroke="#374151"
                  strokeWidth="12"
                  opacity="0.3"
                />
                {/* Progress circle */}
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  fill="none"
                  stroke={status.color}
                  strokeWidth="12"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke-dashoffset 0.8s ease-in-out"
                  }}
                />
              </svg>
            );
          })}

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 text-xs">Revenue</div>
              <div className="text-white text-sm font-bold">
                {formatFullCurrency(displayTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Status Tags (Inline) */}
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {filteredData.map((status, index) => (
            <div key={status.name} className="flex items-center space-x-1 text-gray-400">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: status.color }}
              />
              <span className="font-medium">{status.name}</span>
              <span className="text-white font-bold">{formatFullCurrency(status.value)}</span>
              <span>({status.percentage.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}