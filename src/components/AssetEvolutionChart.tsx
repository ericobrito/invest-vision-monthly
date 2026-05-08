import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { formatBRL, type MonthlySnapshot } from "@/data/investments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  snapshots: MonthlySnapshot[];
}

// Distinct, theme-friendly HSL palette
const PALETTE = [
  "hsl(160, 84%, 45%)",
  "hsl(210, 90%, 60%)",
  "hsl(28, 95%, 58%)",
  "hsl(280, 75%, 65%)",
  "hsl(340, 82%, 60%)",
  "hsl(48, 95%, 55%)",
  "hsl(190, 80%, 50%)",
  "hsl(120, 60%, 50%)",
  "hsl(0, 75%, 60%)",
  "hsl(255, 70%, 65%)",
  "hsl(85, 65%, 50%)",
  "hsl(15, 85%, 60%)",
];

const colorFor = (name: string, i: number) => PALETTE[i % PALETTE.length];

type PeriodKey = "3" | "6" | "12" | "all";
type ClassKey = "all" | "fixed" | "variable" | "brazil" | "exterior";
type ModeKey = "absolute" | "normalized";

// Approx CDI ~ 1% per month (compounded), normalized to first visible total
const CDI_MONTHLY = 0.01;

const AssetEvolutionChart = ({ snapshots }: Props) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodKey>("12");
  const [klass, setKlass] = useState<ClassKey>("all");
  const [mode, setMode] = useState<ModeKey>("absolute");
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.month.localeCompare(b.month)),
    [snapshots]
  );

  const visibleSnapshots = useMemo(() => {
    if (period === "all") return sorted;
    const n = parseInt(period, 10);
    return sorted.slice(-n);
  }, [sorted, period]);

  // Universe of assets matching class filter, present in any visible snapshot
  const assets = useMemo(() => {
    const map = new Map<string, { name: string; lastValue: number }>();
    for (const s of visibleSnapshots) {
      for (const inv of s.investments) {
        if (klass === "fixed" && inv.incomeType !== "fixed") continue;
        if (klass === "variable" && inv.incomeType !== "variable") continue;
        if (klass === "brazil" && inv.region !== "brazil") continue;
        if (klass === "exterior" && inv.region !== "exterior") continue;
        map.set(inv.name, { name: inv.name, lastValue: inv.value });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastValue - a.lastValue);
  }, [visibleSnapshots, klass]);

  const chartData = useMemo(() => {
    // Find each asset's first non-null absolute value within visible window
    const baselines = new Map<string, number>();
    for (const a of assets) {
      for (const s of visibleSnapshots) {
        const inv = s.investments.find(i => i.name === a.name);
        if (inv && inv.value > 0) { baselines.set(a.name, inv.value); break; }
      }
    }

    return visibleSnapshots.map((s, idx) => {
      const row: Record<string, any> = { month: s.label, __month: s.month, __total: s.total };
      for (const a of assets) {
        const inv = s.investments.find(i => i.name === a.name);
        const absVal = inv ? inv.value : null;
        if (mode === "normalized") {
          const base = baselines.get(a.name);
          row[a.name] = absVal != null && base ? (absVal / base) * 100 : null;
        } else {
          row[a.name] = absVal;
        }
        if (inv) {
          row[`__abs_${a.name}`] = inv.value;
          row[`__pct_${a.name}`] = s.total > 0 ? (inv.value / s.total) * 100 : 0;
          row[`__applied_${a.name}`] = inv.applied ?? null;
        }
      }
      if (showBenchmark) {
        if (mode === "normalized") {
          row.__cdi = 100 * Math.pow(1 + CDI_MONTHLY, idx);
        } else {
          const firstTotal = visibleSnapshots[0]?.total ?? 0;
          if (firstTotal > 0) row.__cdi = firstTotal * Math.pow(1 + CDI_MONTHLY, idx);
        }
      }
      return row;
    });
  }, [visibleSnapshots, assets, showBenchmark, mode]);

  const toggle = (name: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const showAll = () => setHidden(new Set());
  const hideAll = () => setHidden(new Set(assets.map(a => a.name)));

  // Tooltip with rich per-asset data
  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const monthIndex = chartData.findIndex(d => d.month === label);
    const prev = monthIndex > 0 ? chartData[monthIndex - 1] : null;
    const first = chartData[0];

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <p className="text-muted-foreground text-xs mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload
            .filter((p: any) => p.dataKey !== "__cdi" && p.value != null)
            .map((p: any) => {
              const name = p.dataKey as string;
              const value = p.value as number;
              const prevVal = prev?.[name] as number | undefined;
              const firstVal = first?.[name] as number | undefined;
              const mom = prevVal && prevVal > 0 ? ((value - prevVal) / prevVal) * 100 : null;
              const acc = firstVal && firstVal > 0 ? ((value - firstVal) / firstVal) * 100 : null;
              const pct = chartData[monthIndex]?.[`__pct_${name}`] as number | undefined;
              const applied = chartData[monthIndex]?.[`__applied_${name}`] as number | null | undefined;
              const cdiVal = chartData[monthIndex]?.__cdi as number | undefined;
              const relVsCdi = mode === "normalized" && cdiVal ? value - cdiVal : null;
              const absVal = chartData[monthIndex]?.[`__abs_${name}`] as number | undefined;
              return (
                <div key={name} className="border-b border-border/50 last:border-0 pb-1.5 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-foreground text-xs font-medium truncate">{name}</span>
                  </div>
                  <div className="pl-4 text-[11px] text-muted-foreground leading-tight">
                    {mode === "normalized" ? (
                      <div className="font-mono text-foreground">
                        {t("assetEvo.indexedValue")}: {value.toFixed(1)}
                        {absVal != null && <span className="text-muted-foreground"> · {formatBRL(absVal)}</span>}
                      </div>
                    ) : (
                      <div className="font-mono text-foreground">{formatBRL(value)}</div>
                    )}
                    {mom != null && (
                      <div className={mom >= 0 ? "text-primary" : "text-destructive"}>
                        {t("assetEvo.mom")}: {mom >= 0 ? "+" : ""}{mom.toFixed(2)}%
                      </div>
                    )}
                    {acc != null && (
                      <div className={acc >= 0 ? "text-primary" : "text-destructive"}>
                        {t("assetEvo.acc")}: {acc >= 0 ? "+" : ""}{acc.toFixed(2)}%
                      </div>
                    )}
                    {relVsCdi != null && (
                      <div className={relVsCdi >= 0 ? "text-primary" : "text-destructive"}>
                        {t("assetEvo.relativeTrajectory")}: {relVsCdi >= 0 ? "+" : ""}{relVsCdi.toFixed(1)}
                      </div>
                    )}
                    {applied != null && <div>{t("assetEvo.invested")}: {formatBRL(applied)}</div>}
                    {pct != null && <div>{t("assetEvo.share")}: {pct.toFixed(2)}%</div>}
                  </div>
                </div>
              );
            })}
          {showBenchmark && payload.find((p: any) => p.dataKey === "__cdi") && (
            <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-1.5">
              CDI ~: <span className="font-mono text-foreground">
                {mode === "normalized"
                  ? payload.find((p: any) => p.dataKey === "__cdi").value.toFixed(1)
                  : formatBRL(payload.find((p: any) => p.dataKey === "__cdi").value)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="gradient-card rounded-xl border border-border p-4 sm:p-5">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{t("assetEvo.title")}</h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="cdi-bench" className="text-xs text-muted-foreground">CDI</Label>
            <Switch id="cdi-bench" checked={showBenchmark} onCheckedChange={setShowBenchmark} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">{t("assetEvo.last3")}</SelectItem>
              <SelectItem value="6">{t("assetEvo.last6")}</SelectItem>
              <SelectItem value="12">{t("assetEvo.last12")}</SelectItem>
              <SelectItem value="all">{t("assetEvo.allPeriod")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={klass} onValueChange={(v) => setKlass(v as ClassKey)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("assetEvo.allClasses")}</SelectItem>
              <SelectItem value="fixed">{t("summary.fixed")}</SelectItem>
              <SelectItem value="variable">{t("summary.variable")}</SelectItem>
              <SelectItem value="brazil">{t("summary.brazil")}</SelectItem>
              <SelectItem value="exterior">{t("summary.exterior")}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={showAll}>
              {t("assetEvo.showAll")}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={hideAll}>
              {t("assetEvo.hideAll")}
            </Button>
          </div>
        </div>

        {/* Asset toggle chips */}
        <div className="flex flex-wrap gap-1.5">
          {assets.map((a, i) => {
            const color = colorFor(a.name, i);
            const isHidden = hidden.has(a.name);
            return (
              <button
                key={a.name}
                onClick={() => toggle(a.name)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs transition-all ${
                  isHidden ? "border-border bg-transparent text-muted-foreground opacity-60" : "border-border bg-secondary text-foreground"
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="truncate max-w-[160px]">{a.name}</span>
              </button>
            );
          })}
          {assets.length === 0 && (
            <Badge variant="outline" className="text-xs">{t("assetEvo.noAssets")}</Badge>
          )}
        </div>
      </div>

      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
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
              width={70}
            />
            <Tooltip content={renderTooltip} />
            <Legend wrapperStyle={{ display: "none" }} />
            {assets.map((a, i) => (
              <Line
                key={a.name}
                type="monotone"
                dataKey={a.name}
                stroke={colorFor(a.name, i)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                hide={hidden.has(a.name)}
                isAnimationActive
                animationDuration={500}
                connectNulls
              />
            ))}
            {showBenchmark && (
              <Line
                type="monotone"
                dataKey="__cdi"
                name="CDI"
                stroke="hsl(215, 12%, 65%)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AssetEvolutionChart;
