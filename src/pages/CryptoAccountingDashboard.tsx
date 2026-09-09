import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  BookOpen,
  Calculator,
  Compass,
  FileSpreadsheet,
  Flame,
  Globe,
  HelpCircle,
  Info,
  Landmark,
  Layers,
  Lightbulb,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Target,
  Upload,
  Zap,
} from "lucide-react";

import { cryptoAccountingEngine } from "@/features/cryptoAccounting/cryptoAccountingEngine";
import type { CryptoDisposal, CryptoTrade } from "@/features/cryptoAccounting/types";
import { normalizeRawTrade } from "@/features/cryptoAccounting/cryptoOrderNormalizer";

export function CryptoAccountingDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-09");
  const [activeTab, setActiveTab] = useState<string>("ledger");
  const [csvText, setCsvText] = useState("");
  const [csvBroker, setCsvBroker] = useState("Binance");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedAuditDisposal, setSelectedAuditDisposal] = useState<CryptoDisposal | null>(null);

  // Manual Trade Form State
  const [manualAsset, setManualAsset] = useState("BTC");
  const [manualBroker, setManualBroker] = useState("Mercado Bitcoin");
  const [manualSide, setManualSide] = useState<"BUY" | "SELL">("BUY");
  const [manualQty, setManualQty] = useState("0.05");
  const [manualPriceUSD, setManualPriceUSD] = useState("70000");

  // Sale Simulator State
  const [simAsset, setSimAsset] = useState("BTC");
  const [simQty, setSimQty] = useState("0.02");
  const [simPriceUSD, setSimPriceUSD] = useState("78000");

  // Cost Reset Simulator State
  const [resetAsset, setResetAsset] = useState("BTC");
  const [resetPriceUSD, setResetPriceUSD] = useState("78000");

  // Trigger re-render when trades change
  const [refreshKey, setRefreshKey] = useState(0);

  const processed = useMemo(() => {
    return cryptoAccountingEngine.processAll();
  }, [refreshKey]);

  const trades = useMemo(() => {
    return cryptoAccountingEngine.getTrades();
  }, [refreshKey]);

  const monthSummary = useMemo(() => {
    return (
      processed.monthlySummaries[selectedMonth] || {
        month: selectedMonth,
        nationalDisposalsBRL: 0,
        nationalExemptLimitBRL: 35000,
        nationalLimitUsedPct: 0,
        nationalRemainingLimitBRL: 35000,
        nationalGainsBRL: 0,
        nationalLossesBRL: 0,
        nationalNetResultBRL: 0,
        nationalTaxableGainBRL: 0,
        nationalEstimatedTaxBRL: 0,
        internationalDisposalsBRL: 0,
        internationalGainsBRL: 0,
        internationalLossesBRL: 0,
        internationalNetResultBRL: 0,
        internationalTaxableGainBRL: 0,
        internationalEstimatedTaxBRL: 0,
        lossesCarriedForwardBRL: 0,
        status: "OK",
        taxRuleVersion: cryptoAccountingEngine.getTaxRuleVersion(),
        disposalsCount: 0,
        unknownRegimeCount: 0,
      }
    );
  }, [processed, selectedMonth]);

  const saleSimulation = useMemo(() => {
    return cryptoAccountingEngine.simulateSale(
      selectedMonth,
      simAsset,
      parseFloat(simQty) || 0,
      parseFloat(simPriceUSD) || 0
    );
  }, [selectedMonth, simAsset, simQty, simPriceUSD, refreshKey]);

  const costResetSimulation = useMemo(() => {
    return cryptoAccountingEngine.simulateCostReset(resetAsset, parseFloat(resetPriceUSD) || 0);
  }, [resetAsset, resetPriceUSD, refreshKey]);

  const handleImportCSV = () => {
    if (!csvText.trim()) return;
    setIsImporting(true);
    const count = cryptoAccountingEngine.importCSV(csvText, csvBroker);
    setCsvText("");
    setIsImporting(false);
    setRefreshKey((k) => k + 1);
  };

  const handleAddManualTrade = () => {
    const trade = normalizeRawTrade({
      asset: manualAsset,
      broker: manualBroker,
      side: manualSide,
      quantity: parseFloat(manualQty) || 0,
      price: parseFloat(manualPriceUSD) || 0,
      dateTime: new Date().toISOString(),
    });

    cryptoAccountingEngine.addTrade(trade);
    setRefreshKey((k) => k + 1);
  };

  const fmtBRL = (v?: number) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtUSD = (v?: number) =>
    `US$ ${(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="shrink-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground whitespace-nowrap">
                Contabilidade Cripto + Radar Tributário
              </h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                Livro Contábil de Operações, Apuração Fiscal e Rastreamento dos R$ 35.000/mês
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <Link to="/">
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-1" /> Visão Geral
              </Button>
            </Link>
            <Link to="/radar">
              <Button variant="outline" size="sm">
                <Target className="w-4 h-4 mr-1" /> Radar Assimetria
              </Button>
            </Link>
            <Link to="/desempenho-variavel">
              <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400">
                <Flame className="w-4 h-4 mr-1" /> Maiores Altas
              </Button>
            </Link>
          </div>

          {/* Mobile nav drawer */}
          <div className="flex lg:hidden items-center gap-1">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <BarChart3 className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                  <DialogTitle>Invest Vision - Navegação</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2 pt-2">
                  <Link to="/" className="flex items-center gap-2 p-2 rounded hover:bg-muted text-sm font-medium">
                    <BarChart3 className="w-4 h-4 text-primary" /> Visão Geral Consolidação
                  </Link>
                  <Link to="/radar" className="flex items-center gap-2 p-2 rounded hover:bg-muted text-sm font-medium">
                    <Target className="w-4 h-4 text-primary" /> Radar de Assimetria
                  </Link>
                  <Link to="/desempenho-variavel" className="flex items-center gap-2 p-2 rounded hover:bg-muted text-sm font-medium text-emerald-400">
                    <Flame className="w-4 h-4" /> Maiores Altas e Desempenho
                  </Link>
                  <Link to="/contabilidade-cripto" className="flex items-center gap-2 p-2 rounded bg-blue-500/10 text-sm font-semibold text-blue-400">
                    <Calculator className="w-4 h-4" /> Contabilidade Cripto + Radar
                  </Link>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Banner & Month Selector */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Compass className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Mês de Apuração
              </span>
              <div className="flex items-center gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[160px] h-9 font-semibold text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026-09">Setembro / 2026</SelectItem>
                    <SelectItem value="2026-08">Agosto / 2026</SelectItem>
                    <SelectItem value="2026-07">Julho / 2026</SelectItem>
                    <SelectItem value="2026-06">Junho / 2026</SelectItem>
                    <SelectItem value="2026-05">Maio / 2026</SelectItem>
                  </SelectContent>
                </Select>
                <Badge
                  variant={
                    monthSummary.status === "EXCEEDED"
                      ? "destructive"
                      : monthSummary.status === "WARNING_90" || monthSummary.status === "LIMIT_REACHED"
                      ? "warning"
                      : "secondary"
                  }
                  className="ml-2 font-mono"
                >
                  {monthSummary.status === "EXCEEDED"
                    ? "🔴 LIMITE ULTRAPASSADO"
                    : monthSummary.status === "LIMIT_REACHED"
                    ? "🟠 LIMITE ATINGIDO"
                    : monthSummary.status === "WARNING_90"
                    ? "⚠️ ALERTA 90%"
                    : monthSummary.status === "WARNING_70"
                    ? "🟡 ATENÇÃO 70%"
                    : "🟢 DENTRO DO LIMITE"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
            <div className="bg-background/60 p-2.5 rounded-lg border border-border/50">
              <div className="text-[11px] text-muted-foreground font-medium">Alienações Nacionais</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {fmtBRL(monthSummary.nationalDisposalsBRL)}
              </div>
            </div>
            <div className="bg-background/60 p-2.5 rounded-lg border border-border/50">
              <div className="text-[11px] text-muted-foreground font-medium">Limite de Isenção</div>
              <div className="text-base font-bold font-mono text-foreground">
                {fmtBRL(monthSummary.nationalExemptLimitBRL)}
              </div>
            </div>
            <div className="bg-background/60 p-2.5 rounded-lg border border-border/50">
              <div className="text-[11px] text-muted-foreground font-medium">Uso do Limite</div>
              <div className="text-base font-bold font-mono text-primary">
                {monthSummary.nationalLimitUsedPct.toFixed(1)}%
              </div>
            </div>
            <div className="bg-background/60 p-2.5 rounded-lg border border-border/50">
              <div className="text-[11px] text-muted-foreground font-medium">Saldo do Limite</div>
              <div className="text-base font-bold font-mono text-emerald-300">
                {fmtBRL(monthSummary.nationalRemainingLimitBRL)}
              </div>
            </div>
          </div>
        </div>

        {/* Four Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-card border border-border">
            <TabsTrigger value="ledger" className="py-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Livro Contábil
            </TabsTrigger>
            <TabsTrigger value="inventory" className="py-2 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Posição & Estoque
            </TabsTrigger>
            <TabsTrigger value="taxation" className="py-2 flex items-center gap-2">
              <Landmark className="w-4 h-4" /> Tributação
            </TabsTrigger>
            <TabsTrigger value="radar" className="py-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" /> Radar & Alertas
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: LIVRO CONTÁBIL */}
          <TabsContent value="ledger" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Import Card */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" /> Importar Ordens Executadas
                  </CardTitle>
                  <CardDescription>
                    Cole o extrato CSV/XLSX de compras e vendas da sua corretora
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Corretora de Origem</Label>
                    <Select value={csvBroker} onValueChange={setCsvBroker}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Binance">Binance (Internacional)</SelectItem>
                        <SelectItem value="Coinbase">Coinbase (Internacional)</SelectItem>
                        <SelectItem value="Bybit">Bybit (Internacional)</SelectItem>
                        <SelectItem value="Mercado Bitcoin">Mercado Bitcoin (Nacional)</SelectItem>
                        <SelectItem value="Foxbit">Foxbit (Nacional)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Conteúdo CSV / Extrato</Label>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder="Date,Asset,Side,Quantity,Price,Fee&#10;2026-09-01,BTC,BUY,0.05,70000,10"
                      className="w-full h-24 p-2 text-xs font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <Button size="sm" onClick={handleImportCSV} disabled={isImporting} className="w-full">
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />}
                    Processar Importação
                  </Button>

                  <div className="border-t border-border pt-3 space-y-2">
                    <Label className="text-xs font-semibold">Adicionar Lançamento Manual</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Ativo</Label>
                        <Input value={manualAsset} onChange={(e) => setManualAsset(e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Operação</Label>
                        <Select value={manualSide} onValueChange={(v) => setManualSide(v as any)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BUY">Compra</SelectItem>
                            <SelectItem value="SELL">Venda</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Qtd</Label>
                        <Input value={manualQty} onChange={(e) => setManualQty(e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Preço US$</Label>
                        <Input value={manualPriceUSD} onChange={(e) => setManualPriceUSD(e.target.value)} className="h-7 text-xs" />
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleAddManualTrade} className="w-full text-xs h-8 mt-1">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Inserir Ordem Executada
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Ledger Table */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-400" /> Livro de Operações Executadas ({trades.length})
                    </CardTitle>
                    <CardDescription>
                      Histórico chronológico de ordenamento e preenchimento de ordens
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground text-left">
                        <th className="p-2.5">Data</th>
                        <th className="p-2.5">Corretora</th>
                        <th className="p-2.5">Ativo</th>
                        <th className="p-2.5">Operação</th>
                        <th className="p-2.5 text-right">Qtd</th>
                        <th className="p-2.5 text-right">Preço</th>
                        <th className="p-2.5 text-right">Valor Bruto</th>
                        <th className="p-2.5 text-right">Taxa</th>
                        <th className="p-2.5 text-center">Regime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center p-6 text-muted-foreground">
                            Nenhuma ordem registrada. Importe um extrato CSV ou adicione manualmente.
                          </td>
                        </tr>
                      ) : (
                        trades.map((t) => {
                          const isSell = t.side === "SELL";
                          return (
                            <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="p-2.5 font-mono text-muted-foreground">
                                {t.dateTime.slice(0, 10)}
                              </td>
                              <td className="p-2.5 font-medium">{t.broker}</td>
                              <td className="p-2.5 font-bold">{t.asset}</td>
                              <td className="p-2.5">
                                <Badge variant={isSell ? "destructive" : "default"} className="text-[10px] py-0">
                                  {isSell ? "Venda" : "Compra"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-right font-mono">{t.quantity}</td>
                              <td className="p-2.5 text-right font-mono">{fmtUSD(t.price)}</td>
                              <td className="p-2.5 text-right font-mono font-medium">{fmtUSD(t.grossValue)}</td>
                              <td className="p-2.5 text-right font-mono text-muted-foreground">{fmtUSD(t.fee)}</td>
                              <td className="p-2.5 text-center">
                                <Badge variant="outline" className="text-[9px]">
                                  {t.country === "BR" ? "Nacional" : "Internacional"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: POSIÇÃO & ESTOQUE */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Estoque de Criptoativos Reconstruído Cronologicamente
                </CardTitle>
                <CardDescription>
                  Custo de aquisição médio acumulado, valor atual e lucro não realizado por ativo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground text-left">
                      <th className="p-2.5">Ativo</th>
                      <th className="p-2.5 text-right">Qtd Atual</th>
                      <th className="p-2.5 text-right">Custo Médio (USD)</th>
                      <th className="p-2.5 text-right">Custo Total (BRL)</th>
                      <th className="p-2.5 text-right">Cotação Atual (USD)</th>
                      <th className="p-2.5 text-right">Valor Atual (BRL)</th>
                      <th className="p-2.5 text-right">Resultado Não Realizado</th>
                      <th className="p-2.5">Custódias / Fontes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.stocks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-6 text-muted-foreground">
                          Nenhum estoque ativo.
                        </td>
                      </tr>
                    ) : (
                      processed.stocks.map((st) => (
                        <tr key={st.asset} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-2.5 font-bold text-sm">{st.asset}</td>
                          <td className="p-2.5 text-right font-mono font-medium">{st.quantity}</td>
                          <td className="p-2.5 text-right font-mono">{fmtUSD(st.averagePriceUSD)}</td>
                          <td className="p-2.5 text-right font-mono">{fmtBRL(st.totalCostBRL)}</td>
                          <td className="p-2.5 text-right font-mono">{fmtUSD(st.currentPriceUSD)}</td>
                          <td className="p-2.5 text-right font-mono font-semibold">{fmtBRL(st.currentValueBRL)}</td>
                          <td className={`p-2.5 text-right font-mono font-bold ${(st.unrealizedProfitBRL ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {fmtBRL(st.unrealizedProfitBRL)} ({st.unrealizedProfitPct?.toFixed(2)}%)
                          </td>
                          <td className="p-2.5 text-muted-foreground">{st.sources.join(", ")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: TRIBUTAÇÃO & APURAÇÃO MENSAAL */}
          <TabsContent value="taxation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* National Regime Card */}
              <Card className="border-emerald-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-emerald-400" /> Corretoras Nacionais (Brasil)
                    </span>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/40">
                      Limite Isento: R$ 35.000/mês
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Total de Alienações no Mês:</span>
                    <span className="font-mono font-bold">{fmtBRL(monthSummary.nationalDisposalsBRL)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Ganhos em Alienações:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{fmtBRL(monthSummary.nationalGainsBRL)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Prejuízos em Alienações:</span>
                    <span className="font-mono text-red-400 font-semibold">{fmtBRL(monthSummary.nationalLossesBRL)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Resultado Líquido do Mês:</span>
                    <span className="font-mono font-bold">{fmtBRL(monthSummary.nationalNetResultBRL)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50 bg-muted/20 p-2 rounded">
                    <span className="font-semibold">Imposto Estimado a Pagar (15%):</span>
                    <span className="font-mono font-bold text-amber-400">{fmtBRL(monthSummary.nationalEstimatedTaxBRL)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* International Regime Card */}
              <Card className="border-blue-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" /> Corretoras Internacionais (Bens no Exterior)
                    </span>
                    <Badge variant="outline" className="text-blue-400 border-blue-500/40">
                      Regime Específico
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Total de Alienações no Mês:</span>
                    <span className="font-mono font-bold">{fmtBRL(monthSummary.internationalDisposalsBRL)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Ganhos em Alienações:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{fmtBRL(monthSummary.internationalGainsBRL)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Prejuízos em Alienações:</span>
                    <span className="font-mono text-red-400 font-semibold">{fmtBRL(monthSummary.internationalLossesBRL)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Resultado Líquido do Mês:</span>
                    <span className="font-mono font-bold">{fmtBRL(monthSummary.internationalNetResultBRL)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50 bg-muted/20 p-2 rounded">
                    <span className="font-semibold">Imposto Estimado (15%):</span>
                    <span className="font-mono font-bold text-amber-400">{fmtBRL(monthSummary.internationalEstimatedTaxBRL)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tax Rule Version Banner */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-foreground">
                    Regra Tributária Aplicada: {monthSummary.taxRuleVersion.name} ({monthSummary.taxRuleVersion.id})
                  </div>
                  <div className="text-muted-foreground">
                    {monthSummary.taxRuleVersion.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: RADAR, ALERTAS & SIMULAÇÕES */}
          <TabsContent value="radar" className="space-y-6">
            {/* Progress Meter */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Radar de Alienação Mensal (R$ 35.000,00)</span>
                  <span className="font-mono text-sm">{monthSummary.nationalLimitUsedPct.toFixed(1)}% utilizado</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={monthSummary.nationalLimitUsedPct} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>0,00</span>
                  <span>R$ 17.500 (50%)</span>
                  <span>R$ 24.500 (70%)</span>
                  <span>R$ 31.500 (90%)</span>
                  <span>R$ 35.000 (100%)</span>
                </div>
              </CardContent>
            </Card>

            {/* Alerts Container */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" /> Alertas Inteligentes Ativos
              </h3>
              {processed.alerts.length === 0 ? (
                <Card className="p-4 text-xs text-muted-foreground text-center">
                  Nenhum alerta tributário crítico emitido para o período.
                </Card>
              ) : (
                processed.alerts.map((al) => (
                  <Card key={al.id} className="p-3 border-l-4 border-l-amber-400 bg-amber-500/5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-foreground">{al.title}</div>
                        <div className="text-muted-foreground">{al.message}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {al.code}
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Sale Simulator: "O que acontece se eu vender?" */}
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" /> Simulador: "O que acontece se eu vender?"
                </CardTitle>
                <CardDescription>
                  Simule uma nova ordem de venda antes da execução e verifique o impacto no limite mensal de R$ 35.000
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Ativo</Label>
                    <Input value={simAsset} onChange={(e) => setSimAsset(e.target.value)} className="h-8 text-xs font-bold" />
                  </div>
                  <div>
                    <Label className="text-xs">Quantidade a Vender</Label>
                    <Input value={simQty} onChange={(e) => setSimQty(e.target.value)} className="h-8 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Preço de Venda (US$)</Label>
                    <Input value={simPriceUSD} onChange={(e) => setSimPriceUSD(e.target.value)} className="h-8 text-xs font-mono" />
                  </div>
                </div>

                {/* Simulation Output Card */}
                <div className={`p-4 rounded-lg border text-xs space-y-2 ${saleSimulation.status === "RED" ? "bg-red-500/10 border-red-500/40" : saleSimulation.status === "YELLOW" ? "bg-amber-500/10 border-amber-500/40" : "bg-emerald-500/10 border-emerald-500/40"}`}>
                  <div className="font-bold text-sm">{saleSimulation.message}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40 font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Valor da Venda:</span>
                      <span className="font-bold">{fmtBRL(saleSimulation.grossProceedsBRL)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Custo Alocado:</span>
                      <span>{fmtBRL(saleSimulation.allocatedCostBRL)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Novo Total Mensal:</span>
                      <span className="font-bold">{fmtBRL(saleSimulation.newMonthDisposalsBRL)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Imposto Estimado:</span>
                      <span className="font-bold text-amber-400">{fmtBRL(saleSimulation.estimatedTaxBRL)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Reset Simulator: "Impacto no Custo de Aquisição" */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" /> Simulador: "Impacto no Custo de Aquisição"
                </CardTitle>
                <CardDescription>
                  Simule o cenário hipotético de venda e recompra para elevar o custo médio tributário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Ativo</Label>
                    <Input value={resetAsset} onChange={(e) => setResetAsset(e.target.value)} className="h-8 text-xs font-bold" />
                  </div>
                  <div>
                    <Label className="text-xs">Preço de Venda & Recompra (US$)</Label>
                    <Input value={resetPriceUSD} onChange={(e) => setResetPriceUSD(e.target.value)} className="h-8 text-xs font-mono" />
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo Médio Atual:</span>
                    <span>{fmtBRL(costResetSimulation.currentAvgCostBRL)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Novo Custo Médio Simulado:</span>
                    <span className="font-bold text-emerald-400">{fmtBRL(costResetSimulation.newAvgCostBRL)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border/50 pt-1">
                    <span className="text-muted-foreground">Elevação de Escudo Fiscal Futuro:</span>
                    <span className="font-bold text-primary">{fmtBRL(costResetSimulation.futureTaxShieldBRL)}</span>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/40">
                  ⚠️ {costResetSimulation.disclaimer}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default CryptoAccountingDashboard;
