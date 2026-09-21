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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";

export default function IntelligentPlan() {
  const { data: snapshots = [], isLoading } = useSnapshots();
  const [config, setConfig] = useState<IntelligentPlanConfig>(DEFAULT_PLAN_CONFIG);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [simulationDrawdown, setSimulationDrawdown] = useState<number>(-15);

  // Detailed Stock Positions (Variable Income strictly at individual asset/stock level)
  const stockPositions: StockPositionInput[] = useMemo(() => {
    return [
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
        symbol: "PETR4",
        name: "Petrobras PN",
        category: "Ação Brasil",
        quantity: 500,
        averagePrice: 28.5,
        currentPrice: 36.8,
        currency: "BRL",
        fxRate: 1.0,
        currentValueBRL: 18400,
        appliedAmountBRL: 14250,
      },
      {
        symbol: "VALE3",
        name: "Vale ON",
        category: "Ação Brasil",
        quantity: 300,
        averagePrice: 68.0,
        currentPrice: 61.2,
        currency: "BRL",
        fxRate: 1.0,
        currentValueBRL: 18360,
        appliedAmountBRL: 20400,
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
      {
        symbol: "SMH",
        name: "VanEck Semiconductor ETF",
        category: "ETF",
        quantity: 15.0,
        averagePrice: 185.0,
        currentPrice: 252.8,
        currency: "USD",
        fxRate: 5.45,
        currentValueBRL: 20666,
        appliedAmountBRL: 15131,
      },
    ];
  }, []);

  // Filter stock positions by selected category
  const filteredStockPositions = useMemo(() => {
    if (selectedCategory === "ALL") return stockPositions;
    return stockPositions.filter((p) => p.category === selectedCategory);
  }, [stockPositions, selectedCategory]);

  // Run Intelligent Plan Engine strictly for Variable Income at stock level
  const analysis = useMemo(() => {
    return intelligentPlanEngine.analyzeVariableIncomePortfolio(filteredStockPositions, config);
  }, [filteredStockPositions, config]);

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
    { id: "Ação EUA", label: "Ações EUA (Stocks)" },
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
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> 2. Atenção Agora — Diagnóstico no Nível de Ação Individual
          </h2>

          {/* Asset Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 border ${
                  selectedCategory === cat.id
                    ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                    : "bg-card text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analysis.diagnostics.map((item) => (
            <Card key={item.id} className="bg-card border-border hover:border-border/80 transition-all shadow-sm">
              <CardHeader className="p-3.5 pb-2 border-b border-border flex flex-row items-center justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-foreground font-mono">{item.symbol}</span>
                    <Badge variant="outline" className="text-[10px] bg-muted border-border text-muted-foreground">
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.name}</p>
                </div>
                {getOperationalAlertBadge(item.alertState)}
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5 text-xs">
                <p className="text-foreground leading-relaxed bg-muted/30 p-2 rounded border border-border text-[11px]">
                  {item.alertMessage}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-muted/40 p-2 rounded border border-border">
                    <span className="text-muted-foreground">Peso na R. Variável:</span>
                    <div className="font-bold text-foreground mt-0.5">{item.currentWeightPct.toFixed(1)}%</div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded border border-border">
                    <span className="text-muted-foreground">Peso Máximo Config:</span>
                    <div className="font-bold text-foreground mt-0.5">{item.maxWeightPct.toFixed(1)}%</div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded border border-border">
                    <span className="text-muted-foreground">Capital Excedente:</span>
                    <div className="font-bold text-primary mt-0.5">R$ {item.capitalExcessBRL.toLocaleString()}</div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded border border-border">
                    <span className="text-muted-foreground">Lucro na Ação:</span>
                    <div className="font-bold text-emerald-500 mt-0.5">+{item.profitPercent.toFixed(0)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* SECTION 3: REALIZAÇÕES POSSÍVEIS (NÍVEL DE AÇÃO) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" /> 3. Realizações Possíveis — Venda Parcial no Nível de Ação
        </h2>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-border">
            <CardTitle className="text-sm text-foreground">Tabela de Realização Parcial de Ações e Criptoativos</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Sugestão de venda calculada para cada ação excedente. Preserva a posição mínima desejada do ativo. Nenhuma ordem é executada automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Ticker / Ação</th>
                    <th className="py-3 px-3">Categoria</th>
                    <th className="py-3 px-3 text-right">Posição Atual (R$)</th>
                    <th className="py-3 px-3 text-right">Venda Sugerida (R$)</th>
                    <th className="py-3 px-3 text-right">% Realização</th>
                    <th className="py-3 px-3 text-right">Posição Remanescente</th>
                    <th className="py-3 px-3 text-right">Novo Peso na RV (%)</th>
                    <th className="py-3 px-3 text-right">Caixa Gerado</th>
                    <th className="py-3 px-4 text-center">Status Operacional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analysis.suggestions.map((s) => (
                    <tr key={s.symbol} className="hover:bg-muted/40 font-mono">
                      <td className="py-3 px-4 font-bold text-foreground font-sans">{s.symbol} - {s.name}</td>
                      <td className="py-3 px-3 text-muted-foreground font-sans">
                        <Badge variant="outline" className="text-[10px] bg-muted border-border">
                          {s.symbol === "BTC" || s.symbol === "ETH" ? "Cripto" : "Ação"}
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
                  ))}
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
