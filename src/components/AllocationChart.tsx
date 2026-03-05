import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS, formatBRL, type MonthlySnapshot } from "@/data/investments";

interface AllocationChartProps {
  snapshot: MonthlySnapshot;
}

const AllocationChart = ({ snapshot }: AllocationChartProps) => {
  const data = snapshot.investments.map(inv => ({
    name: inv.name,
    value: inv.value,
    percentage: inv.percentage,
  }));

  return (
    <div className="gradient-card rounded-xl border border-border p-5">
      <h2 className="text-lg font-semibold text-foreground mb-4">Alocação</h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((_entry, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="text-foreground font-medium text-sm">{d.name}</p>
                      <p className="text-primary text-sm font-mono">{formatBRL(d.value)}</p>
                      <p className="text-muted-foreground text-xs">{d.percentage.toFixed(2)}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-muted-foreground truncate">{item.name}</span>
            <span className="text-foreground font-mono ml-auto">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllocationChart;
