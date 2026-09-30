import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS, formatBRL, type MonthlySnapshot } from "@/data/investments";
import { PieChart as PieChartIcon } from "lucide-react";

interface AllocationChartProps {
  snapshot: MonthlySnapshot;
}

const AllocationChart = ({ snapshot }: AllocationChartProps) => {
  // Map original index for color consistency, then sort by percentage descending
  const originalOrder = snapshot.investments.map(i => i.name);
  const data = [...snapshot.investments]
    .sort((a, b) => b.percentage - a.percentage)
    .map(inv => ({
      name: inv.name,
      value: inv.value,
      percentage: inv.percentage,
      colorIndex: originalOrder.indexOf(inv.name),
    }));

  return (
    <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-6 min-w-0 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
          <PieChartIcon className="w-4 h-4" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Alocação por Ativo</h2>
      </div>

      <div className="h-[240px] sm:h-[260px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={CHART_COLORS[entry.colorIndex % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-xl">
                      <p className="text-foreground font-semibold text-sm mb-1">{d.name}</p>
                      <p className="text-emerald-400 font-mono font-bold text-sm">{formatBRL(d.value)}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{d.percentage.toFixed(2)}% da carteira</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Modern Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/40 max-h-[160px] overflow-y-auto scrollbar-hide">
        {data.map((item) => (
          <div 
            key={item.name} 
            className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-secondary/30 text-xs hover:bg-secondary/60 transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <div 
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                style={{ backgroundColor: CHART_COLORS[item.colorIndex % CHART_COLORS.length] }} 
              />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="text-foreground font-mono font-semibold shrink-0">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllocationChart;
