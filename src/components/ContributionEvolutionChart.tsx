import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { formatBRL, type MonthlySnapshot } from "@/data/investments";

interface Props {
  snapshots: MonthlySnapshot[];
}

const ContributionEvolutionChart = ({ snapshots }: Props) => {
  const data = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.map(s => {
      const applied = s.investments.reduce((acc, inv) => acc + (Number(inv.applied) || 0), 0);
      const total = s.total;
      const gains = total - applied;
      return {
        month: s.label,
        applied,
        gains,
        total,
        gainsPct: applied > 0 ? (gains / applied) * 100 : 0,
      };
    });
  }, [snapshots]);

  const last = data[data.length - 1];

  return (
    <div className="gradient-card rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold text-foreground">Evolução de Aporte vs Rentabilidade</h2>
        {last && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
            <span>Aportado: <span className="font-mono text-foreground">{formatBRL(last.applied)}</span></span>
            <span>Rentabilidade: <span className={`font-mono ${last.gains >= 0 ? "text-primary" : "text-destructive"}`}>{formatBRL(last.gains)}</span></span>
            <span>({last.gainsPct >= 0 ? "+" : ""}{last.gainsPct.toFixed(2)}%)</span>
          </div>
        )}
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradApplied" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 90%, 60%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(210, 90%, 60%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradGains" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(220, 14%, 18%)" }}
              tickLine={false}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              width={80}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as typeof data[number];
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg space-y-1">
                    <p className="text-muted-foreground text-xs mb-1">{label}</p>
                    <p className="text-xs">
                      <span className="text-muted-foreground">Aportado: </span>
                      <span className="font-mono" style={{ color: "hsl(210, 90%, 60%)" }}>{formatBRL(row.applied)}</span>
                    </p>
                    <p className="text-xs">
                      <span className="text-muted-foreground">Rentabilidade: </span>
                      <span className={`font-mono ${row.gains >= 0 ? "text-primary" : "text-destructive"}`}>
                        {formatBRL(row.gains)} ({row.gainsPct >= 0 ? "+" : ""}{row.gainsPct.toFixed(2)}%)
                      </span>
                    </p>
                    <p className="text-xs border-t border-border/50 pt-1 mt-1">
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-mono text-foreground">{formatBRL(row.total)}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(v) => v === "applied" ? "Aportado" : "Rentabilidade"}
            />
            <Area
              type="monotone"
              dataKey="applied"
              stackId="1"
              stroke="hsl(210, 90%, 60%)"
              strokeWidth={2}
              fill="url(#gradApplied)"
            />
            <Area
              type="monotone"
              dataKey="gains"
              stackId="1"
              stroke="hsl(160, 84%, 45%)"
              strokeWidth={2}
              fill="url(#gradGains)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ContributionEvolutionChart;
