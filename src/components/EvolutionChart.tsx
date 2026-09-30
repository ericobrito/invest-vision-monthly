import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatBRL, type MonthlySnapshot } from "@/data/investments";
import { TrendingUp } from "lucide-react";

interface EvolutionChartProps {
  snapshots: MonthlySnapshot[];
}

const EvolutionChart = ({ snapshots }: EvolutionChartProps) => {
  const evolutionData = snapshots.map(m => ({ month: m.label, total: m.total }));

  return (
    <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-6 min-w-0 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Evolução Patrimonial</h2>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-secondary/60">
          {snapshots.length} meses
        </span>
      </div>

      <div className="h-[280px] sm:h-[320px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
            <defs>
              <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.4} />
                <stop offset="90%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
              tickLine={false}
              interval="preserveStartEnd"
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              width={65}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-xl">
                      <p className="text-muted-foreground text-xs font-medium mb-1">{label}</p>
                      <p className="text-emerald-400 font-mono font-bold text-sm sm:text-base">
                        {formatBRL(payload[0].value as number)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(160, 84%, 39%)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "hsl(160, 84%, 39%)", stroke: "white", strokeWidth: 2 }}
              fill="url(#gradientTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EvolutionChart;
