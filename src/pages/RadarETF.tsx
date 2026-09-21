import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  TrendingUp,
  ShieldAlert,
  Info,
  DollarSign,
  Activity,
  Zap,
  BarChart3,
  Layers,
  Sparkles,
  PieChart,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ETF_UNIVERSE } from "@/features/etfRadar/universe/etfUniverseData";
import { etfMarketDataEngine } from "@/features/etfRadar/marketData/etfMarketDataEngine";
import { calculateEtfScore } from "@/features/etfRadar/scores/etfScoreEngine";
import { detectEtfTrend } from "@/features/etfRadar/trends/etfTrendDetector";
import { getEtfHoldingsDrilldown, type ETFHoldingsDrilldown } from "@/features/etfRadar/portfolios/etfPortfolioModel";
import { etfBacktestEngine, DEFAULT_PRESET_STRATEGIES } from "@/features/etfRadar/backtests/etfBacktestEngine";
import type {
  ETFMetrics,
  ETFScoreBreakdown,
  ETFTrendSignal,
  ETFCategory,
  RebalanceFrequency,
  BacktestSummaryResult,
} from "@/features/etfRadar/types";

export default function RadarETF() {
  const [currencyMode, setCurrencyMode] = useState<"USD" | "BRL">("USD");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [fxRate, setFxRate] = useState(5.45);

  // Drilldown modal state
  const [activeDrilldown, setActiveDrilldown] = useState<ETFHoldingsDrilldown | null>(null);

  // Backtest state
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("STRATEGY_B");
  const [rebalanceFreq, setRebalanceFreq] = useState<RebalanceFrequency>("ANNUAL");
  const [initialCapital, setInitialCapital] = useState<number>(10000);

  // Instant synchronous calculation for 0ms initial render (no preview lag)
  const { metricsMap, scoresMap, trendsMap } = useMemo(() => {
    const metricsList = etfMarketDataEngine.getAllMetricsSync(fxRate);
    const mAcc: Record<string, ETFMetrics> = {};
    const sAcc: Record<string, ETFScoreBreakdown> = {};
    const tAcc: Record<string, ETFTrendSignal> = {};

    metricsList.forEach((m) => {
      mAcc[m.ticker] = m;
      sAcc[m.ticker] = calculateEtfScore(m);
      tAcc[m.ticker] = detectEtfTrend(m);
    });

    return { metricsMap: mAcc, scoresMap: sAcc, trendsMap: tAcc };
  }, [fxRate]);

  // Non-blocking background FX rate check
  useEffect(() => {
    let isMounted = true;
    etfMarketDataEngine.getFxRateBRL().then((currentFx) => {
      if (isMounted && currentFx && currentFx !== fxRate) {
        setFxRate(currentFx);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Backtest memoized calculation
  const backtestResult = useMemo(() => {
    const strat = DEFAULT_PRESET_STRATEGIES.find((s) => s.id === selectedStrategyId) || DEFAULT_PRESET_STRATEGIES[0];
    return etfBacktestEngine.runBacktest(strat, initialCapital, rebalanceFreq);
  }, [selectedStrategyId, rebalanceFreq, initialCapital]);

  const filteredEtfs = useMemo(() => {
    return ETF_UNIVERSE.filter((etf) => {
      const matchSearch =
        etf.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        etf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        etf.theme.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = selectedCategory === "ALL" || etf.category === selectedCategory;

      return matchSearch && matchCategory;
    }).sort((a, b) => {
      const scoreA = scoresMap[a.ticker]?.totalScore ?? 0;
      const scoreB = scoresMap[b.ticker]?.totalScore ?? 0;
      return scoreB - scoreA;
    });
  }, [searchQuery, selectedCategory, scoresMap]);

  const categoriesList: { id: string; label: string }[] = [
    { id: "ALL", label: "Todas as Categorias" },
    { id: "BROAD_MARKET", label: "Mercado Amplo (S&P 500)" },
    { id: "TECH_SEMIS", label: "Tech & Semicondutores" },
    { id: "AI_AUTOMATION", label: "Inteligência Artificial" },
    { id: "ENERGY_NUCLEAR", label: "Energia & Urânio" },
    { id: "INFRA_MATERIALS", label: "Infraestrutura & Mineração" },
    { id: "CYBERSECURITY", label: "Cibersegurança" },
    { id: "FINANCIALS", label: "Financeiro" },
    { id: "HEALTHCARE", label: "Saúde & Biotech" },
  ];

  const getStatusBadge = (status: ETFScoreBreakdown["status"]) => {
    switch (status) {
      case "STRONG_BUY":
        return <Badge className="bg-emerald-600 text-white font-semibold">Forte Compra</Badge>;
      case "ACCUMULATE":
        return <Badge className="bg-blue-600 text-white font-semibold">Acumular</Badge>;
      case "NEUTRAL":
        return <Badge className="bg-amber-600 text-white font-semibold">Neutro</Badge>;
      case "UNDERPERFORM":
        return <Badge className="bg-rose-600 text-white font-semibold">Fraco</Badge>;
    }
  };

  const getTrendBadge = (trend: "BULLISH" | "NEUTRAL" | "BEARISH") => {
    switch (trend) {
      case "BULLISH":
        return <span className="text-emerald-500 font-medium text-xs flex items-center gap-1">▲ De Alta</span>;
      case "NEUTRAL":
        return <span className="text-amber-500 font-medium text-xs flex items-center gap-1">▶ Lateral</span>;
      case "BEARISH":
        return <span className="text-rose-500 font-medium text-xs flex items-center gap-1">▼ De Baixa</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 space-y-6">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/radar" className="text-muted-foreground hover:text-foreground transition-colors flex items-center text-sm gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Radar de Ações
            </Link>
            <span className="text-border">•</span>
            <span className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" /> Módulo 100% Isolado
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            ETF Radar <span className="text-cyan-500 dark:text-cyan-400 font-light text-xl">| Tendências Globais</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Identificação cirúrgica de grandes tendências macroeconômicas, pontuação multisetorial (0-100) e simulação autônoma de backtests.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-3 bg-card border border-border p-1.5 rounded-xl self-start md:self-auto shadow-sm">
          <span className="text-xs text-muted-foreground px-2 font-medium">Moeda:</span>
          <Button
            variant={currencyMode === "USD" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrencyMode("USD")}
            className={currencyMode === "USD" ? "bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold" : "text-xs text-muted-foreground"}
          >
            USD ($)
          </Button>
          <Button
            variant={currencyMode === "BRL" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrencyMode("BRL")}
            className={currencyMode === "BRL" ? "bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold" : "text-xs text-muted-foreground"}
          >
            BRL (R$)
          </Button>
          <div className="text-[11px] text-muted-foreground px-2 border-l border-border">
            USD/BRL: <span className="text-foreground font-semibold">R$ {fxRate.toFixed(2)}</span>
          </div>
        </div>
      </header>

      {/* ISOLATION GUARANTEE BANNER */}
      <div className="bg-card/70 border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-foreground shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
          <span>
            <strong className="text-foreground">Garantia de Isolamento Absoluto:</strong> O ETF Radar consome dados em modo leitura e calcula scores exclusivos (0-100). Ele não altera sua carteira existente, nem seus scores de ações ou limites fiscais.
          </span>
        </div>
      </div>

      {/* STATS HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Universo de ETFs</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{ETF_UNIVERSE.length} ETFs Liquid</h3>
              <p className="text-[11px] text-cyan-500 dark:text-cyan-400 mt-1">EUA, Semicondutores, IA & Urânio</p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-500 dark:text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Benchmark Primário</p>
              <h3 className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 mt-1">+24.5% <span className="text-xs font-normal text-muted-foreground">(1Y S&P)</span></h3>
              <p className="text-[11px] text-muted-foreground mt-1">Referência vs CDI (R$)</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500 dark:text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Maior Score Atual</p>
              <h3 className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1">SMH <span className="text-sm font-normal text-amber-600 dark:text-amber-300">(88/100)</span></h3>
              <p className="text-[11px] text-muted-foreground mt-1">Setor: Semicondutores</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tendência Dominante</p>
              <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">Inteligência Artificial</h3>
              <p className="text-[11px] text-muted-foreground mt-1">SOXX, SMH, AIQ em alta tripla</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MAIN CONTENT TABS */}
      <Tabs defaultValue="scores" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          <TabsList className="bg-muted p-1 border border-border">
            <TabsTrigger value="scores" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 mr-2" /> ETF Scores & Métricas
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4 mr-2" /> Tendências Multitemporais
            </TabsTrigger>
            <TabsTrigger value="backtest" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-xs sm:text-sm">
              <Activity className="w-4 h-4 mr-2" /> Simulador de Backtest
            </TabsTrigger>
          </TabsList>

          {/* Search and Category filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar ETF, tema ou ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border text-xs text-foreground w-48 sm:w-64 h-9 focus-visible:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* TAB 1: ETF SCORES & METRICS TABLE */}
        <TabsContent value="scores" className="space-y-4 m-0">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 border ${
                  selectedCategory === cat.id
                    ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 font-semibold"
                    : "bg-card text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* ETFs Main Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">ETF / Ticker</th>
                    <th className="py-3.5 px-3">Tema Estrutural</th>
                    <th className="py-3.5 px-3 text-right">Preço ({currencyMode})</th>
                    <th className="py-3.5 px-3 text-center">ETF Score</th>
                    <th className="py-3.5 px-3 text-center">Sinal</th>
                    <th className="py-3.5 px-3 text-right">Ret. 1Y</th>
                    <th className="py-3.5 px-3 text-right" title="Rentabilidade Anualizada Composta nos últimos 10 anos">CAGR (10 Anos)</th>
                    <th className="py-3.5 px-3 text-right">Max DD</th>
                    <th className="py-3.5 px-3 text-right">Sharpe</th>
                    <th className="py-3.5 px-3 text-right">Alpha S&P</th>
                    <th className="py-3.5 px-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEtfs.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-muted-foreground">
                        Nenhum ETF encontrado para o filtro aplicado.
                      </td>
                    </tr>
                  ) : (
                    filteredEtfs.map((etf) => {
                      const m = metricsMap[etf.ticker];
                      const s = scoresMap[etf.ticker];
                      if (!m || !s) return null;

                      const priceFormatted =
                        currencyMode === "USD"
                          ? `$${m.currentPriceUSD.toFixed(2)}`
                          : `R$ ${m.priceBRL.toFixed(2)}`;

                      const return1YFormatted =
                        currencyMode === "USD" ? `${m.return1YPct.toFixed(1)}%` : `${m.return1YBRLPct.toFixed(1)}%`;

                      return (
                        <tr key={etf.ticker} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-cyan-600 dark:text-cyan-400">{etf.ticker}</span>
                              <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">{etf.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-foreground">
                            <span className="bg-muted px-2 py-0.5 rounded text-[11px] border border-border">
                              {etf.theme}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-semibold text-foreground">
                            {priceFormatted}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center justify-center bg-muted/60 px-2.5 py-1 rounded-lg border border-border font-bold text-sm text-cyan-600 dark:text-cyan-400">
                              {s.totalScore} <span className="text-[10px] text-muted-foreground ml-0.5">/100</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">{getStatusBadge(s.status)}</td>
                          <td className={`py-3.5 px-3 text-right font-mono font-medium ${m.return1YPct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {m.return1YPct >= 0 ? "+" : ""}{return1YFormatted}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-foreground font-medium" title="Taxa Anual Composta (10 anos)">
                            {m.cagrPct.toFixed(1)}% a.a.
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-rose-500">{m.maxDrawdownPct.toFixed(1)}%</td>
                          <td className="py-3.5 px-3 text-right font-mono text-foreground">{m.sharpeRatio.toFixed(2)}</td>
                          <td className={`py-3.5 px-3 text-right font-mono font-medium ${m.alphaVsSp500Pct >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                            {m.alphaVsSp500Pct >= 0 ? "+" : ""}{m.alphaVsSp500Pct.toFixed(1)}%
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveDrilldown(getEtfHoldingsDrilldown(etf.ticker) || null)}
                              className="h-7 text-[11px] bg-background hover:bg-muted border-border text-cyan-600 dark:text-cyan-400"
                            >
                              Ver Ativos
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: MULTI-HORIZON TREND DETECTION */}
        <TabsContent value="trends" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEtfs.map((etf) => {
              const t = trendsMap[etf.ticker];
              const s = scoresMap[etf.ticker];
              const m = metricsMap[etf.ticker];
              if (!t || !s || !m) return null;

              return (
                <Card key={etf.ticker} className="bg-card border-border hover:border-border/80 transition-all shadow-sm">
                  <CardHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between space-y-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">{etf.ticker}</span>
                        <Badge variant="outline" className="text-[10px] bg-muted border-border text-cyan-600 dark:text-cyan-400">
                          {etf.theme}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{etf.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-muted-foreground">Alinhamento</div>
                      <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{t.alignmentScore}%</div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {/* Horizons Breakdown */}
                    <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg border border-border text-center">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Curto Prazo</div>
                        <div className="text-xs mt-1">{getTrendBadge(t.shortTermTrend)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">3-12M</div>
                      </div>
                      <div className="border-x border-border">
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Médio Prazo</div>
                        <div className="text-xs mt-1">{getTrendBadge(t.mediumTermTrend)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">1-3Y</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Longo Prazo</div>
                        <div className="text-xs mt-1">{getTrendBadge(t.longTermTrend)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">3-10Y+</div>
                      </div>
                    </div>

                    {/* Driver Summary Narrative */}
                    <p className="text-xs text-foreground leading-relaxed bg-muted/20 p-2.5 rounded border border-border/60">
                      {t.driverSummary}
                    </p>

                    {/* Metrics quick glance */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                      <span className="text-muted-foreground">Ret. 1Y: <strong className="text-emerald-500">{m.return1YPct}%</strong></span>
                      <span className="text-muted-foreground">Sharpe: <strong className="text-foreground">{m.sharpeRatio}</strong></span>
                      <span className="text-muted-foreground">Beta: <strong className="text-cyan-600 dark:text-cyan-400">{m.beta}</strong></span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: BACKTEST SIMULATOR */}
        <TabsContent value="backtest" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel Card */}
            <Card className="bg-card border-border shadow-sm space-y-4">
              <CardHeader className="p-4 pb-2 border-b border-border">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Parâmetros da Simulação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                {/* Strategy Selector */}
                <div className="space-y-1.5">
                  <label className="text-foreground font-semibold">Selecione a Estratégia:</label>
                  <div className="space-y-2">
                    {DEFAULT_PRESET_STRATEGIES.map((strat) => (
                      <div
                        key={strat.id}
                        onClick={() => setSelectedStrategyId(strat.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedStrategyId === strat.id
                            ? "bg-cyan-500/10 border-cyan-500/50 text-foreground"
                            : "bg-background border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                        }`}
                      >
                        <div className="font-semibold text-sm text-cyan-600 dark:text-cyan-400">{strat.name}</div>
                        <p className="text-[11px] text-muted-foreground mt-1">{strat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rebalance Frequency */}
                <div className="space-y-1.5">
                  <label className="text-foreground font-semibold">Frequência de Rebalanceamento:</label>
                  <select
                    value={rebalanceFreq}
                    onChange={(e) => setRebalanceFreq(e.target.value as RebalanceFrequency)}
                    className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-cyan-500"
                  >
                    <option value="BUY_AND_HOLD">Buy & Hold (Sem rebalanceamento)</option>
                    <option value="ANNUAL">Rebalanceamento Anual (Recomendado)</option>
                    <option value="SEMIANNUAL">Rebalanceamento Semestral</option>
                    <option value="QUARTERLY">Rebalanceamento Trimestral</option>
                    <option value="MONTHLY">Rebalanceamento Mensal</option>
                  </select>
                </div>

                {/* Initial Capital */}
                <div className="space-y-1.5">
                  <label className="text-foreground font-semibold">Aporte Inicial (USD $):</label>
                  <Input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value) || 1000)}
                    className="bg-background border-border text-foreground text-xs h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results Display Area */}
            <div className="lg:col-span-2 space-y-4">
              {backtestResult && (
                <>
                  {/* Results Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="bg-card border-border shadow-sm">
                      <CardContent className="p-3">
                        <span className="text-[11px] text-muted-foreground">Patrimônio Final</span>
                        <div className="text-lg font-bold text-emerald-500 mt-0.5">
                          ${backtestResult.finalValueUSD.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          R$ {backtestResult.finalValueBRL.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-sm">
                      <CardContent className="p-3">
                        <span className="text-[11px] text-muted-foreground">Retorno Total (CAGR)</span>
                        <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                          +{backtestResult.totalReturnPctUSD.toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">CAGR: {backtestResult.cagrPct.toFixed(1)}% a.a.</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-sm">
                      <CardContent className="p-3">
                        <span className="text-[11px] text-muted-foreground">Volatilidade / Drawdown</span>
                        <div className="text-lg font-bold text-amber-500 mt-0.5">
                          {backtestResult.volatilityPct.toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-rose-500">Max DD: {backtestResult.maxDrawdownPct.toFixed(1)}%</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-sm">
                      <CardContent className="p-3">
                        <span className="text-[11px] text-muted-foreground">Índice Sharpe</span>
                        <div className="text-lg font-bold text-foreground mt-0.5">
                          {backtestResult.sharpeRatio.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-emerald-500">
                          {backtestResult.positiveYearsCount}/{backtestResult.totalYearsCount} anos positivos
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Yearly Details Table */}
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
                      <CardTitle className="text-sm text-foreground">Evolução Anual Histórica (2016–2025)</CardTitle>
                      <Badge variant="outline" className="text-[11px] bg-muted border-border text-foreground">
                        {rebalanceFreq}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-foreground">
                          <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                            <tr>
                              <th className="py-2.5 px-4">Ano</th>
                              <th className="py-2.5 px-3 text-right">Retorno USD</th>
                              <th className="py-2.5 px-3 text-right">Retorno BRL (Efeito Câmbio)</th>
                              <th className="py-2.5 px-4 text-right">Saldo Final (USD)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {backtestResult.yearlyDetails.map((y) => (
                              <tr key={y.year} className="hover:bg-muted/30 font-mono">
                                <td className="py-2.5 px-4 font-bold text-foreground font-sans">{y.year}</td>
                                <td className={`py-2.5 px-3 text-right font-medium ${y.returnUSD >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                  {y.returnUSD >= 0 ? "+" : ""}{y.returnUSD.toFixed(2)}%
                                </td>
                                <td className={`py-2.5 px-3 text-right font-medium ${y.returnBRL >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                  {y.returnBRL >= 0 ? "+" : ""}{y.returnBRL.toFixed(2)}%
                                </td>
                                <td className="py-2.5 px-4 text-right text-foreground font-bold">
                                  ${y.portfolioValueUSD.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Historical Integrity Notes */}
                  {backtestResult.historicalIntegrityNotes.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-200 space-y-1">
                      <div className="font-semibold flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" /> Notas de Integridade Histórica:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-600/90 dark:text-amber-300/80">
                        {backtestResult.historicalIntegrityNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* HOLDINGS DRILLDOWN MODAL */}
      {activeDrilldown && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">{activeDrilldown.ticker}</h3>
                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">
                    {activeDrilldown.theme}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{activeDrilldown.etfName}</p>
              </div>
              <button
                onClick={() => setActiveDrilldown(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border">
                <span>Concentração nas Top Holdings:</span>
                <strong className="text-cyan-600 dark:text-cyan-400">{activeDrilldown.topHoldingsConcentrationPct}% do ETF</strong>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Principais Posições Subjacentes:</h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {activeDrilldown.holdings.map((h) => (
                    <div
                      key={h.symbol}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground font-mono">{h.symbol}</span>
                        <span className="text-muted-foreground text-[11px] truncate max-w-[200px]">{h.name}</span>
                      </div>
                      <span className="font-bold text-emerald-500 font-mono">{h.weightPct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informational Disclaimer Box */}
              <div className="bg-muted/40 p-3 rounded-lg border border-border text-[11px] text-muted-foreground leading-relaxed">
                <Info className="w-3.5 h-3.5 inline mr-1 text-cyan-500" />
                {activeDrilldown.disclaimer}
              </div>
            </div>

            <div className="pt-2 text-right border-t border-border">
              <Button size="sm" onClick={() => setActiveDrilldown(null)} variant="secondary" className="text-xs">
                Fechar Visualização
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
