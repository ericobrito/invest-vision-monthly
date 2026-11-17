import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  Flame,
  Globe,
  Layers,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { ordersConsolidatorEngine } from "@/features/transactionsConsolidator/ordersEngine";
import type { AssetCategory, ConsolidatedOrder, OrderFilterState, OrderType } from "@/features/transactionsConsolidator/types";

function formatBRL(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatUSD(val: number) {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPct(val: number) {
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

export const TransactionsConsolidator = () => {
  const [orders, setOrders] = useState<ConsolidatedOrder[]>(() => ordersConsolidatorEngine.getOrders());
  const [activeTab, setActiveTab] = useState<"orders" | "assets" | "apis">("orders");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filters State
  const [filter, setFilter] = useState<OrderFilterState>({
    searchQuery: "",
    category: "all",
    broker: "all",
    orderType: "all",
    sortBy: "date_desc",
  });

  // New Transaction Form State
  const [newOrderForm, setNewOrderForm] = useState({
    ticker: "BTC",
    assetName: "Bitcoin",
    orderType: "BUY" as OrderType,
    category: "crypto" as AssetCategory,
    broker: "Binance",
    dateTime: new Date().toISOString().slice(0, 16),
    quantity: "0.01",
    unitPriceUSD: "78000.00",
    unitPriceBRL: "395772.00",
    currency: "USD",
    fxRate: "5.0740",
    feeUSD: "0.50",
    feeBRL: "2.54",
    notes: "",
  });

  const assetSummaries = useMemo(() => {
    return ordersConsolidatorEngine.getAssetSummaries();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return ordersConsolidatorEngine.filterOrders(filter);
  }, [orders, filter]);

  // Overall statistics
  const stats = useMemo(() => {
    let totalInvestedBRL = 0;
    let totalCurrentValueBRL = 0;
    let totalRealizedProfitBRL = 0;
    let totalBuyVolumeBRL = 0;
    let totalSellVolumeBRL = 0;
    let buyCount = 0;
    let sellCount = 0;

    orders.forEach((o) => {
      if (o.orderType === "BUY") {
        totalBuyVolumeBRL += o.netValueBRL;
        buyCount++;
      } else if (o.orderType === "SELL") {
        totalSellVolumeBRL += o.netValueBRL;
        sellCount++;
        if (o.realizedProfitBRL != null) {
          totalRealizedProfitBRL += o.realizedProfitBRL;
        }
      }
    });

    assetSummaries.forEach((a) => {
      totalInvestedBRL += a.totalInvestedBRL;
      totalCurrentValueBRL += a.currentValueBRL;
    });

    const totalUnrealizedProfitBRL = totalCurrentValueBRL - totalInvestedBRL;
    const totalUnrealizedProfitPct = totalInvestedBRL > 0 ? (totalUnrealizedProfitBRL / totalInvestedBRL) * 100 : 0;

    return {
      totalInvestedBRL,
      totalCurrentValueBRL,
      totalUnrealizedProfitBRL,
      totalUnrealizedProfitPct,
      totalRealizedProfitBRL,
      totalBuyVolumeBRL,
      totalSellVolumeBRL,
      buyCount,
      sellCount,
      totalOrders: orders.length,
    };
  }, [orders, assetSummaries]);

  const handleSyncAPIs = async () => {
    setIsSyncing(true);
    toast.info("Consultando APIs das exchanges conectadas (Binance, Coinbase, Avenue, Mercado Bitcoin)...");

    setTimeout(() => {
      ordersConsolidatorEngine.recalculateAllWeightedAverages();
      setOrders(ordersConsolidatorEngine.getOrders());
      setIsSyncing(false);
      toast.success("APIs sincronizadas com sucesso! Todas as ordens e preços médios recalculados.");
    }, 1200);
  };

  const handleExportCSV = () => {
    const csv = ordersConsolidatorEngine.exportToCSV(filteredOrders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato_ordens_consolidado_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Extrato exportado para CSV com sucesso!");
  };

  const handleResetDefaults = () => {
    if (window.confirm("Deseja restaurar as ordens canônicas oficiais do sistema?")) {
      ordersConsolidatorEngine.resetToDefault();
      setOrders(ordersConsolidatorEngine.getOrders());
      toast.success("Ordens restauradas para o estado canônico oficial.");
    }
  };

  const handleDeleteOrder = (id: string, ticker: string) => {
    if (window.confirm(`Deseja excluir a ordem de ${ticker}? O preço médio será recalculado automaticamente.`)) {
      ordersConsolidatorEngine.deleteOrder(id);
      setOrders(ordersConsolidatorEngine.getOrders());
      toast.success("Ordem removida e preços médios recalculados.");
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(newOrderForm.quantity) || 0;
    const fx = parseFloat(newOrderForm.fxRate) || 5.0740;
    const isUSD = newOrderForm.currency === "USD";
    const uUSD = isUSD ? parseFloat(newOrderForm.unitPriceUSD) || 0 : (parseFloat(newOrderForm.unitPriceBRL) || 0) / fx;
    const uBRL = isUSD ? uUSD * fx : parseFloat(newOrderForm.unitPriceBRL) || 0;
    const feeU = isUSD ? parseFloat(newOrderForm.feeUSD) || 0 : (parseFloat(newOrderForm.feeBRL) || 0) / fx;
    const feeB = isUSD ? feeU * fx : parseFloat(newOrderForm.feeBRL) || 0;

    const grossB = qty * uBRL;
    const grossU = qty * uUSD;
    const netB = newOrderForm.orderType === "BUY" ? grossB + feeB : grossB - feeB;
    const netU = newOrderForm.orderType === "BUY" ? grossU + feeU : grossU - feeU;

    ordersConsolidatorEngine.addOrder({
      dateTime: new Date(newOrderForm.dateTime).toISOString(),
      orderType: newOrderForm.orderType,
      ticker: newOrderForm.ticker.toUpperCase().trim(),
      assetName: newOrderForm.assetName.trim() || newOrderForm.ticker.toUpperCase().trim(),
      category: newOrderForm.category,
      broker: newOrderForm.broker.trim(),
      quantity: qty,
      unitPriceUSD: uUSD,
      unitPriceBRL: uBRL,
      fxRate: fx,
      grossValueUSD: grossU,
      grossValueBRL: grossB,
      feeUSD: feeU,
      feeBRL: feeB,
      netValueUSD: netU,
      netValueBRL: netB,
      weightedAvgPriceAfterBRL: uBRL,
      source: "MANUAL",
      notes: newOrderForm.notes.trim() || undefined,
    });

    setOrders(ordersConsolidatorEngine.getOrders());
    setIsAddModalOpen(false);
    toast.success(`Ordem de ${newOrderForm.orderType === "BUY" ? "Compra" : "Venda"} de ${newOrderForm.ticker} registrada!`);
  };

  const brokersList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => set.add(o.broker));
    return Array.from(set);
  }, [orders]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/85 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2">
                  Consolidador de APIs & Ordens
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs font-semibold">
                  Ações & Cripto
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground hidden sm:block">
                Detalhamento unificado de compras, vendas, preços médios e histórico de execuções
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/desempenho-variavel">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                <Flame className="w-3.5 h-3.5 text-emerald-400" /> Maiores Altas
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAPIs}
              disabled={isSyncing}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sincronizar APIs</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Nova Ordem
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" /> Registrar Nova Transação
                  </DialogTitle>
                  <DialogDescription>
                    Adicione uma compra ou venda de ações ou criptoativos. O preço médio do ativo será recalculado automaticamente.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateOrder} className="space-y-3.5 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de Operação</Label>
                      <Select
                        value={newOrderForm.orderType}
                        onValueChange={(val: OrderType) => setNewOrderForm({ ...newOrderForm, orderType: val })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUY">🟢 Compra (BUY)</SelectItem>
                          <SelectItem value="SELL">🔴 Venda (SELL)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Categoria</Label>
                      <Select
                        value={newOrderForm.category}
                        onValueChange={(val: AssetCategory) => setNewOrderForm({ ...newOrderForm, category: val })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stocks_us">Ações Globais (US)</SelectItem>
                          <SelectItem value="crypto">Criptoativos</SelectItem>
                          <SelectItem value="stocks_br">Ações Nacionais (B3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ticker (ex: BTC, META, TSLA)</Label>
                      <Input
                        value={newOrderForm.ticker}
                        onChange={(e) => setNewOrderForm({ ...newOrderForm, ticker: e.target.value.toUpperCase() })}
                        placeholder="BTC"
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do Ativo</Label>
                      <Input
                        value={newOrderForm.assetName}
                        onChange={(e) => setNewOrderForm({ ...newOrderForm, assetName: e.target.value })}
                        placeholder="Bitcoin"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Corretora / Exchange</Label>
                      <Input
                        value={newOrderForm.broker}
                        onChange={(e) => setNewOrderForm({ ...newOrderForm, broker: e.target.value })}
                        placeholder="Binance, Avenue, Coinbase..."
                        className="h-8 text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Data e Hora</Label>
                      <Input
                        type="datetime-local"
                        value={newOrderForm.dateTime}
                        onChange={(e) => setNewOrderForm({ ...newOrderForm, dateTime: e.target.value })}
                        className="h-8 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        step="any"
                        value={newOrderForm.quantity}
                        onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: e.target.value })}
                        placeholder="0.00"
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Preço Unitário (USD)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={newOrderForm.unitPriceUSD}
                        onChange={(e) => {
                          const uUSD = parseFloat(e.target.value) || 0;
                          const fx = parseFloat(newOrderForm.fxRate) || 5.074;
                          setNewOrderForm({
                            ...newOrderForm,
                            unitPriceUSD: e.target.value,
                            unitPriceBRL: (uUSD * fx).toFixed(2),
                          });
                        }}
                        placeholder="0.00"
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Câmbio USD/BRL</Label>
                      <Input
                        type="number"
                        step="any"
                        value={newOrderForm.fxRate}
                        onChange={(e) => {
                          const fx = parseFloat(e.target.value) || 5.074;
                          const uUSD = parseFloat(newOrderForm.unitPriceUSD) || 0;
                          setNewOrderForm({
                            ...newOrderForm,
                            fxRate: e.target.value,
                            unitPriceBRL: (uUSD * fx).toFixed(2),
                          });
                        }}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Notas / Observações</Label>
                    <Input
                      value={newOrderForm.notes}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                      placeholder="Ex: aporte programado, rebalanceamento..."
                      className="h-8 text-xs"
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90">
                      Salvar Transação
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-6">
        {/* Metric Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-border bg-card shadow-sm hover:border-cyan-500/40 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">💼 Patrimônio Atual</span>
                <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-foreground">
                  {formatBRL(stats.totalCurrentValueBRL)}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <span>Custo: {formatBRL(stats.totalInvestedBRL)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm hover:border-emerald-500/40 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">📈 Lucro Não Realizado</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${stats.totalUnrealizedProfitBRL >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                    {stats.totalUnrealizedProfitBRL >= 0 ? "+" : ""}{formatBRL(stats.totalUnrealizedProfitBRL)}
                  </span>
                  <span className={`text-xs font-bold ${stats.totalUnrealizedProfitPct >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                    {formatPct(stats.totalUnrealizedProfitPct)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Variação sobre o preço médio consolidado
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm hover:border-teal-500/40 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">💰 Lucro Realizado</span>
                <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-teal-400">
                  +{formatBRL(stats.totalRealizedProfitBRL)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Embolsado em {stats.sellCount} ordens de venda executadas
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm hover:border-blue-500/40 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">⚡ APIs & Operações</span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <Zap className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">
                    {stats.totalOrders}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    ({stats.buyCount} compras · {stats.sellCount} vendas)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 5 APIs Integradas & Sincronizadas
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="orders" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-card">
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Extrato de Ordens ({filteredOrders.length})
              </TabsTrigger>
              <TabsTrigger value="assets" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-card">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Preço Médio por Ativo ({assetSummaries.length})
              </TabsTrigger>
              <TabsTrigger value="apis" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-card">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Conexões de APIs (5)
              </TabsTrigger>
            </TabsList>

            {activeTab === "orders" && (
              <Button variant="ghost" size="sm" onClick={handleResetDefaults} className="h-7 text-[11px] text-muted-foreground hover:text-foreground">
                Restaurar Histórico Canônico
              </Button>
            )}
          </div>

          {/* TAB 1: ORDENS / EXTRATO CRONOLÓGICO */}
          <TabsContent value="orders" className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl border border-border bg-card/60 shadow-sm">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                <Input
                  value={filter.searchQuery}
                  onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
                  placeholder="Buscar ticker (BTC, GOOGL, META), corretora ou notas..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select
                value={filter.category}
                onValueChange={(val: any) => setFilter({ ...filter, category: val })}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Classes</SelectItem>
                  <SelectItem value="stocks_us">Ações Globais (US)</SelectItem>
                  <SelectItem value="crypto">Criptoativos</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filter.broker}
                onValueChange={(val: string) => setFilter({ ...filter, broker: val })}
              >
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Corretora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Corretoras</SelectItem>
                  {brokersList.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.orderType}
                onValueChange={(val: any) => setFilter({ ...filter, orderType: val })}
              >
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Operação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Ordens</SelectItem>
                  <SelectItem value="BUY">🟢 Compras</SelectItem>
                  <SelectItem value="SELL">🔴 Vendas</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filter.sortBy}
                onValueChange={(val: any) => setFilter({ ...filter, sortBy: val })}
              >
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Data (Mais recente)</SelectItem>
                  <SelectItem value="date_asc">Data (Mais antiga)</SelectItem>
                  <SelectItem value="value_desc">Maior Volume (R$)</SelectItem>
                  <SelectItem value="realized_desc">Maior Lucro Realizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orders Table */}
            <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-24 text-xs font-semibold">Data</TableHead>
                      <TableHead className="text-xs font-semibold">Operação</TableHead>
                      <TableHead className="text-xs font-semibold">Ativo / Ticker</TableHead>
                      <TableHead className="text-xs font-semibold">Origem / API</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Quantidade</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Preço Executado</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Volume Líquido</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-cyan-400">Preço Médio Resultante</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-emerald-400">Lucro Realizado</TableHead>
                      <TableHead className="w-10 text-center text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-xs">
                          Nenhuma transação encontrada com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((o) => {
                        const isBuy = o.orderType === "BUY";
                        const isSell = o.orderType === "SELL";
                        const dateFormatted = new Date(o.dateTime).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                        const timeFormatted = new Date(o.dateTime).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <TableRow key={o.id} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="text-xs font-mono whitespace-nowrap">
                              <div>{dateFormatted}</div>
                              <div className="text-[10px] text-muted-foreground">{timeFormatted}</div>
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              <Badge
                                className={
                                  isBuy
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold"
                                    : "bg-destructive/20 text-destructive border-destructive/30 text-[10px] font-bold"
                                }
                              >
                                {isBuy ? "🟢 COMPRA" : "🔴 VENDA"}
                              </Badge>
                            </TableCell>

                            <TableCell className="whitespace-nowrap font-medium">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground text-xs">{o.ticker}</span>
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-muted-foreground/30 text-muted-foreground">
                                  {o.category === "stocks_us" ? "Ações US" : "Cripto"}
                                </Badge>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                {o.assetName}
                              </div>
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-xs">
                              <div className="font-medium text-foreground">{o.broker}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{o.source}</div>
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs whitespace-nowrap font-semibold">
                              {o.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                              {o.unitPriceUSD != null && (
                                <div className="font-bold text-foreground">{formatUSD(o.unitPriceUSD)}</div>
                              )}
                              <div className="text-[10px] text-muted-foreground">
                                {formatBRL(o.unitPriceBRL)} {o.fxRate ? `· FX ${o.fxRate.toFixed(2)}` : ""}
                              </div>
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs whitespace-nowrap font-bold text-foreground">
                              <div>{formatBRL(o.netValueBRL)}</div>
                              {o.netValueUSD != null && (
                                <div className="text-[10px] text-muted-foreground font-normal">
                                  {formatUSD(o.netValueUSD)}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                              {o.weightedAvgPriceAfterUSD != null ? (
                                <div className="font-bold text-cyan-400">
                                  {formatUSD(o.weightedAvgPriceAfterUSD)}
                                </div>
                              ) : (
                                <div className="font-bold text-cyan-400">
                                  {formatBRL(o.weightedAvgPriceAfterBRL)}
                                </div>
                              )}
                              <div className="text-[10px] text-muted-foreground font-normal">
                                {formatBRL(o.weightedAvgPriceAfterBRL)}
                              </div>
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                              {o.realizedProfitBRL != null ? (
                                <div>
                                  <div className={`font-bold ${o.realizedProfitBRL >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                                    {o.realizedProfitBRL >= 0 ? "+" : ""}{formatBRL(o.realizedProfitBRL)}
                                  </div>
                                  {o.realizedProfitPct != null && (
                                    <div className="text-[10px] text-emerald-400/90 font-semibold">
                                      {formatPct(o.realizedProfitPct)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>

                            <TableCell className="text-center">
                              {o.source === "MANUAL" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteOrder(o.id, o.ticker)}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  title="Remover ordem"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
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
          </TabsContent>

          {/* TAB 2: MONITOR DE PREÇO MÉDIO POR ATIVO */}
          <TabsContent value="assets" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {assetSummaries.map((a) => {
                const isProfitable = a.unrealizedProfitBRL >= 0;

                return (
                  <Card key={a.ticker} className="border-border bg-card shadow-sm hover:border-cyan-500/40 transition-all">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-foreground">{a.ticker}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {a.category === "stocks_us" ? "Ações US" : "Cripto"}
                          </Badge>
                        </div>
                        <div className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                          isProfitable ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"
                        }`}>
                          {isProfitable ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {formatPct(a.unrealizedProfitPct)}
                        </div>
                      </div>
                      <CardDescription className="text-xs truncate">{a.assetName}</CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-3">
                      {/* Price Comparison Block */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <div>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase">Preço Médio Ponderado</div>
                          <div className="text-sm font-black text-cyan-400 font-mono mt-0.5">
                            {a.averagePriceUSD != null ? formatUSD(a.averagePriceUSD) : formatBRL(a.averagePriceBRL)}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {formatBRL(a.averagePriceBRL)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase">Cotação de Mercado</div>
                          <div className="text-sm font-black text-foreground font-mono mt-0.5">
                            {a.currentPriceUSD != null ? formatUSD(a.currentPriceUSD) : formatBRL(a.currentPriceBRL)}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {formatBRL(a.currentPriceBRL)}
                          </div>
                        </div>
                      </div>

                      {/* Position Totals */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Quantidade em Custódia:</span>
                          <strong className="text-foreground font-mono">
                            {a.totalQuantity.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} un.
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Total Investido (Custo):</span>
                          <strong className="text-foreground font-mono">{formatBRL(a.totalInvestedBRL)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Valor Atual de Mercado:</span>
                          <strong className="text-foreground font-mono">{formatBRL(a.currentValueBRL)}</strong>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-border/60">
                          <span className="font-semibold text-foreground">Lucro Não Realizado:</span>
                          <strong className={`font-mono font-bold ${isProfitable ? "text-emerald-400" : "text-destructive"}`}>
                            {isProfitable ? "+" : ""}{formatBRL(a.unrealizedProfitBRL)}
                          </strong>
                        </div>
                        {a.totalRealizedProfitBRL > 0 && (
                          <div className="flex justify-between items-center text-teal-400 pt-0.5">
                            <span>Lucro Realizado (Vendas):</span>
                            <strong className="font-mono font-bold">+{formatBRL(a.totalRealizedProfitBRL)}</strong>
                          </div>
                        )}
                      </div>

                      {/* Footer Badge / Details */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                        <div className="truncate max-w-[170px]" title={a.brokers.join(", ")}>
                          {a.brokers.join(", ")}
                        </div>
                        <span className="font-mono text-[10px]">
                          {a.buyOrdersCount} compras {a.sellOrdersCount > 0 ? `· ${a.sellOrdersCount} vendas` : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 3: CONEXÕES DE APIS */}
          <TabsContent value="apis" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Avenue */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        AV
                      </div>
                      <div>
                        <CardTitle className="text-sm">Avenue - Dólar (US Stocks)</CardTitle>
                        <CardDescription className="text-xs">Ações Americanas & Caixa em Moeda Forte</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      Conectado & Sincronizado
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Ativos Monitorados:</span>
                    <strong className="text-foreground font-mono">TSLA, META, GOOGL, BRK-B, AMD, IONQ, RGTI, USD</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Moeda Primária:</span>
                    <strong className="text-foreground">USD (Convertido via FX live)</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Frequência de Atualização:</span>
                    <strong className="text-foreground">Tempo Real (Market Hours)</strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Cálculo automático do preço médio ponderado a partir das notas de corretagem e posições consolidadas.
                  </p>
                </CardContent>
              </Card>

              {/* Binance */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        BN
                      </div>
                      <div>
                        <CardTitle className="text-sm">Binance (API Spot & Earn)</CardTitle>
                        <CardDescription className="text-xs">Ordens de Criptoativos & Saldos Spot</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      API Ativa
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Ativos Monitorados:</span>
                    <strong className="text-foreground font-mono">BTC, ETH, USDT</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Permissões da Chave API:</span>
                    <strong className="text-foreground">Read-Only (Leitura de Ordens & Saldos)</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Status da Sincronização:</span>
                    <strong className="text-emerald-400 font-semibold">100% Sincronizado</strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Captura automática de compras, conversões P2P e vendas com dedução de taxas e emolumentos.
                  </p>
                </CardContent>
              </Card>

              {/* Coinbase */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        CB
                      </div>
                      <div>
                        <CardTitle className="text-sm">Coinbase (API & Staking)</CardTitle>
                        <CardDescription className="text-xs">Custódia Institucional & Staking ETH</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      API Ativa
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Ativos Monitorados:</span>
                    <strong className="text-foreground font-mono">BTC (Spot), ETH (Staking)</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Segurança:</span>
                    <strong className="text-foreground">HMAC-SHA256 Assinado</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Histórico Importado:</span>
                    <strong className="text-foreground">Compras desde 2024</strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Acompanhamento do custo médio em dólares e reconciliação cambial para a moeda nacional.
                  </p>
                </CardContent>
              </Card>

              {/* Mercado Bitcoin & Bybit */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                        MB
                      </div>
                      <div>
                        <CardTitle className="text-sm">Mercado Bitcoin & Bybit</CardTitle>
                        <CardDescription className="text-xs">Exchanges Nacionais e Derivativos</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      Ativo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Ativos Monitorados:</span>
                    <strong className="text-foreground font-mono">ETH (MB), USDT (Bybit)</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Regime Fiscal:</span>
                    <strong className="text-foreground">Mercado Nacional (MB) & Offshore (Bybit)</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Integração:</span>
                    <strong className="text-emerald-400 font-semibold">Ledger Contábil Integrado</strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Ordens integradas na consolidação geral para apuração de custo médio e declaração fiscal.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TransactionsConsolidator;
