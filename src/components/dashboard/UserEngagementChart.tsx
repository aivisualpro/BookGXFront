import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface UserEngagementChartProps {
  data: { date: string; active: number; new: number; retention: number }[];
}

export function UserEngagementChart({ data }: UserEngagementChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-subtle rounded-lg p-3 border border-glass-border">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className={`text-sm font-medium`} style={{ color: item.color }}>
              {item.name}: {item.value.toLocaleString()}
              {item.dataKey === 'retention' && '%'}
            </p>
          ))}
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
            Location Performance
          </h2>
          <p className="text-sm text-muted-foreground">
            Revenue by location, bookings count, and average order value
          </p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(220 30% 20%)" 
              opacity={0.3}
            />
            <XAxis 
              dataKey="date"
              stroke="hsl(220 15% 60%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="users"
              orientation="left"
              stroke="hsl(220 15% 60%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <YAxis 
              yAxisId="retention"
              orientation="right"
              stroke="hsl(220 15% 60%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                color: "hsl(220 15% 60%)",
                fontSize: "12px"
              }}
            />
            <Bar 
              yAxisId="users"
              dataKey="active" 
              name="Revenue (SAR)"
              fill="hsl(192 100% 50%)"
              radius={[2, 2, 0, 0]}
              opacity={0.8}
            />
            <Bar 
              yAxisId="users"
              dataKey="new" 
              name="Bookings"
              fill="hsl(280 100% 60%)"
              radius={[2, 2, 0, 0]}
              opacity={0.8}
            />
            <Bar 
              yAxisId="retention"
              dataKey="retention" 
              name="Avg Order Value"
              fill="hsl(120 100% 50%)"
              radius={[2, 2, 0, 0]}
              opacity={0.6}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}