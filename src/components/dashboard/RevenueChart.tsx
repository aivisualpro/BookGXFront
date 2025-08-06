import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts";

interface RevenueChartProps {
  data: { month: string; value: number; growth: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-subtle rounded-lg p-3 border border-glass-border">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-primary font-semibold">
            Revenue: {payload[0].value.toLocaleString()} SAR
          </p>
          <p className="text-xs text-muted-foreground">
            Growth: {payload[0].payload.growth}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass rounded-xl p-6 hover-lift">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Revenue Trends
          </h2>
          <p className="text-sm text-muted-foreground">
            Monthly revenue performance with growth indicators
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-primary glow-primary" />
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(192 100% 50%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(192 100% 50%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(220 30% 20%)" 
              opacity={0.3}
            />
            <XAxis 
              dataKey="month"
              stroke="hsl(220 15% 60%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(220 15% 60%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(192 100% 50%)"
              strokeWidth={3}
              fill="url(#revenueGradient)"
              dot={{ 
                fill: "hsl(192 100% 50%)", 
                strokeWidth: 2,
                stroke: "hsl(220 15% 8%)",
                r: 4 
              }}
              activeDot={{ 
                r: 6, 
                fill: "hsl(192 100% 70%)",
                stroke: "hsl(220 15% 8%)",
                strokeWidth: 2,
                filter: "drop-shadow(0 0 8px hsl(192 100% 50%))"
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}