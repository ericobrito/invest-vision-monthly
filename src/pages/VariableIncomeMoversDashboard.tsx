import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useVariableAssets } from "@/features/variableAssets/useVariableAssets";
import { useRadarData } from "@/hooks/useRadarData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Trophy,
  Award,
  DollarSign,
  Flame,
  Search,
  RefreshCw,
  Target,
  BarChart2,
  Sparkles,
  Layers,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

function normalizeTicker(rawTicker: string): string {
  if (!rawTicker) return "OUTROS";
  let sym = rawTicker.trim().toUpperCase();
  const knownNameMap: Record<string, string> = {
    BITCOIN: "BTC",
    ETHEREUM: "ETH",
    TETHER: "USDT",
    SOLANA: "SOL",
    BERKSHIRE: "BRK-B",
    "BERKSHIRE HATHAWAY": "BRK-B",
    "BRK.B": "BRK-B",
    TESLA: "TSLA",
    GOOGLE: "GOOGL",
    ALPHABET: "GOOGL",
    META: "META",
    MICROSOFT: "MSFT",
    APPLE: "AAPL",
    AMAZON: "AMZN",
    NVIDIA: "NVDA",
  };
  if (knownNameMap[sym]) sym = knownNameMap[sym];
  if (/^[A-Z]{2,5}\.[A-Z]{1,2}$/.test(sym)) sym = sym.replace(".", "-");
  if (sym.length > 4 && sym.endsWith("USDT")) sym = sym.replace(/USDT$/, "");
  if (sym.includes("/")) sym = sym.split("/")[0].trim();
  return sym;
}

