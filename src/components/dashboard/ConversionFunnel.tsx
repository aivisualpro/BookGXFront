import { ChevronDown } from "lucide-react";

interface ConversionFunnelProps {
  data: { stage: string; users: number; rate: number }[];
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const maxUsers = Math.max(...data.map(d => d.users));

  return (
    <div className="glass rounded-xl p-6 hover-lift">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Conversion Funnel
        </h2>
        <p className="text-sm text-muted-foreground">
          User journey through conversion stages
        </p>
      </div>

      <div className="space-y-4">
        {data.map((stage, index) => {
          const width = (stage.users / maxUsers) * 100;
          const isFirst = index === 0;
          const isLast = index === data.length - 1;
          
          return (
            <div key={stage.stage} className="relative">
              {/* Funnel Stage */}
              <div 
                className={`
                  relative overflow-hidden rounded-lg p-4 transition-all duration-500 hover:scale-[1.02]
                  ${isFirst ? 'bg-gradient-primary' : 
                    index === 1 ? 'bg-gradient-secondary' :
                    index === 2 ? 'bg-gradient-accent' :
                    'bg-gradient-primary'}
                `}
                style={{ 
                  width: `${width}%`,
                  minWidth: '200px',
                  marginLeft: isFirst ? '0' : `${(100 - width) / 2}%`
                }}
              >
                <div className="flex items-center justify-between text-white">
                  <div>
                    <h3 className="font-semibold">{stage.stage}</h3>
                    <p className="text-sm opacity-90">
                      {stage.users.toLocaleString()} users
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{stage.rate}%</p>
                    <p className="text-xs opacity-75">conversion</p>
                  </div>
                </div>

                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>

              {/* Arrow between stages */}
              {!isLast && (
                <div className="flex justify-center my-2">
                  <ChevronDown className="w-5 h-5 text-muted-foreground animate-bounce" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      
      <div className="mt-6 pt-4 border-t border-glass-border">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {((data[data.length - 1].users / data[0].users) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Overall Conversion</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {data[data.length - 1].users.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Final Conversions</p>
          </div>
        </div>
      </div>
    </div>
  );
}