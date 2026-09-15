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
  ArrowDownRight,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  Coins,
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
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
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

  // Hybrid Buyback Simulator State (Reset & Limit DCA)
  const [hybridAsset, setHybridAsset] = useState("BTC");
  const [hybridSaleValueBRL, setHybridSaleValueBRL] = useState("30000");
  const [hybridSplitImmediatePct, setHybridSplitImmediatePct] = useState("70");
  const [hybridSellPriceUSD, setHybridSellPriceUSD] = useState("78000");
  const [hybridTarget1DropPct, setHybridTarget1DropPct] = useState("10");
  const [hybridTarget2DropPct, setHybridTarget2DropPct] = useState("20");

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

  const hybridSimulation = useMemo(() => {
    return cryptoAccountingEngine.simulateHybridBuyback(
      hybridAsset,
      parseFloat(hybridSaleValueBRL) || 0,
      parseFloat(hybridSplitImmediatePct) || 70,
      parseFloat(hybridSellPriceUSD) || 0,
      parseFloat(hybridTarget1DropPct) || 10,
      parseFloat(hybridTarget2DropPct) || 20
    );
  }, [
    hybridAsset,
    hybridSaleValueBRL,
    hybridSplitImmediatePct,
    hybridSellPriceUSD,
    hybridTarget1DropPct,
    hybridTarget2DropPct,
    refreshKey,
  ]);

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
                          const isTransfer = t.transactionType === "TRANSFER" || t.notes?.toLowerCase().includes("transfer");
                          return (
                            <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="p-2.5 font-mono text-muted-foreground">
                                {t.dateTime.slice(0, 10)}
                              </td>
                              <td className="p-2.5 font-medium">{t.broker}</td>
                              <td className="p-2.5 font-bold">{t.asset}</td>
                              <td className="p-2.5">
                                {isTransfer ? (
                                  <Badge variant="outline" className="text-[10px] py-0 border-blue-500/50 text-blue-400 bg-blue-500/10">
                                    Transferência
                                  </Badge>
                                ) : isSell ? (
                                  <Badge variant="destructive" className="text-[10px] py-0">
                                    Venda
                                  </Badge>
                                ) : (
                                  <Badge variant="default" className="text-[10px] py-0">
                                    Compra
                                  </Badge>
                                )}
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
                    {trades.length > 0 && (
                      <tfoot className="border-t-2 border-border bg-muted/60 font-bold text-xs">
                        <tr>
                          <td colSpan={4} className="p-2.5 font-semibold text-foreground uppercase tracking-wider">
                            Valor Total Acumulado no Livro ({trades.length} ordens)
                          </td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">-</td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">-</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                            {fmtUSD(processed.reconciliation.totalVolumeUSD)}
                            <span className="block text-[10px] text-muted-foreground font-normal">
                              ({fmtBRL(processed.reconciliation.totalVolumeBRL)})
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono text-amber-400">
                            {fmtUSD(processed.reconciliation.totalFeesUSD)}
                          </td>
                          <td className="p-2.5 text-center text-muted-foreground">-</td>
                        </tr>
                      </tfoot>
                    )}
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

            {/* GCAP & IRPF Step-by-Step Guide Card */}
            <Card className="border-primary/40 bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="w-4.5 h-4.5 text-primary" /> Guia Passo a Passo: Declaração no GCAP & IRPF (Receita Federal)
                  </CardTitle>
                  <Badge variant="outline" className="text-primary border-primary/40 font-mono">
                    Receita Federal BR
                  </Badge>
                </div>
                <CardDescription>
                  Instruções oficiais para declaração de operações isentas (até R$ 35k/mês) e tributáveis no programa GCAP e no Imposto de Renda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CENÁRIO 1: ISENTO (<= 35K) */}
                  <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                    <div className="flex items-center justify-between font-bold text-emerald-400">
                      <span className="flex items-center gap-1.5 text-xs sm:text-sm">
                        <ShieldCheck className="w-4 h-4 shrink-0" /> 🟢 Vendas Isentas (≤ R$ 35.000,00/mês)
                      </span>
                      <Badge className="bg-emerald-500 text-black font-bold text-[10px]">Sem Imposto / Sem GCAP Mensal</Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Se as alienações totais no mês em corretoras nacionais ficaram em <strong>até R$ 35.000,00</strong>, você <strong>NÃO precisa preencher o GCAP nem emitir DARF mensal</strong>.
                    </p>

                    <div className="space-y-2 pt-1 border-t border-emerald-500/20">
                      <div className="font-semibold text-foreground">Como informar na Declaração Anual de Ajuste (IRPF):</div>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px]">
                        <li>
                          <strong className="text-foreground">Ficha "Rendimentos Isentos e Não Tributáveis":</strong> Clique em <em>Novo</em> e selecione o <strong>Código 05</strong> (<em>Ganho de capital na alienação de bem [...] até o limite de isenção</em>).
                        </li>
                        <li>
                          <strong className="text-foreground">Lucro Isento Acumulado:</strong> Informe o lucro total isento acumulado nas vendas dos meses que ficaram dentro dos R$ 35k.
                        </li>
                        <li>
                          <strong className="text-foreground">Ficha "Bens e Direitos":</strong> No Grupo <strong>08 (Criptoativos)</strong>, informe o código do ativo (ex: 01-BTC, 02-Altcoins, 03-Stablecoins) e atualize a Situação em 31/12 com o <strong>Custo de Aquisição Total acumulado</strong>.
                        </li>
                      </ol>
                    </div>
                  </div>

                  {/* CENÁRIO 2: TRIBUTÁVEL (> 35K ou INTERNACIONAL) */}
                  <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <div className="flex items-center justify-between font-bold text-amber-400">
                      <span className="flex items-center gap-1.5 text-xs sm:text-sm">
                        <Calculator className="w-4 h-4 shrink-0" /> 🟠 Vendas Tributáveis {"(>"} R$ 35.000 ou Internacional)
                      </span>
                      <Badge variant="destructive" className="text-[10px]">Exige GCAP + DARF (15%)</Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Se as vendas ultrapassarem R$ 35.000,00 em um mês em corretoras nacionais, <strong>100% do lucro é tributado a 15%</strong>.
                    </p>

                    <div className="space-y-2 pt-1 border-t border-amber-500/20">
                      <div className="font-semibold text-foreground">Passo a Passo Oficial no Programa GCAP:</div>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px]">
                        <li>
                          <strong className="text-foreground">Baixar o GCAP:</strong> Baixe o programa <em>GCAP (do ano da venda)</em> no site da Receita Federal.
                        </li>
                        <li>
                          <strong className="text-foreground">Nova Ficha:</strong> Escolha a aba <strong>Bens Móveis / Criptoativos</strong>.
                        </li>
                        <li>
                          <strong className="text-foreground">Dados de Custo:</strong> Copie do Invest Vision o <strong>Custo de Aquisição (Preço Médio)</strong> e a data de compra.
                        </li>
                        <li>
                          <strong className="text-foreground">Dados de Venda:</strong> Informe a data da venda, o <strong>Valor de Alienação (R$)</strong> e as taxas da exchange.
                        </li>
                        <li>
                          <strong className="text-foreground">Gerar DARF 4600:</strong> Na aba <em>Imposto Devido</em>, clique em <strong>Gerar DARF (Código 4600)</strong> e pague até o último dia útil do mês seguinte.
                        </li>
                        <li>
                          <strong className="text-foreground">Importar no IRPF:</strong> Na declaração anual do IR do ano seguinte, use a função <em>Importar Dados do GCAP</em>.
                        </li>
                      </ol>
                    </div>
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

            {/* Fiscal Incoherency Audit & Reconciliation Card */}
            <Card className="border-amber-500/40 bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-amber-400" /> Auditoria & Validação de Incoerências Fiscais
                  </CardTitle>
                  <Badge
                    variant={processed.reconciliation.confidenceScorePct === 100 ? "default" : "destructive"}
                    className="font-mono"
                  >
                    {processed.reconciliation.confidenceScorePct}% Coerência Fiscal
                  </Badge>
                </div>
                <CardDescription>
                  Validação cruzada entre os lançamentos do Livro Contábil e as posições reais da sua Carteira de Investimentos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Portfolio Comparison Table */}
                <div className="border border-border/50 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground text-left">
                        <th className="p-2.5">Ativo</th>
                        <th className="p-2.5 text-right">Qtd no Livro Contábil</th>
                        <th className="p-2.5 text-right">Qtd nos Investimentos</th>
                        <th className="p-2.5 text-right">Diferença</th>
                        <th className="p-2.5 text-right">PM Livro (USD)</th>
                        <th className="p-2.5 text-right">PM Investimentos (USD)</th>
                        <th className="p-2.5 text-center">Status Fiscal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processed.reconciliation.portfolioComparison?.map((comp) => {
                        const isMatch = comp.status === "MATCH";
                        const isQtyMismatch = comp.status === "MISMATCH_QTY";
                        return (
                          <tr key={comp.asset} className="border-b border-border/40 hover:bg-muted/20">
                            <td className="p-2.5 font-bold">{comp.asset}</td>
                            <td className="p-2.5 text-right font-mono">{comp.bookQuantity.toFixed(6)}</td>
                            <td className="p-2.5 text-right font-mono font-medium">{comp.portfolioQuantity.toFixed(6)}</td>
                            <td className={`p-2.5 text-right font-mono font-bold ${isQtyMismatch ? "text-red-400" : "text-emerald-400"}`}>
                              {comp.diffQuantity > 0 ? `+${comp.diffQuantity.toFixed(6)}` : comp.diffQuantity.toFixed(6)}
                            </td>
                            <td className="p-2.5 text-right font-mono">{fmtUSD(comp.bookAvgPriceUSD)}</td>
                            <td className="p-2.5 text-right font-mono">{fmtUSD(comp.portfolioAvgPriceUSD)}</td>
                            <td className="p-2.5 text-center">
                              {isMatch ? (
                                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                                  🟢 100% Coerente
                                </Badge>
                              ) : isQtyMismatch ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  🔴 Incoerência de Custódia
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40">
                                  🟡 Divergência de PM
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Fiscal Issues List */}
                {processed.reconciliation.issues.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-400" /> Alertas de Incoerência Fiscal Detectados ({processed.reconciliation.issues.length}):
                    </h4>
                    <div className="space-y-2">
                      {processed.reconciliation.issues.map((iss) => (
                        <div key={iss.id} className={`p-3 rounded-lg border text-xs space-y-1 ${iss.severity === "HIGH" ? "bg-red-500/10 border-red-500/40" : "bg-amber-500/10 border-amber-500/40"}`}>
                          <div className="flex items-center justify-between font-bold">
                            <span className={iss.severity === "HIGH" ? "text-red-400" : "text-amber-400"}>
                              {iss.asset}: {iss.type}
                            </span>
                            <Badge variant={iss.severity === "HIGH" ? "destructive" : "outline"} className="text-[9px]">
                              {iss.severity === "HIGH" ? "ALTA GRAVIDADE" : "MÉDIA GRAVIDADE"}
                            </Badge>
                          </div>
                          <div className="text-foreground">{iss.description}</div>
                          <div className="text-muted-foreground text-[11px] italic font-mono pt-1">
                            💡 Ação Sugerida: {iss.suggestedAction}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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

            {/* Hybrid Buyback Simulator: "Metodologia Híbrida (Reset & Limit DCA)" */}
            <Card className="border-emerald-500/40 bg-gradient-to-b from-card via-card to-emerald-950/10 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Simulador: "Metodologia Híbrida de Recompra (Reset & Limit DCA)"
                  </CardTitle>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 font-mono">
                    Escudo Fiscal + Liquidez
                  </Badge>
                </div>
                <CardDescription>
                  Combine a elevação do Preço Médio (recompra imediata) com compras parceladas em caso de queda do mercado (caixa em yield).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3 bg-muted/40 rounded-lg border border-border/50">
                  <div>
                    <Label className="text-[11px] font-semibold">Ativo</Label>
                    <Input
                      value={hybridAsset}
                      onChange={(e) => setHybridAsset(e.target.value)}
                      className="h-8 text-xs font-bold uppercase"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Valor da Venda (R$)</Label>
                    <Input
                      value={hybridSaleValueBRL}
                      onChange={(e) => setHybridSaleValueBRL(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Preço Venda (US$)</Label>
                    <Input
                      value={hybridSellPriceUSD}
                      onChange={(e) => setHybridSellPriceUSD(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Divisão (% Imediato)</Label>
                    <Select
                      value={hybridSplitImmediatePct}
                      onValueChange={setHybridSplitImmediatePct}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50% / 50% (Equilibrado)</SelectItem>
                        <SelectItem value="70">70% / 30% (Recomendado)</SelectItem>
                        <SelectItem value="80">80% / 20% (Conservador)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Alvo 1 Queda (%)</Label>
                    <Input
                      value={hybridTarget1DropPct}
                      onChange={(e) => setHybridTarget1DropPct(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Alvo 2 Queda (%)</Label>
                    <Input
                      value={hybridTarget2DropPct}
                      onChange={(e) => setHybridTarget2DropPct(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Result Split Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fatia A Card */}
                  <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                    <div className="flex items-center justify-between font-bold text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" /> Fatia A: Recompra Imediata ({hybridSimulation.splitImmediatePct}%)
                      </span>
                      <span className="font-mono text-sm">{fmtBRL(hybridSimulation.immediateAmountBRL)}</span>
                    </div>
                    <div className="space-y-1 text-muted-foreground font-mono">
                      <div className="flex justify-between">
                        <span>Preço Executado:</span>
                        <span className="text-foreground">{fmtUSD(hybridSimulation.sellPriceUSD)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Moedas Recompradas:</span>
                        <span className="text-foreground font-bold">{hybridSimulation.immediateQtyRebought.toFixed(6)} {hybridSimulation.asset}</span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-500/20 pt-1">
                        <span>Proteção Contra Alta (FOMO):</span>
                        <span className="text-emerald-300 font-bold">{hybridSimulation.upsideProtectionPct}% posicionado</span>
                      </div>
                    </div>
                  </div>

                  {/* Fatia B Card */}
                  <div className="p-3.5 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-2">
                    <div className="flex items-center justify-between font-bold text-blue-400">
                      <span className="flex items-center gap-1.5">
                        <ArrowDownRight className="w-4 h-4" /> Fatia B: Caixa & Ordens Limite ({hybridSimulation.splitReservePct}%)
                      </span>
                      <span className="font-mono text-sm">{fmtBRL(hybridSimulation.reserveAmountBRL)}</span>
                    </div>
                    <div className="space-y-1 text-muted-foreground font-mono">
                      <div className="flex justify-between">
                        <span>Ordem Limite 1 (-{hybridSimulation.target1DropPct}%):</span>
                        <span className="text-foreground">{fmtUSD(hybridSimulation.target1PriceUSD)} ({hybridSimulation.target1QtyRebought.toFixed(6)} {hybridSimulation.asset})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ordem Limite 2 (-{hybridSimulation.target2DropPct}%):</span>
                        <span className="text-foreground">{fmtUSD(hybridSimulation.target2PriceUSD)} ({hybridSimulation.target2QtyRebought.toFixed(6)} {hybridSimulation.asset})</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-500/20 pt-1">
                        <span>Rendimento Estimado do Caixa:</span>
                        <span className="text-blue-300 font-bold">~{fmtBRL(hybridSimulation.projectedReserveYieldMonthlyBRL)} / mês em USDT/Selic</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulation Comparison Output Banner */}
                <div className="p-3 bg-card border border-emerald-500/40 rounded-lg space-y-2">
                  <div className="font-bold text-sm text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-400" /> Comparativo de Acúmulo de Moedas na Queda
                    </span>
                    <Badge className="bg-emerald-500 text-black font-bold">
                      +{hybridSimulation.extraCryptoGainedPct.toFixed(2)}% mais {hybridSimulation.asset}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs pt-1">
                    <div className="bg-background/60 p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[10px]">Recompra 100% Imediata:</span>
                      <span className="font-bold">{hybridSimulation.totalQtyIfImmediateOnly.toFixed(6)} {hybridSimulation.asset}</span>
                    </div>
                    <div className="bg-background/60 p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[10px]">Recompra na Metodologia Híbrida:</span>
                      <span className="font-bold text-emerald-400">{hybridSimulation.totalQtyIfHybridDropExecuted.toFixed(6)} {hybridSimulation.asset}</span>
                    </div>
                    <div className="bg-background/60 p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[10px]">Ganho Extra em Queda:</span>
                      <span className="font-bold text-emerald-300">+{hybridSimulation.extraCryptoQtyGained.toFixed(6)} {hybridSimulation.asset}</span>
                    </div>
                  </div>
                </div>

                {/* Action Plan Guidance */}
                <div className="p-3 bg-muted/30 rounded-lg space-y-2 border border-border/50">
                  <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Plano de Operações Recomendado na Corretora:
                    </span>
                    {hybridSimulation.isLimitExceeded ? (
                      <Badge variant="destructive" className="text-[10px]">
                        ⚠️ REQUER PARCELAMENTO EM {hybridSimulation.monthsRequiredForTaxExemption} MESES
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                        🟢 100% ISENTO NESTE MÊS
                      </Badge>
                    )}
                  </div>

                  {hybridSimulation.isLimitExceeded && (
                    <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-xs space-y-1">
                      <div className="font-bold text-red-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" /> 🚨 ATENÇÃO FISCAL: Venda acima do teto isento de R$ 35.000,00!
                      </div>
                      <div className="text-foreground">
                        Vender {fmtBRL(hybridSimulation.totalSaleValueBRL)} em um único mês <strong>ultrapassa o limite de R$ 35.000,00</strong> e faria você pagar 15% de imposto sobre todo o lucro.
                      </div>
                      <div className="text-emerald-300 font-semibold pt-0.5">
                        💡 Solução: Execute a estratégia em <strong>{hybridSimulation.monthsRequiredForTaxExemption} parcelas mensais de {fmtBRL(hybridSimulation.monthlyExemptInstallmentBRL)}/mês</strong> para garantir 100% de isenção de IR.
                      </div>
                    </div>
                  )}

                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-muted-foreground">
                    {hybridSimulation.isLimitExceeded ? (
                      <>
                        <li>
                          <strong className="text-emerald-400">Dividir em {hybridSimulation.monthsRequiredForTaxExemption} Meses Fiscais:</strong> Vender no máximo <strong className="text-foreground">{fmtBRL(hybridSimulation.monthlyExemptInstallmentBRL)}</strong> por mês de {hybridSimulation.asset} para não ultrapassar o teto isento de R$ 35.000/mês.
                        </li>
                        <li>
                          <strong className="text-foreground">Recompra Imediata Mensal (Fatia A):</strong> A cada mês, recomprar imediatamente <strong className="text-foreground">{fmtBRL(hybridSimulation.monthlyImmediateAmountBRL)}</strong> em {hybridSimulation.asset} a mercado (subindo o Preço Médio gradualmente).
                        </li>
                        <li>
                          <strong className="text-foreground">Caixa Tático Mensal (Fatia B):</strong> A cada mês, destinar <strong className="text-foreground">{fmtBRL(hybridSimulation.monthlyReserveAmountBRL)}</strong> para USDT rendendo em Staking/Earn.
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          Vender até <strong className="text-foreground">{fmtBRL(hybridSimulation.totalSaleValueBRL)}</strong> de {hybridSimulation.asset} dentro do mês sem pagar IR (abaixo do teto de R$ 35k).
                        </li>
                        <li>
                          Recomprar imediatamente <strong className="text-foreground">{fmtBRL(hybridSimulation.immediateAmountBRL)}</strong> em {hybridSimulation.asset} a mercado (eleva o Preço Médio no dia).
                        </li>
                        <li>
                          Deixar <strong className="text-foreground">{fmtBRL(hybridSimulation.reserveAmountBRL)}</strong> em USDT rendendo em Earn/Staking.
                        </li>
                      </>
                    )}
                    <li>
                      Configurar 2 Ordens Limites de Compra na exchange:
                      <span className="block pl-4 text-emerald-300">
                        • 50% do caixa guardado em <strong className="text-foreground">{fmtUSD(hybridSimulation.target1PriceUSD)}</strong> (-{hybridSimulation.target1DropPct}%)
                      </span>
                      <span className="block pl-4 text-emerald-300">
                        • 50% do caixa guardado em <strong className="text-foreground">{fmtUSD(hybridSimulation.target2PriceUSD)}</strong> (-{hybridSimulation.target2DropPct}%)
                      </span>
                    </li>
                  </ol>
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