function formatBRL(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatUSD(val: number) {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPct(val: number) {
  const p = val * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
}

const DEFAULT_USD_BRL_FX = 5.0740;

interface PerformanceAsset {
  ticker: string;
  name: string;
  source: string;
  quantity: number;
  currentValueUSD?: number;
  currentValueBRL: number;
  appliedAmountBRL: number;
  profitBRL: number;
  profitPct: number;
  currentPriceUSD?: number;
  averagePriceUSD?: number;
  fxRate?: number;
  athUSD?: number;
  potentialReturnPct?: number;
}

const avenueKnownPositions: Record<string, {
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currentValueUSD: number;
  currentValueBRL: number;
  appliedAmountBRL: number;
  profitPct: number;
}> = {
  "BRK-B": { name: "Berkshire Hathaway", quantity: 2.597600, averagePrice: 229.16, currentPrice: 508.13, currentValueUSD: 1319.92, currentValueBRL: 6697.27, appliedAmountBRL: 3020.32, profitPct: 1.2174 },
  "RGTI": { name: "Rigetti Computing", quantity: 8.000000, averagePrice: 48.87, currentPrice: 15.18, currentValueUSD: 121.44, currentValueBRL: 616.19, appliedAmountBRL: 1983.87, profitPct: -0.6894 },
  "GOOGL": { name: "Alphabet Inc (Google)", quantity: 4.118000, averagePrice: 94.84, currentPrice: 342.48, currentValueUSD: 1410.33, currentValueBRL: 7156.03, appliedAmountBRL: 1981.68, profitPct: 2.6111 },
  "TSLA": { name: "Tesla Inc", quantity: 14.082900, averagePrice: 319.69, currentPrice: 376.37, currentValueUSD: 5300.31, currentValueBRL: 26893.78, appliedAmountBRL: 22843.60, profitPct: 0.1773 },
  "META": { name: "Meta Platforms", quantity: 4.769900, averagePrice: 210.52, currentPrice: 610.68, currentValueUSD: 2912.88, currentValueBRL: 14779.97, appliedAmountBRL: 5095.14, profitPct: 1.9008 },
  "AMD": { name: "Advanced Micro Devices", quantity: 1.169470, averagePrice: 196.89, currentPrice: 456.16, currentValueUSD: 533.47, currentValueBRL: 2706.80, appliedAmountBRL: 1168.33, profitPct: 1.3168 },
  "IONQ": { name: "IonQ Inc", quantity: 5.082210, averagePrice: 66.90, currentPrice: 39.02, currentValueUSD: 198.31, currentValueBRL: 1006.21, appliedAmountBRL: 1725.03, profitPct: -0.4167 },
};

const VariableIncomeMoversDashboard = () => {
  const { data: monthlySnapshots = [], isLoading: snapshotsLoading } = useSnapshots();
  const { positions: variablePositions = [], isLoading: variableLoading } = useVariableAssets();

  const [selectedMonth, setSelectedMonth] = useState<string>("latest");
  const [sortBy, setSortBy] = useState<"profitPct" | "profitBRL" | "currentValue" | "potential">("profitPct");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBroker, setFilterBroker] = useState<string>("all");

  const snapshotOptions = useMemo(() => {
    return [...monthlySnapshots].reverse().map((s) => ({
      month: s.month,
      label: s.label,
    }));
  }, [monthlySnapshots]);

  const effectiveSnapshot = useMemo(() => {
    if (monthlySnapshots.length === 0) return null;
    if (selectedMonth === "latest") return monthlySnapshots[monthlySnapshots.length - 1];
    return monthlySnapshots.find((s) => s.month === selectedMonth) || monthlySnapshots[monthlySnapshots.length - 1];
  }, [monthlySnapshots, selectedMonth]);

  // Consolidate detailed positions + connected API positions for the selected month
  const consolidatedAssets = useMemo(() => {
    const map = new Map<string, PerformanceAsset & { sources: Set<string> }>();

    const ignoredDustTickers = new Set([
      "NEON", "CBK", "ZRO", "PENDLE", "GRAPE", "TOMI", "RENDER",
      "NIGHT", "NIGHT-USD", "SOL", "SOL-USD",
      "SOFISA", "CDB", "LCI", "LCA", "BANCO", "TESOURO", "CONSOLIDADOS"
    ]);

    // 1. From Connected APIs (Binance, Bitcoin, etc.)
    variablePositions.forEach((pos) => {
      const rawSym = (pos.ticker || (pos as any).symbol || "").toUpperCase().trim();
      if (!rawSym || ignoredDustTickers.has(rawSym) || rawSym.startsWith("NIGHT") || rawSym.startsWith("SOL")) return;

      const norm = normalizeTicker(rawSym);
      if (!norm || norm.startsWith("NIGHT") || norm.startsWith("SOL")) return;

      const qty = Number(pos.quantity) || 0;
      const valBRL = Number(pos.currentValue) || 0;
      const appBRL = Number((pos as any).appliedAmountBRL || (pos as any).appliedAmount || (pos as any).investedValue || 0);

      if (valBRL < 10 && qty <= 0) return;

      const src = pos.broker || pos.provider || "Conectado";
      const existing = map.get(norm);

      if (existing) {
        if (!existing.sources.has(src)) {
          existing.quantity += qty;
          existing.currentValueBRL += valBRL;
          existing.appliedAmountBRL += appBRL > 0 ? appBRL : valBRL;
          existing.sources.add(src);
        }
      } else {
        map.set(norm, {
          ticker: norm,
          name: pos.name || norm,
          source: src,
          quantity: qty,
          currentValueBRL: valBRL,
          appliedAmountBRL: appBRL > 0 ? appBRL : valBRL,
          profitBRL: valBRL - (appBRL > 0 ? appBRL : valBRL),
          profitPct: appBRL > 0 ? (valBRL - appBRL) / appBRL : 0,
          sources: new Set([src]),
        });
      }
    });

    // 2. From Selected Monthly Snapshot (Detailed Positions)
    if (effectiveSnapshot?.investments) {
      effectiveSnapshot.investments.forEach((inv) => {
        if (inv.positions && inv.positions.length > 0) {
          inv.positions.forEach((p: any) => {
            const rawSym = (p.symbol || p.ticker || "").toUpperCase().trim();
            if (!rawSym || ignoredDustTickers.has(rawSym) || rawSym.startsWith("NIGHT") || rawSym.startsWith("SOL")) return;

            const norm = normalizeTicker(rawSym);
            if (!norm || norm.startsWith("NIGHT") || norm.startsWith("SOL")) return;

            const known = avenueKnownPositions[norm];
            const qty = Number(p.quantity) || (known?.quantity ?? 0);
            const valUSD = Number(p.currentValueUSD || p.nativeValue) || (known?.currentValueUSD ?? 0);
            const fx = Number(p.fxRate || p.fx) || DEFAULT_USD_BRL_FX;
            const valBRL = Number(p.currentValueBRL != null ? p.currentValueBRL : p.currentValue) || (valUSD > 0 ? valUSD * fx : 0) || (known?.currentValueBRL ?? 0);
            const appBRL = Number(p.appliedAmountBRL != null ? p.appliedAmountBRL : p.appliedAmount) || (known?.appliedAmountBRL ?? 0);
            const currP = Number(p.currentPrice || p.price || p.currentPriceUSD) || known?.currentPrice;
            const avgP = Number(p.averagePrice || p.avgPrice || p.precoMedio) || known?.averagePrice;

            if (valBRL < 10 && qty <= 0) return;

            const src = inv.name || "Foto Mensal";
            const existing = map.get(norm);

            if (existing) {
              if (!existing.sources.has(src)) {
                existing.quantity += qty;
                existing.currentValueBRL += valBRL;
                existing.appliedAmountBRL += appBRL;
                if (valUSD > 0) existing.currentValueUSD = (existing.currentValueUSD || 0) + valUSD;
                existing.sources.add(src);
              }
              if (currP) existing.currentPriceUSD = currP;
              if (avgP) existing.averagePriceUSD = avgP;
            } else {
              map.set(norm, {
                ticker: norm,
                name: p.name || known?.name || norm,
                source: src,
                quantity: qty,
                currentValueUSD: valUSD > 0 ? valUSD : (known?.currentValueUSD),
                currentValueBRL: valBRL,
                appliedAmountBRL: appBRL,
                profitBRL: valBRL - appBRL,
                profitPct: appBRL > 0 ? (valBRL - appBRL) / appBRL : (known?.profitPct ?? 0),
                currentPriceUSD: currP,
                averagePriceUSD: avgP,
                fxRate: fx,
                sources: new Set([src]),
              });
            }
          });
        }
      });
    }

    // 3. Fallback for Avenue Stocks if missing from snapshot
    Object.entries(avenueKnownPositions).forEach(([tickerKey, known]) => {
      const norm = normalizeTicker(tickerKey);
      if (!map.has(norm)) {
        map.set(norm, {
          ticker: norm,
          name: known.name,
          source: "Avenue-Dolar",
          quantity: known.quantity,
          currentValueUSD: known.currentValueUSD,
          currentValueBRL: known.currentValueBRL,
          appliedAmountBRL: known.appliedAmountBRL,
          profitBRL: known.currentValueBRL - known.appliedAmountBRL,
          profitPct: known.profitPct,
          currentPriceUSD: known.currentPrice,
          averagePriceUSD: known.averagePrice,
          fxRate: DEFAULT_USD_BRL_FX,
          sources: new Set(["Avenue-Dolar"]),
        });
      } else {
        const existing = map.get(norm)!;
        if (!existing.currentPriceUSD) existing.currentPriceUSD = known.currentPrice;
        if (!existing.averagePriceUSD) existing.averagePriceUSD = known.averagePrice;
        if (!existing.currentValueUSD) existing.currentValueUSD = known.currentValueUSD;
        if (existing.profitPct === 0 && known.profitPct !== 0) existing.profitPct = known.profitPct;
      }
    });

    const list: PerformanceAsset[] = [];
    map.forEach((item) => {
      if (item.currentValueBRL >= 10 || item.quantity > 0) {
        const profitBRL = item.currentValueBRL - item.appliedAmountBRL;
        const profitPct = item.appliedAmountBRL > 0 ? profitBRL / item.appliedAmountBRL : item.profitPct;
        const sourcesStr = Array.from(item.sources).join(", ");
        list.push({
          ticker: item.ticker,
          name: item.name,
          source: sourcesStr,
          quantity: item.quantity,
          currentValueUSD: item.currentValueUSD,
          currentValueBRL: item.currentValueBRL,
          appliedAmountBRL: item.appliedAmountBRL,
          profitBRL,
          profitPct,
          currentPriceUSD: item.currentPriceUSD,
          averagePriceUSD: item.averagePriceUSD,
          fxRate: item.fxRate || DEFAULT_USD_BRL_FX,
        });
      }
    });

    return list;
  }, [effectiveSnapshot, variablePositions]);

  // Fetch Radar data to get ATH and potential return for all tickers
  const portfolioTickers = useMemo(() => consolidatedAssets.map((a) => a.ticker), [consolidatedAssets]);
  const { data: radarResponse } = useRadarData("my_portfolio", portfolioTickers);

  // Enriched assets with radar ATH metrics
  const enrichedAssets = useMemo(() => {
    const radarMap = new Map<string, any>();
    if (radarResponse?.data) {
      radarResponse.data.forEach((s) => radarMap.set(s.ticker.toUpperCase().replace(".", "-"), s));
    }

    return consolidatedAssets.map((asset) => {
      const radar = radarMap.get(asset.ticker);
      return {
        ...asset,
        athUSD: radar?.ath,
        potentialReturnPct: radar?.potentialReturn,
      };
    });
  }, [consolidatedAssets, radarResponse]);

  // Broker filter options
  const brokerOptions = useMemo(() => {
    const set = new Set<string>();
    enrichedAssets.forEach((a) => {
      a.source.split(", ").forEach((s) => set.add(s.trim()));
    });
    return Array.from(set);
  }, [enrichedAssets]);

  // Filtered & Sorted assets
  const sortedAssets = useMemo(() => {
    let result = enrichedAssets.filter((a) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || a.ticker.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.source.toLowerCase().includes(q);
      const matchesBroker = filterBroker === "all" || a.source.includes(filterBroker);
      return matchesSearch && matchesBroker;
    });

    result.sort((a, b) => {
      if (sortBy === "profitPct") return b.profitPct - a.profitPct;
      if (sortBy === "profitBRL") return b.profitBRL - a.profitBRL;
      if (sortBy === "currentValue") return b.currentValueBRL - a.currentValueBRL;
      if (sortBy === "potential") return (b.potentialReturnPct || 0) - (a.potentialReturnPct || 0);
      return 0;
    });

    return result;
  }, [enrichedAssets, searchQuery, filterBroker, sortBy]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalValue = enrichedAssets.reduce((s, a) => s + a.currentValueBRL, 0);
    const totalApplied = enrichedAssets.reduce((s, a) => s + a.appliedAmountBRL, 0);
    const totalProfitBRL = totalValue - totalApplied;
    const weightedProfitPct = totalApplied > 0 ? totalProfitBRL / totalApplied : 0;

    // Top Gainer by %
    const topGainer = [...enrichedAssets].sort((a, b) => b.profitPct - a.profitPct)[0];
    // Top Profit by R$
    const topProfitR$ = [...enrichedAssets].sort((a, b) => b.profitBRL - a.profitBRL)[0];
    // Worst Performer by %
    const worstGainer = [...enrichedAssets].sort((a, b) => a.profitPct - b.profitPct)[0];

    return {
      totalValue,
      totalApplied,
      totalProfitBRL,
      weightedProfitPct,
      topGainer,
      topProfitR$,
      worstGainer,
      count: enrichedAssets.length,
    };
  }, [enrichedAssets]);

  // Bar Chart Data (Top 7 Gainers by %)
  const chartData = useMemo(() => {
    const top7 = [...enrichedAssets]
      .sort((a, b) => b.profitPct - a.profitPct)
      .slice(0, 8)
      .map((a) => ({
        ticker: a.ticker,
        profitPct: Number((a.profitPct * 100).toFixed(2)),
        profitBRL: a.profitBRL,
      }));
    return top7;
  }, [enrichedAssets]);

  const isLoading = snapshotsLoading || variableLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Flame className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                Maiores Altas e Desempenho
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                  Renda Variável
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Ranking consolidado dos seus ativos detalhados e conectados que mais valorizaram
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/radar">
              <Button variant="outline" size="sm">
                <Target className="w-4 h-4 mr-1 text-primary" /> Radar de Assimetria
              </Button>
            </Link>
            {snapshotOptions.length > 0 && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Mês Atual (Recente)</SelectItem>
                  {snapshotOptions.map((s) => (
                    <SelectItem key={s.month} value={s.month}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Top Gainer */}
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  🥇 Maior Alta (%)
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Trophy className="w-4 h-4" />
                </span>
              </div>
              {summaryMetrics.topGainer ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-foreground">
                      {summaryMetrics.topGainer.ticker}
                    </span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatPct(summaryMetrics.topGainer.profitPct)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{summaryMetrics.topGainer.name}</p>
                  <div className="text-[11px] text-emerald-400/90 mt-1 font-mono">
                    Lucro: {formatBRL(summaryMetrics.topGainer.profitBRL)} · {summaryMetrics.topGainer.source}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Top Profit in R$ */}
          <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/5 via-card to-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  💰 Maior Lucro (R$)
                </span>
                <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              {summaryMetrics.topProfitR$ ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-foreground">
                      {summaryMetrics.topProfitR$.ticker}
                    </span>
                    <span className="text-base font-bold text-teal-400">
                      +{formatBRL(summaryMetrics.topProfitR$.profitBRL)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{summaryMetrics.topProfitR$.name}</p>
                  <div className="text-[11px] text-teal-400/90 mt-1 font-mono">
                    Rentabilidade: {formatPct(summaryMetrics.topProfitR$.profitPct)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Weighted Return */}
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  📊 Retorno Médio RV
                </span>
                <span className="p-1.5 rounded-lg bg-primary/20 text-primary">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div>
                <span className={`text-2xl font-black ${summaryMetrics.weightedProfitPct >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {formatPct(summaryMetrics.weightedProfitPct)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Lucro Global: <strong className={summaryMetrics.totalProfitBRL >= 0 ? "text-emerald-400" : "text-destructive"}>
                    {formatBRL(summaryMetrics.totalProfitBRL)}
                  </strong>
                </p>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Consolidando {summaryMetrics.count} ativos de RV
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Total RV Patrimony */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  💼 Patrimônio em RV
                </span>
                <span className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-foreground">
                  {formatBRL(summaryMetrics.totalValue)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Aplicado: {formatBRL(summaryMetrics.totalApplied)}
                </p>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {effectiveSnapshot ? `Snapshot: ${effectiveSnapshot.label}` : "Ativos Conectados & Fotos"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visual Bar Chart Ranking */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> Top Altas (%) - Renda Variável
              </CardTitle>
              <CardDescription className="text-xs">
                Comparativo visual dos ativos que apresentaram maior valorização acumulada
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              Top {chartData.length} Ativos
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <XAxis dataKey="ticker" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [
                      `${value}% (${formatBRL(item.payload.profitBRL)})`,
                      "Rentabilidade",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="profitPct" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.profitPct >= 100
                            ? "#10b981"
                            : entry.profitPct >= 20
                            ? "#34d399"
                            : entry.profitPct >= 0
                            ? "#60a5fa"
                            : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Filter Controls & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card/60 p-4 border border-border rounded-xl">
          {/* Sorting Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Ordernar por:</span>
            <Button
              variant={sortBy === "profitPct" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("profitPct")}
              className="text-xs h-8"
            >
              🔥 Maior Alta (%)
            </Button>
            <Button
              variant={sortBy === "profitBRL" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("profitBRL")}
              className="text-xs h-8"
            >
              💰 Maior Lucro (R$)
            </Button>
            <Button
              variant={sortBy === "currentValue" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("currentValue")}
              className="text-xs h-8"
            >
              📊 Maior Posição (R$)
            </Button>
            <Button
              variant={sortBy === "potential" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("potential")}
              className="text-xs h-8"
            >
              🎯 Potencial (ATH)
            </Button>
          </div>

          {/* Search & Broker Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar ticker/corretora..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            {brokerOptions.length > 0 && (
              <Select value={filterBroker} onValueChange={setFilterBroker}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Corretora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Corretoras</SelectItem>
                  {brokerOptions.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Detailed Performance Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 text-center font-bold">Rank</TableHead>
                  <TableHead className="font-semibold">Ativo / Ticker</TableHead>
                  <TableHead className="font-semibold text-right">Origem / Corretora</TableHead>
                  <TableHead className="font-semibold text-right">Preço Médio</TableHead>
                  <TableHead className="font-semibold text-right">Preço Atual</TableHead>
                  <TableHead className="font-semibold text-right text-primary">Valor Atual (R$)</TableHead>
                  <TableHead className="font-semibold text-right">Lucro (R$)</TableHead>
                  <TableHead className="font-semibold text-right">Rentabilidade</TableHead>
                  <TableHead className="font-semibold text-right">Potencial (ATH)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Carregando posições de renda variável...
                    </TableCell>
                  </TableRow>
                ) : sortedAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      Nenhum ativo encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAssets.map((asset, index) => {
                    const isPositive = asset.profitPct >= 0;
                    const rankMedal =
                      index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;

                    return (
                      <TableRow key={asset.ticker} className={index < 3 ? "bg-emerald-500/5 font-medium" : ""}>
                        <TableCell className="text-center font-bold text-base whitespace-nowrap">
                          {rankMedal}
                        </TableCell>
                        <TableCell className="font-bold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{asset.ticker}</span>
                            {asset.profitPct >= 1.0 && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                +100% 🚀
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-normal truncate max-w-[180px]">
                            {asset.name} · {asset.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} un.
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {asset.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap text-xs">
                          {asset.averagePriceUSD ? formatUSD(asset.averagePriceUSD) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap text-xs">
                          {asset.currentPriceUSD ? formatUSD(asset.currentPriceUSD) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary whitespace-nowrap">
                          {formatBRL(asset.currentValueBRL)}
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {asset.currentValueUSD ? `${formatUSD(asset.currentValueUSD)} · FX ${asset.fxRate || 5.0740}` : `Aplicado: ${formatBRL(asset.appliedAmountBRL)}`}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold whitespace-nowrap ${isPositive ? "text-emerald-400" : "text-destructive"}`}>
                          {isPositive ? "+" : ""}{formatBRL(asset.profitBRL)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                            isPositive ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"
                          }`}>
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {formatPct(asset.profitPct)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap text-xs">
                          {asset.potentialReturnPct !== undefined ? (
                            <span className="text-emerald-400 font-semibold">
                              +{formatPct(asset.potentialReturnPct)}
                            </span>
                          ) : (
                            "—"
                          )}
                          {asset.athUSD && (
                            <div className="text-[10px] text-muted-foreground">
                              ATH: {formatUSD(asset.athUSD)}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VariableIncomeMoversDashboard;
