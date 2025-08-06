import { useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";

interface BookingType {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface BookingTypesActivityCardProps {
  data?: {
    naturePieData: { name: string; value: number; percentage: number; color: string }[];
    totalBookings: number;
  };
}

export function BookingTypesActivityCard({ data }: BookingTypesActivityCardProps) {
  const [selectedType, setSelectedType] = useState("All Types");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Mock data matching the exact structure of naturePieData from StatsOverview
  const mockData = {
    naturePieData: [
      { name: "Individual", value: 2400, percentage: 48.0, color: "#ef4444" },
      { name: "Corporate", value: 1500, percentage: 30.0, color: "#f97316" },
      { name: "Group", value: 800, percentage: 16.0, color: "#eab308" },
      { name: "Event", value: 300, percentage: 6.0, color: "#22c55e" }
    ],
    totalBookings: 5000
  };

  const displayData = data || mockData;
  const { naturePieData, totalBookings } = displayData;

  const formatFullNumber = (amount: number) => {
    return amount.toLocaleString();
  };

  // Filter data based on selected type
  const filteredData = selectedType === "All Types" 
    ? naturePieData 
    : naturePieData.filter(type => type.name === selectedType);

  const displayTotal = selectedType === "All Types" 
    ? totalBookings 
    : filteredData.reduce((sum, type) => sum + type.value, 0);

  const typeOptions = ["All Types", ...naturePieData.map(type => type.name)];

  return (
    <div className="bg-[#1f1f1f] rounded-xl p-6 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-gray-400 text-lg font-medium">Booking Types</h3>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-600 transition-colors"
          >
            <span>{selectedType}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50">
              <div className="py-2">
                {typeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedType === type
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {type}
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
          {filteredData.map((type, index) => {
            const maxRadius = 90;
            const minRadius = 40;
            const radiusStep = (maxRadius - minRadius) / Math.max(filteredData.length - 1, 1);
            const radius = maxRadius - (index * radiusStep);
            const circumference = 2 * Math.PI * radius;
            const strokeDasharray = circumference;
            const strokeDashoffset = circumference - (type.percentage / 100) * circumference;

            return (
              <svg
                key={type.name}
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
                  stroke={type.color}
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
              <div className="text-gray-400 text-xs">Total</div>
              <div className="text-white text-sm font-bold">
                {formatFullNumber(displayTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Type Tags (Inline) */}
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {filteredData.map((type, index) => (
            <div key={type.name} className="flex items-center space-x-1 text-gray-400">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: type.color }}
              />
              <span className="font-medium">{type.name}</span>
              <span className="text-white font-bold">{formatFullNumber(type.value)}</span>
              <span>({type.percentage.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}