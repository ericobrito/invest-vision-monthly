import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSnapshots } from "@/hooks/useSnapshots";
import intelligentPlanEngine, {
  DEFAULT_PLAN_CONFIG,
  type StockPositionInput,
} from "@/features/intelligentPlan/intelligentPlanEngine";
import intelligentPlanSimulator from "@/features/intelligentPlan/intelligentPlanSimulator";
import IntelligentPlanConfigDialog from "@/components/intelligentPlan/IntelligentPlanConfigDialog";
import type { IntelligentPlanConfig, OperationalAlertState } from "@/features/intelligentPlan/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  DollarSign,
  PieChart,
  Calculator,
  History,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Zap,
  Filter,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";

export default function IntelligentPlan() {
  const { data: snapshots = [], isLoading } = useSnapshots();
  const [config, setConfig] = useState<IntelligentPlanConfig>(DEFAULT_PLAN_CONFIG);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [simulationDrawdown, setSimulationDrawdown] = useState<number>(-15);

  // Search & Sorting state for Diagnostic Cards
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "profit" | "excess" | "alert" | "symbol">("value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Table sorting state for Section 3
  const [tableSortField, setTableSortField] = useState<"symbol" | "currentPositionBRL" | "suggestedSaleBRL" | "suggestedSalePct" | "remainingPositionBRL" | "newWeightPct" | "cashGeneratedBRL">("suggestedSaleBRL");
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("desc");

  // Detailed Stock Positions (Variable Income strictly at individual asset/stock level loaded dynamically from snapshots)
  const stockPositions: StockPositionInput[] = useMemo(() => {
    const defaultPositions: StockPositionInput[] = [
      {
        symbol: "META",
        name: "Meta Platforms Inc.",
        category: "Ação EUA",
        quantity: 14.08,
        averagePrice: 320.5,
        currentPrice: 520.4,
        currency: "USD",
        fxRate: 5.45,
        currentValueBRL: 39958,
        appliedAmountBRL: 24580,
      },
      {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        category: "Ação EUA",
        quantity: 25.0,
        averagePrice: 135.0,
        currentPrice: 178.2,
        currency: "USD",
        fxRate: 5.45,
        currentValueBRL: 24282,
        appliedAmountBRL: 18393,
      },
      {
        symbol: "NVDA",
        name: "NVIDIA Corp.",
        category: "Ação EUA",
        quantity: 35.0,
        averagePrice: 85.0,
        currentPrice: 118.5,
        currency: "USD",
        fxRate: 5.45,
        currentValueBRL: 22604,
        appliedAmountBRL: 16214,
      },
      {
        symbol: "BTC",
        name: "Bitcoin",
        category: "Criptoativo",
        quantity: 0.1596,
        averagePrice: 29882.78,
        currentPrice: 73500.0,
        currency: "USD",
        fxRate: 5.45,
        currentValueBRL: 63845,
        appliedAmountBRL: 26000,
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        category: "Criptoativo",
        quantity: 3.116,
        averagePrice: 1695.0,
        currentPrice: 2433.6,
        currency: "USD",
        fxRate: 5.45,
        currentValueBRL: 41328,
        appliedAmountBRL: 28800,
      },
    ];

    if (!snapshots || snapshots.length === 0) return defaultPositions;

    const latestSnapshot = snapshots[snapshots.length - 1];

    const normalizeTicker = (symbol: string, name: string): string => {
      const symUpper = (symbol || "").toUpperCase().trim();
      const nameUpper = (name || "").toUpperCase().trim();
      if (symUpper === "BITCOIN" || nameUpper === "BITCOIN" || nameUpper.includes("BITCOIN USD")) return "BTC";
      if (symUpper === "ETHEREUM" || nameUpper === "ETHEREUM" || nameUpper.includes("ETHEREUM USD")) return "ETH";
      if (symUpper === "SOLANA" || nameUpper === "SOLANA") return "SOL";
      if (symUpper === "TETHER" || nameUpper.includes("TETHER")) return "USDT";
      return symUpper;
    };

    const inferCategory = (symbol: string, name: string, currency: string, region?: string, incomeType?: string) => {
      const symUpper = normalizeTicker(symbol, name);
      const nameUpper = (name || "").toUpperCase();
      const cryptoSymbols = ["BTC", "ETH", "USDT", "USDC", "SOL", "ADA", "XRP", "DOT", "DOGE", "LINK", "UNI", "MATIC", "AVAX", "LTC", "PEPE", "SHIB"];
      if (
        cryptoSymbols.includes(symUpper) ||
        nameUpper.includes("BITCOIN") ||
        nameUpper.includes("CRIPTO") ||
        nameUpper.includes("ETHEREUM") ||
        nameUpper.includes("BINANCE") ||
        nameUpper.includes("COINBASE") ||
        nameUpper.includes("BYBIT")
      ) {
        return "Criptoativo" as const;
      }
      if (symUpper.endsWith("11") || nameUpper.includes("ETF") || nameUpper.includes("FII") || nameUpper.includes("FUNDO")) {
        return "ETF" as const;
      }
      if (currency === "USD" || region === "exterior" || nameUpper.includes("EUA") || nameUpper.includes("AVENUE") || nameUpper.includes("STOCKS")) {
        return "Ação EUA" as const;
      }
      return "Ação Brasil" as const;
    };

    const rawItems: StockPositionInput[] = [];

    for (const inv of latestSnapshot.investments || []) {
      if (inv.positions && inv.positions.length > 0) {
        for (const p of inv.positions) {
          const rawSym = p.symbol || p.ticker || "ATIVO";
          const sym = normalizeTicker(rawSym, p.name || "");
          if (["PETR4", "PETR3", "VALE3", "SMH"].includes(sym)) continue;

          const pName = p.name || sym;
          const currency = p.currency || inv.currency || "BRL";
          const fxRate = p.fxRate || 1.0;
          const currentValueBRL = p.currentValueBRL ?? (p.currentValue * fxRate);
          const appliedAmountBRL = p.appliedAmountBRL ?? (p.appliedAmount * fxRate);

          rawItems.push({
            symbol: sym,
            name: pName,
            category: inferCategory(sym, pName, currency, inv.region, inv.incomeType),
            quantity: p.quantity || 0,
            averagePrice: p.averagePrice || 0,
            currentPrice: p.currentPrice || 0,
            currency: currency,
            fxRate: fxRate,
            currentValueBRL: currentValueBRL,
            appliedAmountBRL: appliedAmountBRL,
          });
        }
      } else if (inv.incomeType === "variable" || inv.flags?.includeInVariablePositions) {
        const rawSym = inv.linkedAsset?.symbol || inv.name || "ATIVO";
        const sym = normalizeTicker(rawSym, inv.name || "");
        if (["PETR4", "PETR3", "VALE3", "SMH"].includes(sym)) continue;

        const currency = inv.currency || "BRL";
        const valBRL = inv.valueBRL ?? inv.value;
        const appBRL = inv.appliedBRL ?? inv.value;

        rawItems.push({
          symbol: sym,
          name: inv.name,
          category: inferCategory(sym, inv.name, currency, inv.region, inv.incomeType),
          quantity: inv.quantity || 1,
          averagePrice: inv.averagePrice || appBRL,
          currentPrice: inv.currentPrice || valBRL,
          currency: currency,
          fxRate: 1.0,
          currentValueBRL: valBRL,
          appliedAmountBRL: appBRL,
        });
      }
    }

    // Consolidated / Deduplicated Map by Symbol Ticker
    const consolidatedMap = new Map<string, StockPositionInput>();

    for (const item of rawItems) {
      const existing = consolidatedMap.get(item.symbol);
      if (!existing) {
        consolidatedMap.set(item.symbol, { ...item });
      } else {
        const totalValueBRL = (existing.currentValueBRL || 0) + (item.currentValueBRL || 0);
        const totalAppliedBRL = (existing.appliedAmountBRL || 0) + (item.appliedAmountBRL || 0);
        const totalQuantity = existing.quantity + item.quantity;
        const avgPrice = totalQuantity > 0 ? totalAppliedBRL / totalQuantity : existing.averagePrice;
        const currPrice = totalQuantity > 0 ? totalValueBRL / totalQuantity : existing.currentPrice;

        consolidatedMap.set(item.symbol, {
          symbol: item.symbol,
          name: item.symbol === "BTC" ? "Bitcoin (BTC)" : item.symbol === "ETH" ? "Ethereum (ETH)" : existing.name,
          category: existing.category === "Criptoativo" || item.category === "Criptoativo" ? "Criptoativo" : existing.category,
          quantity: totalQuantity,
          averagePrice: avgPrice,
          currentPrice: currPrice,
          currency: existing.currency,
          fxRate: existing.fxRate,
          currentValueBRL: totalValueBRL,
          appliedAmountBRL: totalAppliedBRL,
        });
      }
    }

    const extracted = Array.from(consolidatedMap.values());
    return extracted.length > 0 ? extracted : defaultPositions;
  }, [snapshots]);

  // Filter stock positions by selected category
  const filteredStockPositions = useMemo(() => {
    if (selectedCategory === "ALL") return stockPositions;
    return stockPositions.filter((p) => p.category === selectedCategory);
  }, [stockPositions, selectedCategory]);

  // Run Intelligent Plan Engine strictly for Variable Income at stock level
  const analysis = useMemo(() => {
    return intelligentPlanEngine.analyzeVariableIncomePortfolio(filteredStockPositions, config);
  }, [filteredStockPositions, config]);

  // Dynamic category asset count badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: stockPositions.length,
      "Ação EUA": 0,
      "Ação Brasil": 0,
      Criptoativo: 0,
      ETF: 0,
    };
    stockPositions.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });
    return counts;
  }, [stockPositions]);

  // Filtered and Sorted Diagnostics for Section 2 Cards
  const processedDiagnostics = useMemo(() => {
    let items = [...analysis.diagnostics];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      );
    }

    const alertPriority: Record<string, number> = {
      RULE_TRIGGERED: 1,
      REQUIRES_ATTENTION: 2,
      AWAITING_TRIGGER: 3,
      STRATEGY_OK: 4,
    };

    items.sort((a, b) => {
      let res = 0;
      switch (sortBy) {
        case "value":
          res = b.currentValueBRL - a.currentValueBRL;
          break;
        case "profit":
          res = b.profitPercent - a.profitPercent;
          break;
        case "excess":
          res = b.capitalExcessBRL - a.capitalExcessBRL;
          break;
        case "alert":
          res = (alertPriority[a.alertState] || 99) - (alertPriority[b.alertState] || 99);
          break;
        case "symbol":
          res = a.symbol.localeCompare(b.symbol);
          break;
      }
      return sortOrder === "desc" ? res : -res;
    });

    return items;
  }, [analysis.diagnostics, searchQuery, sortBy, sortOrder]);

  // Filtered and Sorted Realization Suggestions for Section 3 Table
  const processedSuggestions = useMemo(() => {
    let items = [...analysis.suggestions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      const valA = a[tableSortField];
      const valB = b[tableSortField];
      if (typeof valA === "string") {
        return tableSortDir === "desc"
          ? (valB as string).localeCompare(valA as string)
          : (valA as string).localeCompare(valB as string);
      }
      return tableSortDir === "desc"
        ? (valB as number) - (valA as number)
        : (valA as number) - (valB as number);
    });

    return items;
  }, [analysis.suggestions, searchQuery, tableSortField, tableSortDir]);

  // Total potential cash to generate across suggested sales
  const totalSuggestedCashBRL = useMemo(() => {
    return analysis.suggestions.reduce((sum, s) => sum + s.suggestedSaleBRL, 0);
  }, [analysis.suggestions]);

  const handleTableSort = (field: typeof tableSortField) => {
    if (tableSortField === field) {
      setTableSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setTableSortField(field);
      setTableSortDir("desc");
    }
  };

  const renderSortIcon = (field: typeof tableSortField) => {
    if (tableSortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40 inline-block ml-1" />;
    }
    return tableSortDir === "desc" ? (
      <ArrowDown className="w-3 h-3 text-primary inline-block ml-1" />
    ) : (
      <ArrowUp className="w-3 h-3 text-primary inline-block ml-1" />
    );
  };

  // Sample crypto disposals for monthly consolidation
  const mockCryptoDisposals = useMemo(
    () => [
      {
        id: "1",
        dateTime: "2026-09-05T10:00:00Z",
        exchange: "Binance",
        asset: "BTC",
        grossProceedsBRL: 20000,
        gainLossBRL: 8500,
        taxRegime: "NATIONAL" as const,
        isExempt: false,
      },
      {
        id: "2",
        dateTime: "2026-09-12T14:30:00Z",
        exchange: "Coinbase",
        asset: "ETH",
        grossProceedsBRL: 10000,
        gainLossBRL: 3200,
        taxRegime: "NATIONAL" as const,
        isExempt: false,
      },
    ],
    []
  );

  const cryptoStatus = useMemo(() => {
    return intelligentPlanEngine.analyzeCryptoTax("2026-09", mockCryptoDisposals, 0);
  }, [mockCryptoDisposals]);

  // Strategy Simulation scenarios
  const simulations = useMemo(() => {
    return intelligentPlanSimulator.simulateScenarios(
      analysis.variableMetrics.currentValue,
      config.currentOpportunityCashBRL,
      simulationDrawdown
    );
  }, [analysis, config, simulationDrawdown]);

  const categoriesList = [
    { id: "ALL", label: "Todas as Ações & Cripto" },
    { id: "Ação EUA", label: "Ações EUA" },
    { id: "Ação Brasil", label: "Ações Brasil" },
    { id: "Criptoativo", label: "Criptoativos" },
    { id: "ETF", label: "ETFs & FIIs" },
  ];

  const getOperationalAlertBadge = (state: OperationalAlertState) => {
    switch (state) {
      case "STRATEGY_OK":
        return <Badge className="bg-emerald-600 text-white font-bold flex items-center gap-1">🟢 Dentro da estratégia</Badge>;
      case "REQUIRES_ATTENTION":
        return <Badge className="bg-amber-600 text-white font-bold flex items-center gap-1">🟡 Requer atenção</Badge>;
      case "RULE_TRIGGERED":
        return <Badge className="bg-rose-600 text-white font-bold flex items-center gap-1">🔴 Regra acionada</Badge>;
      case "AWAITING_TRIGGER":
        return <Badge className="bg-blue-600 text-white font-bold flex items-center gap-1">🔵 Aguardando gatilho</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 space-y-6">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors flex items-center text-sm gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
            </Link>
            <span className="text-border">•</span>
            <span className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full border border-primary/20 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Foco Exclusivo em Renda Variável (Nível de Ação)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Plano Inteligente <span className="text-primary font-light text-xl">| Ações, Cripto & ETFs</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Estratégia cirúrgica para renda variável: controle de concentração no nível de ação individual, caixa de oportunidade e realizações parciais.
          </p>
        </div>

        <Button
          onClick={() => setConfigOpen(true)}
          variant="outline"
          size="sm"
          className="gap-2 text-xs border-border bg-card hover:bg-muted text-foreground self-start md:self-auto"
        >
          <Settings className="w-4 h-4 text-primary" />
          Configurar Regras de Ações
        </Button>
      </header>

      {/* SECTION 1: PLANO ATUAL RENDA VARIÁVEL */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> 1. Plano Atual — Total de Renda Variável
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Renda Variável</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  R$ {analysis.variableMetrics.currentValue.toLocaleString()}
                </h3>
                <p className="text-[11px] text-emerald-500 font-semibold mt-1">
                  +{analysis.variableMetrics.profitPercent.toFixed(1)}% de lucro acumulado
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-primary">
                <PieChart className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Caixa de Oportunidade</p>
                <h3 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                  R$ {analysis.opportunityCash.currentBRL.toLocaleString()}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Meta: R$ {analysis.opportunityCash.targetBRL.toLocaleString()} ({analysis.opportunityCash.progressPct.toFixed(0)}%)
                  {analysis.opportunityCash.stablecoinCashBRL && analysis.opportunityCash.stablecoinCashBRL > 0 ? (
                    <span className="block text-emerald-500 font-medium text-[10px] mt-0.5">
                      (R$ {config.currentOpportunityCashBRL.toLocaleString()} líquido + R$ {analysis.opportunityCash.stablecoinCashBRL.toLocaleString()} em USDT/USD)
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Drawdown Atual (Mercado)</p>
                <h3 className="text-2xl font-bold text-amber-500 mt-1">-5.8%</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Benchmark: {config.reEntryBenchmark}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
                <TrendingDown className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Próximo Gatilho de Reentrada</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">-10% S&P 500</h3>
                <p className="text-[11px] text-emerald-500 font-semibold mt-1">Alocação: R$ 6.400 (20%)</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
                <Zap className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 2: ATENÇÃO AGORA (ESTADOS OPERACIONAIS POR AÇÃO) */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> 2. Atenção Agora — Diagnóstico no Nível de Ação Individual
          </h2>

          {/* Asset Category Filter Pills with Asset Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 border flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-primary/10 text-primary border-primary/30 font-semibold shadow-xs"
                    : "bg-card text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
                }`}
              >
                <span>{cat.label}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground">
                  {categoryCounts[cat.id] ?? 0}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Search & Dynamic Sorting Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filtrar por ticker (ex: BTC, NVDA) ou nome do ativo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs border-border bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector & Direction Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> Ordenar por:
            </span>
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-9 text-xs border-border bg-background w-[165px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">Valor Total (R$)</SelectItem>
                <SelectItem value="profit">Maior Lucro (%)</SelectItem>
                <SelectItem value="excess">Maior Excedente (R$)</SelectItem>
                <SelectItem value="alert">Prioridade de Alerta</SelectItem>
                <SelectItem value="symbol">Nome / Ticker (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
              className="h-9 px-2.5 text-xs border-border bg-background hover:bg-muted"
              title={sortOrder === "desc" ? "Ordem Decrescente" : "Ordem Crescente"}
            >
              {sortOrder === "desc" ? (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <ArrowDown className="w-3.5 h-3.5" /> Dec
                </span>
              ) : (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <ArrowUp className="w-3.5 h-3.5" /> Cres
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Diagnostic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {processedDiagnostics.length === 0 ? (
            <Card className="col-span-full bg-card border-border p-6 text-center text-muted-foreground text-xs">
              Nenhum ativo encontrado para o filtro digitado &quot;{searchQuery}&quot;.
            </Card>
          ) : (
            processedDiagnostics.map((item) => (
              <Card key={item.id} className="bg-card border-border hover:border-border/80 transition-all shadow-sm flex flex-col justify-between">
                <CardHeader className="p-3.5 pb-2 border-b border-border flex flex-row items-start justify-between space-y-0 gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-foreground font-mono">{item.symbol}</span>
                      <Badge variant="outline" className="text-[10px] bg-muted border-border text-muted-foreground">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5 max-w-[140px]">{item.name}</p>
                  </div>
                  {getOperationalAlertBadge(item.alertState)}
                </CardHeader>
                <CardContent className="p-3.5 space-y-2.5 text-xs flex-1 flex flex-col justify-between">
                  <p className="text-foreground leading-relaxed bg-muted/30 p-2 rounded border border-border text-[11px]">
                    {item.alertMessage}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-muted/40 p-2 rounded border border-border">
                      <span className="text-muted-foreground">Peso na R. Variável:</span>
                      <div className="font-bold text-foreground mt-0.5">{item.currentWeightPct.toFixed(1)}%</div>
                    </div>
                    <div className="bg-muted/40 p-2 rounded border border-border">
                      <span className="text-muted-foreground">Peso Máx Config:</span>
                      <div className="font-bold text-foreground mt-0.5">{item.maxWeightPct.toFixed(1)}%</div>
                    </div>
                    <div className="bg-muted/40 p-2 rounded border border-border">
                      <span className="text-muted-foreground">Capital Excedente:</span>
                      <div className="font-bold text-primary mt-0.5">R$ {item.capitalExcessBRL.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/40 p-2 rounded border border-border">
                      <span className="text-muted-foreground">Lucro na Ação:</span>
                      <div className={`font-bold mt-0.5 ${item.profitPercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {item.profitPercent >= 0 ? "+" : ""}{item.profitPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* SECTION 3: REALIZAÇÕES POSSÍVEIS (NÍVEL DE AÇÃO) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" /> 3. Realizações Possíveis — Venda Parcial no Nível de Ação
        </h2>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm text-foreground flex items-center gap-2">
                Tabela de Realização Parcial de Ações e Criptoativos
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Clique nos cabeçalhos das colunas para ordenar interativamente. Preserva a posição mínima desejada do ativo.
              </CardDescription>
            </div>
            {totalSuggestedCashBRL > 0 && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs px-3 py-1.5 self-start sm:self-auto font-mono font-bold shrink-0">
                Caixa Total Potencial: R$ {totalSuggestedCashBRL.toLocaleString()}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th
                      onClick={() => handleTableSort("symbol")}
                      className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors select-none"
                    >
                      Ticker / Ação {renderSortIcon("symbol")}
                    </th>
                    <th className="py-3 px-3">Categoria</th>
                    <th
                      onClick={() => handleTableSort("currentPositionBRL")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors select-none"
                    >
                      Posição Atual (R$) {renderSortIcon("currentPositionBRL")}
                    </th>
                    <th
                      onClick={() => handleTableSort("suggestedSaleBRL")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors select-none"
                    >
                      Venda Sugerida (R$) {renderSortIcon("suggestedSaleBRL")}
                    </th>
                    <th
                      onClick={() => handleTableSort("suggestedSalePct")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors select-none"
                    >
                      % Realização {renderSortIcon("suggestedSalePct")}
                    </th>
                    <th
                      onClick={() => handleTableSort("remainingPositionBRL")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors select-none"
                    >
                      Posição Remanescente {renderSortIcon("remainingPositionBRL")}
                    </th>
                    <th
                      onClick={() => handleTableSort("newWeightPct")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors select-none"
                    >
                      Novo Peso na RV (%) {renderSortIcon("newWeightPct")}
                    </th>
                    <th
                      onClick={() => handleTableSort("cashGeneratedBRL")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors select-none"
                    >
                      Caixa Gerado {renderSortIcon("cashGeneratedBRL")}
                    </th>
                    <th className="py-3 px-4 text-center">Status Operacional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {processedSuggestions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground font-sans text-xs">
                        Nenhum ativo lucrativo necessita de realização no momento. Posições dentro da meta ou sem lucro acumulado.
                      </td>
                    </tr>
                  ) : (
                    processedSuggestions.map((s) => (
                      <tr key={s.symbol} className="hover:bg-muted/40 transition-colors font-mono">
                        <td className="py-3 px-4 font-bold text-foreground font-sans">{s.symbol} - {s.name}</td>
                        <td className="py-3 px-3 text-muted-foreground font-sans">
                          <Badge variant="outline" className="text-[10px] bg-muted border-border">
                            {s.symbol === "BTC" || s.symbol === "ETH" || s.symbol === "USDT" || s.symbol === "USDC" ? "Cripto" : "Ação"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right text-foreground">R$ {s.currentPositionBRL.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-500">R$ {s.suggestedSaleBRL.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-muted-foreground">{s.suggestedSalePct.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right text-foreground">R$ {s.remainingPositionBRL.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-foreground">{s.newWeightPct.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right font-bold text-cyan-600 dark:text-cyan-400">R$ {s.cashGeneratedBRL.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center font-sans">{getOperationalAlertBadge(s.alertState)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4 & 5 GRID: PLANO DE REENTRADA + TRIBUTAÇÃO CRIPTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 4: PLANO DE REENTRADA E GATILHOS POR AÇÃO */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-500" /> 4. Plano de Reentrada & Gatilhos Individuais por Ação
          </h2>

          <Card className="bg-card border-border shadow-sm space-y-3 p-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Escada de Drawdown do Mercado ({config.reEntryBenchmark}):</h4>
              <div className="space-y-1.5">
                {analysis.reEntryLadderStatus.map((level) => (
                  <div
                    key={level.drawdownPct}
                    className={`flex items-center justify-between p-2.5 rounded-lg border font-mono text-xs ${
                      level.triggered
                        ? "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                        : "bg-muted/30 border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-sans font-semibold">
                      <span>Drawdown {level.drawdownPct}%</span>
                      {level.triggered && <Badge className="bg-emerald-600 text-white text-[10px]">Acionado</Badge>}
                    </div>
                    <div className="text-right">
                      <span className="text-foreground font-bold">R$ {level.cashAllocationBRL.toLocaleString()}</span>
                      <span className="text-[11px] text-muted-foreground ml-1 text-[10px]">({level.cashAllocationPct}% do caixa)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Gatilhos de Desconto por Ação Individual:</h4>
              <div className="space-y-1.5">
                {analysis.assetReEntryTriggers.map((at) => (
                  <div key={at.symbol} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border text-xs font-mono">
                    <div className="flex items-center gap-2 font-sans">
                      <span className="font-bold text-foreground">{at.symbol}</span>
                      <span className="text-[10px] text-muted-foreground">Gatilho: {at.configuredTriggerPct}%</span>
                    </div>
                    <div className="text-right text-xs font-sans text-muted-foreground">
                      Compra Sugerida: <strong className="text-emerald-500 font-mono">R$ {at.suggestedReEntryBRL.toLocaleString()}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* SECTION 5: TRIBUTAÇÃO CRIPTO CONSOLIDADA */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-500" /> 5. Otimização Tributária Cripto (Isenção Consolidada)
          </h2>

          <Card className="bg-card border-border shadow-sm space-y-3 p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Alienações Consolidadas no Mês:</span>
                <span className="text-xs font-bold text-foreground font-mono">
                  R$ {cryptoStatus.consolidatedDisposalsBRL.toLocaleString()} / R$ {cryptoStatus.monthlyThresholdBRL.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden border border-border">
                <div
                  className={`h-full transition-all ${
                    cryptoStatus.exceededLimit ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, cryptoStatus.thresholdUsedPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Limite Restante com Isenção: <strong className="text-emerald-500">R$ {cryptoStatus.remainingThresholdBRL.toLocaleString()}</strong></span>
                <span>Exchanges: {cryptoStatus.exchangesIncluded.join(", ")}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Projeção de Isenção:</span>
                <strong className={cryptoStatus.exceededLimit ? "text-rose-500" : "text-emerald-500"}>
                  {cryptoStatus.exceededLimit ? "🔴 Limite de R$ 35 mil excedido" : "🟢 Dentro do limite de isenção"}
                </strong>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                A isenção de R$ 35.000,00 considera o somatório bruto das alienações em todas as corretoras (Binance, Coinbase, Bybit, Mercado Bitcoin) e trocas cripto-para-cripto.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION 6: HISTÓRICO E SIMULADOR DE ESTRATÉGIAS */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-purple-500" /> 6. Simulador de Estratégias em Renda Variável
          </h2>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Correção Simulada no Mercado:</span>
            {[-5, -10, -15, -20, -30].map((dd) => (
              <button
                key={dd}
                onClick={() => setSimulationDrawdown(dd)}
                className={`text-xs px-2.5 py-1 rounded font-mono font-semibold transition-all border ${
                  simulationDrawdown === dd
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {dd}%
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simulations.map((sim) => (
            <Card key={sim.strategyId} className="bg-card border-border shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-border">
                <CardTitle className="text-sm text-foreground">{sim.strategyName}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">{sim.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs font-mono">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Patrimônio Final em RV:</span>
                    <strong className="text-foreground text-sm">R$ {sim.finalPortfolioValueBRL.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Caixa Restante:</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">R$ {sim.opportunityCashBRL.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Retorno Simulação:</span>
                    <span className={sim.totalReturnPct >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                      {sim.totalReturnPct >= 0 ? "+" : ""}{sim.totalReturnPct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Drawdown Máximo:</span>
                    <span className="text-rose-500 font-bold">-{sim.maxDrawdownPct}%</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-muted/40 border border-border text-[11px] font-sans text-muted-foreground">
                  Nota: Simulação hipotética auditável no nível de ações. Não garante rentabilidade futura.
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CONFIGURATION DIALOG */}
      <IntelligentPlanConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        config={config}
        onSaveConfig={setConfig}
      />
    </div>
  );
}
