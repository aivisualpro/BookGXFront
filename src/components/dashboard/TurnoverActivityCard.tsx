import { useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";

interface Location {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface TurnoverActivityCardProps {
  data?: {
    locationData: Location[];
    totalTurnover: number;
  };
}

export function TurnoverActivityCard({ data }: TurnoverActivityCardProps) {
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Mock data matching the exact structure of locationData from StatsOverview
  const mockData = {
    locationData: [
      { name: "Riyadh", value: 1250000, percentage: 33.33, color: "#ef4444" },
      { name: "Jeddah", value: 980000, percentage: 26.13, color: "#f97316" },
      { name: "Dammam", value: 750000, percentage: 20.00, color: "#eab308" },
      { name: "Abha", value: 450000, percentage: 12.00, color: "#22c55e" },
      { name: "Tabuk", value: 320000, percentage: 8.53, color: "#06b6d4" }
    ],
    totalTurnover: 3750000
  };

  const displayData = data || mockData;
  const { locationData, totalTurnover } = displayData;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFullCurrency = (amount: number) => {
    return amount.toLocaleString();
  };

  // Filter data based on selected location
  const filteredData = selectedLocation === "All Locations" 
    ? locationData 
    : locationData.filter(location => location.name === selectedLocation);

  const displayTotal = selectedLocation === "All Locations" 
    ? totalTurnover 
    : filteredData.reduce((sum, location) => sum + location.value, 0);

  const locationOptions = ["All Locations", ...locationData.map(location => location.name)];

  return (
    <div className="bg-[#1f1f1f] rounded-xl p-6 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-gray-400 text-lg font-medium">Turnover Activity</h3>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-600 transition-colors"
          >
            <span>{selectedLocation}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50">
              <div className="py-2">
                {locationOptions.map((location) => (
                  <button
                    key={location}
                    onClick={() => {
                      setSelectedLocation(location);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedLocation === location
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {location}
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
          {filteredData.map((location, index) => {
            const maxRadius = 90;
            const minRadius = 40;
            const radiusStep = (maxRadius - minRadius) / Math.max(filteredData.length - 1, 1);
            const radius = maxRadius - (index * radiusStep);
            const circumference = 2 * Math.PI * radius;
            const strokeDasharray = circumference;
            const strokeDashoffset = circumference - (location.percentage / 100) * circumference;

            return (
              <svg
                key={location.name}
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
                  stroke={location.color}
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
              <div className="text-gray-400 text-xs">Turnover</div>
              <div className="text-white text-sm font-bold">
                {formatFullCurrency(displayTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Location Tags (Inline) */}
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {filteredData.map((location, index) => (
            <div key={location.name} className="flex items-center space-x-1 text-gray-400">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: location.color }}
              />
              <span className="font-medium">{location.name}</span>
              <span className="text-white font-bold">{formatFullCurrency(location.value)}</span>
              <span>({location.percentage.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 