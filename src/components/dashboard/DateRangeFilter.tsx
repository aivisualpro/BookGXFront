import { Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: string, endDate: string) => void;
  loading: boolean;
}

export function DateRangeFilter({ onDateRangeChange, loading }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
//hello//
  const handleApplyFilter = () => {
    // Only apply filter if both dates are selected
    if (startDate && endDate) {
      onDateRangeChange(startDate, endDate);
    } else {
      // If no dates selected, show all data (no filter)
      onDateRangeChange('', '');
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    onDateRangeChange('', '');
  };

  // Quick date presets
  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    setStartDate(startStr);
    setEndDate(endStr);
    onDateRangeChange(startStr, endStr);
  };

  return (
    <div className="glass rounded-xl p-4 border border-glass-border">
      <div className="flex items-center space-x-3 pb-3 border-b border-glass-border mb-4">
        <div className="p-2 rounded-lg bg-gradient-primary/20">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-foreground">Date Range Filter</h4>
          <p className="text-xs text-muted-foreground">Select a date range to filter your data</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="glass-subtle border-glass-border focus:border-primary h-10 hover-scale"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="glass-subtle border-glass-border focus:border-primary h-10 hover-scale"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Select</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset(7)}
              className="glass-subtle border-primary/20 text-primary hover:bg-primary/10 hover-scale h-9"
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset(30)}
              className="glass-subtle border-primary/20 text-primary hover:bg-primary/10 hover-scale h-9"
            >
              Last 30 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset(90)}
              className="glass-subtle border-primary/20 text-primary hover:bg-primary/10 hover-scale h-9"
            >
              Last 3 months
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset(365)}
              className="glass-subtle border-primary/20 text-primary hover:bg-primary/10 hover-scale h-9"
            >
              Last year
            </Button>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-glass-border">
          <Button
            onClick={handleApplyFilter}
            disabled={loading}
            className="bg-gradient-primary text-white border-0 hover:opacity-90 flex-1 h-10 hover-scale"
          >
            <Filter className="w-4 h-4 mr-2" />
            {startDate || endDate ? 'Apply Filter' : 'Show All Data'}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="glass-subtle border-glass-border text-muted-foreground hover:bg-glass/50 h-10 px-6 hover-scale"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}