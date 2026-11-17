import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExchangeOrdersSyncService } from "@/services/ExchangeOrdersSyncService";
import { useSnapshots } from "@/hooks/useSnapshots";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  Coins,
  DollarSign,
  Download,
  FileSpreadsheet,
  Flame,
  Globe,
  Info,
  Layers,
  Link as LinkIcon,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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

export interface DeclaredAsset {
  id: string;
  investmentName: string;
  broker: string;
  ticker: string;
  assetName: string;
  category: AssetCategory;
  currency: "USD" | "BRL";
  currentQuantity: number;
  averagePrice?: number;
  currentPrice?: number;
  fxRate?: number;
}

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
  const { data: monthlyData = [] } = useSnapshots();
  const currentSnapshot = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : undefined;

  const [orders, setOrders] = useState<ConsolidatedOrder[]>(() => ordersConsolidatorEngine.getOrders());
  const [activeTab, setActiveTab] = useState<"orders" | "assets" | "apis">("orders");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Selected declared asset from user's portfolio list
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");

  // Filters State
  const [filter, setFilter] = useState<OrderFilterState>({
    searchQuery: "",
    category: "all",
    broker: "all",
    orderType: "all",
    year: "all",
    sortBy: "date_desc",
  });

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.dateTime) {
        const y = new Date(o.dateTime).getFullYear().toString();
        if (y && y !== "NaN") set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  // Extract all assets declared in user's portfolio (useSnapshots)
  const declaredAssets = useMemo<DeclaredAsset[]>(() => {
    const list: DeclaredAsset[] = [];
    const investments = currentSnapshot?.investments || [];

    const inferCat = (invName: string, ticker: string, curr: string): AssetCategory => {
      const lowInv = invName.toLowerCase();
      const lowT = ticker.toLowerCase();
      if (
        lowInv.includes("binance") ||
        lowInv.includes("bybit") ||
        lowInv.includes("coinbase") ||
        lowInv.includes("mercado bitcoin") ||
        lowInv.includes("cripto") ||
        lowInv.includes("bitcoin") ||
        ["btc", "eth", "usdt", "sol", "bnb", "ada", "xrp"].includes(lowT)
      ) {
        return "crypto";
      }
      if (lowInv.includes("avenue") || curr === "USD") {
        return "stocks_us";
      }
      return "stocks_br";
    };

    const inferBroker = (invName: string): string => {
      const low = invName.toLowerCase();
      if (low.includes("binance")) return "Binance";
      if (low.includes("avenue")) return "Avenue";
      if (low.includes("coinbase")) return "Coinbase";
      if (low.includes("bybit")) return "Bybit";
      if (low.includes("mercado bitcoin")) return "Mercado Bitcoin";
      if (low.includes("nubank")) return "NuBank";
      if (low.includes("xp")) return "XP Investimentos";
      if (low.includes("sofisa")) return "Sofisa Direto";
      if (low.includes("allu")) return "Allu Invest";
      if (low.includes("ajx")) return "Ajx Capital";
      return invName.split("-")[0].trim();
    };

    investments.forEach((inv) => {
      const broker = inferBroker(inv.name);
      const isUSD = (inv.currency || "").toUpperCase() === "USD";

      if (inv.positions && Array.isArray(inv.positions) && inv.positions.length > 0) {
        inv.positions.forEach((pos) => {
          const sym = (pos.symbol || pos.ticker || "").toUpperCase().trim();
          if (!sym) return;

          const cat = inferCat(inv.name, sym, pos.currency || inv.currency || "USD");
          list.push({
            id: `${inv.name}::${sym}`,
            investmentName: inv.name,
            broker,
            ticker: sym,
            assetName: pos.name || sym,
            category: cat,
            currency: (pos.currency || inv.currency || (isUSD ? "USD" : "BRL")) as "USD" | "BRL",
            currentQuantity: pos.quantity || 0,
            averagePrice: pos.averagePrice,
            currentPrice: pos.currentPrice,
            fxRate: pos.fxRate || (isUSD ? 5.8069 : 1),
          });
        });
      } else {
        const low = inv.name.toLowerCase();
        if (
          inv.incomeType === "variable" ||
          low.includes("ações") ||
          low.includes("acoes") ||
          low.includes("fii") ||
          low.includes("cripto") ||
          low.includes("bitcoin")
        ) {
          const cat = inferCat(inv.name, inv.name, inv.currency || "BRL");
          const ticker = low.includes("ações") || low.includes("acoes")
            ? "ACOES-BR"
            : low.includes("fii")
            ? "FII-BR"
            : inv.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

          list.push({
            id: `${inv.name}::${ticker}`,
            investmentName: inv.name,
            broker,
            ticker,
            assetName: inv.name,
            category: cat,
            currency: isUSD ? "USD" : "BRL",
            currentQuantity: 1,
            currentPrice: inv.value,
            averagePrice: inv.applied || inv.value,
            fxRate: isUSD ? 5.8069 : 1,
          });
        }
      }
    });

    if (list.length === 0) {
      return [
        { id: "Avenue - Dólar::TSLA", investmentName: "Avenue - Dólar", broker: "Avenue", ticker: "TSLA", assetName: "Tesla Inc", category: "stocks_us", currency: "USD", currentQuantity: 14.0829, currentPrice: 379.74, averagePrice: 319.69, fxRate: 5.7838 },
        { id: "Avenue - Dólar::META", investmentName: "Avenue - Dólar", broker: "Avenue", ticker: "META", assetName: "Meta Platforms Inc", category: "stocks_us", currency: "USD", currentQuantity: 2.9699, currentPrice: 626.41, averagePrice: 210.52, fxRate: 5.7838 },
        { id: "Avenue - Dólar::BRK.B", investmentName: "Avenue - Dólar", broker: "Avenue", ticker: "BRK.B", assetName: "Berkshire Hathaway Inc Class B", category: "stocks_us", currency: "USD", currentQuantity: 2.5976, currentPrice: 592.85, averagePrice: 229.16, fxRate: 5.7838 },
        { id: "Avenue - Dólar::GOOGL", investmentName: "Avenue - Dólar", broker: "Avenue", ticker: "GOOGL", assetName: "Alphabet Inc Class A", category: "stocks_us", currency: "USD", currentQuantity: 2.958, currentPrice: 283.72, averagePrice: 94.84, fxRate: 5.7838 },
        { id: "Avenue - Dólar::IONQ", investmentName: "Avenue - Dólar", broker: "Avenue", ticker: "IONQ", assetName: "IonQ Inc", category: "stocks_us", currency: "USD", currentQuantity: 5.0822, currentPrice: 42.54, averagePrice: 66.90, fxRate: 5.7838 },
        { id: "Avenue - Dólar::RGTI", investmentName: "Avenue - Dólar", broker: "Avenue", ticker: "RGTI", assetName: "Rigetti Computing Inc", category: "stocks_us", currency: "USD", currentQuantity: 8.0, currentPrice: 16.01, averagePrice: 48.87, fxRate: 5.7838 },
        { id: "Avenue - Dólar::AMD", investmentName: "Avenue - Dólar", broker: "Avenue", ticker: "AMD", assetName: "Advanced Micro Devices Inc", category: "stocks_us", currency: "USD", currentQuantity: 0.1947, currentPrice: 504.28, averagePrice: 196.89, fxRate: 5.7838 },
        { id: "Binance::BTC", investmentName: "Binance", broker: "Binance", ticker: "BTC", assetName: "Bitcoin", category: "crypto", currency: "USD", currentQuantity: 0.063748, currentPrice: 64882.87, averagePrice: 29882.78, fxRate: 5.8069 },
        { id: "Binance::ETH", investmentName: "Binance", broker: "Binance", ticker: "ETH", assetName: "Ethereum", category: "crypto", currency: "USD", currentQuantity: 1.476322, currentPrice: 1820.67, averagePrice: 2160.00, fxRate: 5.8069 },
        { id: "Binance::USDT", investmentName: "Binance", broker: "Binance", ticker: "USDT", assetName: "Tether USD", category: "crypto", currency: "USD", currentQuantity: 2170.73, currentPrice: 1.0, averagePrice: 1.0, fxRate: 5.8069 },
        { id: "Coinbase::ETH", investmentName: "Coinbase", broker: "Coinbase", ticker: "ETH", assetName: "Ethereum", category: "crypto", currency: "USD", currentQuantity: 0.9197, currentPrice: 1820.67, averagePrice: 2160.00, fxRate: 5.8069 },
        { id: "Mercado Bitcoin::BTC", investmentName: "Bitcoin - (API Mercado Bitcoin)", broker: "Mercado Bitcoin", ticker: "BTC", assetName: "Bitcoin", category: "crypto", currency: "USD", currentQuantity: 0.014, currentPrice: 64882.87, averagePrice: 29882.78, fxRate: 5.8069 },
      ];
    }

    return list;
  }, [currentSnapshot]);

  const groupedDeclaredAssets = useMemo(() => {
    const map = new Map<string, { investmentName: string; broker: string; category: AssetCategory; assets: DeclaredAsset[] }>();

    declaredAssets.forEach((a) => {
      const existing = map.get(a.investmentName);
      if (existing) {
        existing.assets.push(a);
      } else {
        map.set(a.investmentName, {
          investmentName: a.investmentName,
          broker: a.broker,
          category: a.category,
          assets: [a],
        });
      }
    });

    return Array.from(map.values());
  }, [declaredAssets]);

  const selectedAsset = useMemo(() => {
    return declaredAssets.find((a) => a.id === selectedAssetId);
  }, [declaredAssets, selectedAssetId]);

  // New Transaction Form State
  const [newOrderForm, setNewOrderForm] = useState({
    orderType: "BUY" as OrderType,
    dateTime: new Date().toISOString().slice(0, 16),
    quantity: "",
    unitPriceUSD: "",
    unitPriceBRL: "",
    fxRate: "5.8069",
    feeUSD: "0.00",
    feeBRL: "0.00",
    notes: "",
  });

  const handleSelectDeclaredAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    const asset = declaredAssets.find((a) => a.id === assetId);
    if (!asset) return;

    const fx = asset.fxRate || 5.8069;
    const isUSD = asset.currency === "USD";
    const refPriceUSD = asset.currentPrice || asset.averagePrice || (isUSD ? 100 : 100 / fx);
    const refPriceBRL = isUSD ? refPriceUSD * fx : (asset.currentPrice || asset.averagePrice || 100);

    setNewOrderForm((prev) => ({
      ...prev,
      fxRate: fx.toFixed(4),
      unitPriceUSD: refPriceUSD.toFixed(2),
      unitPriceBRL: refPriceBRL.toFixed(2),
      quantity: prev.quantity && parseFloat(prev.quantity) > 0 ? prev.quantity : "1",
    }));
  };

  const filteredOrders = useMemo(() => {
    return ordersConsolidatorEngine.filterOrders(filter);
  }, [orders, filter]);

  const isFiltered = useMemo(() => {
    return Boolean(
      (filter.year && filter.year !== "all") ||
      (filter.broker && filter.broker !== "all") ||
      (filter.category && filter.category !== "all") ||
      (filter.orderType && filter.orderType !== "all") ||
      filter.searchQuery.trim()
    );
  }, [filter]);

  const assetSummaries = useMemo(() => {
    if (isFiltered) {
      return ordersConsolidatorEngine.getAssetSummaries(filteredOrders);
    }
    return ordersConsolidatorEngine.getAssetSummaries();
  }, [orders, filteredOrders, isFiltered]);

  // Statistics derived directly from filtered orders and their asset summaries
  const stats = useMemo(() => {
    let totalInvestedBRL = 0;
    let totalCurrentValueBRL = 0;
    let totalRealizedProfitBRL = 0;
    let totalBuyVolumeBRL = 0;
    let totalSellVolumeBRL = 0;
    let buyCount = 0;
    let sellCount = 0;

    filteredOrders.forEach((o) => {
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
      totalOrders: filteredOrders.length,
    };
  }, [filteredOrders, assetSummaries]);

  useEffect(() => {
    const onSynced = () => {
      setOrders(ordersConsolidatorEngine.getOrders());
    };
    window.addEventListener("exchange_orders_synced", onSynced);

    // Auto-sync exchange trades in the background when opening the consolidator
    ExchangeOrdersSyncService.syncAllTrades({ silent: true }).catch(() => null);

    return () => window.removeEventListener("exchange_orders_synced", onSynced);
  }, []);

  const handleSyncAPIs = async () => {
    setIsSyncing(true);
    try {
      await ExchangeOrdersSyncService.syncAllTrades();
      ordersConsolidatorEngine.recalculateAllWeightedAverages();
      setOrders(ordersConsolidatorEngine.getOrders());
    } catch (e) {
      console.error("[TransactionsConsolidator] Sync error:", e);
      toast.error("Erro ao sincronizar com as APIs das corretoras.");
    } finally {
      setIsSyncing(false);
    }
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
    if (!selectedAsset) {
      toast.error("Selecione um ativo cadastrado na sua carteira de investimentos.");
      return;
    }

    const qty = parseFloat(newOrderForm.quantity) || 0;
    if (qty <= 0) {
      toast.error("Informe uma quantidade válida maior que zero.");
      return;
    }

    const fx = parseFloat(newOrderForm.fxRate) || selectedAsset.fxRate || 5.8069;
    const isUSD = selectedAsset.currency === "USD";
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
      ticker: selectedAsset.ticker,
      assetName: selectedAsset.assetName,
      category: selectedAsset.category,
      broker: selectedAsset.broker,
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
      notes: newOrderForm.notes.trim()
        ? `[Vinculado a ${selectedAsset.investmentName}] ${newOrderForm.notes.trim()}`
        : `[Vinculado a ${selectedAsset.investmentName}] Ordem executada`,
    });

    setOrders(ordersConsolidatorEngine.getOrders());
    setIsAddModalOpen(false);
    setSelectedAssetId("");
    toast.success(`Ordem de ${newOrderForm.orderType === "BUY" ? "Compra" : "Venda"} de ${selectedAsset.ticker} vinculada à carteira registrada!`);
  };

  const brokersList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => set.add(o.broker));
    declaredAssets.forEach((a) => set.add(a.broker));
    return Array.from(set);
  }, [orders, declaredAssets]);

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
            {/* Seletor Rápido de Ano na Barra Superior */}
            <div className="flex items-center gap-1.5 bg-card/90 border border-border px-2 py-0.5 rounded-lg shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Ano:</span>
              <Select
                value={filter.year || "all"}
                onValueChange={(val: string) => setFilter((prev) => ({ ...prev, year: val }))}
              >
                <SelectTrigger className="h-7 w-[115px] sm:w-[130px] text-xs font-bold border-none bg-muted/60 focus:ring-0">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Anos</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y} className="font-semibold text-xs">
                      Ano {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> Registrar Nova Transação Vinculada
                  </DialogTitle>
                  <DialogDescription>
                    As ordens devem estar estritamente vinculadas aos ativos declarados na sua carteira de investimentos.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
                  {/* SELEÇÃO DO ATIVO DECLARADO (OBRIGATÓRIO) */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        1. Selecionar Ativo Declarado na Carteira
                      </Label>
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/10">
                        Obrigatório · Anti-Declaratório
                      </Badge>
                    </div>

                    <Select
                      value={selectedAssetId}
                      onValueChange={handleSelectDeclaredAsset}
                    >
                      <SelectTrigger className="h-9 text-xs font-semibold bg-background border-primary/40 focus:ring-primary">
                        <SelectValue placeholder="Selecione o ativo da sua lista de investimentos..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[320px]">
                        {groupedDeclaredAssets.map((group) => (
                          <SelectGroup key={group.investmentName}>
                            <SelectLabel className="text-[11px] font-bold text-primary px-2 py-1.5 flex items-center gap-1.5 bg-muted/60">
                              {group.category === "crypto" ? (
                                <Coins className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                              {group.investmentName} ({group.broker})
                            </SelectLabel>
                            {group.assets.map((a) => (
                              <SelectItem key={a.id} value={a.id} className="text-xs py-2 cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold font-mono text-foreground">{a.ticker}</span>
                                    <span className="text-muted-foreground text-[11px] truncate max-w-[180px]">
                                      {a.assetName}
                                    </span>
                                  </div>
                                  {a.currentQuantity > 0 && (
                                    <Badge variant="secondary" className="text-[10px] ml-auto shrink-0 font-mono">
                                      {a.currentQuantity.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} un em carteira
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CARD DE STATUS DO ATIVO VINCULADO */}
                  {selectedAsset ? (
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Vínculo Confirmado com a Carteira
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-background/80 font-mono text-emerald-400 border-emerald-500/40">
                          {selectedAsset.category === "stocks_us" ? "Ações Globais (US)" : selectedAsset.category === "crypto" ? "Criptoativo" : "Ações B3"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] border-t border-emerald-500/20">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Ticker Oficial</span>
                          <span className="font-bold font-mono text-foreground flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-muted-foreground" /> {selectedAsset.ticker}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Investimento Origem</span>
                          <span className="font-medium text-foreground truncate block" title={selectedAsset.investmentName}>
                            {selectedAsset.investmentName}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Corretora</span>
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-muted-foreground" /> {selectedAsset.broker}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Posição Declarada</span>
                          <span className="font-mono text-foreground font-semibold">
                            {selectedAsset.currentQuantity > 0
                              ? `${selectedAsset.currentQuantity.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}`
                              : "Declarado"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-1 text-amber-300">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400" /> Vínculo Obrigatório com a Carteira
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Selecione um ativo cadastrado na sua carteira acima para liberar os campos de execução e preço da ordem. Não é permitido criar ativos fictícios ou declaratórios avulsos.
                      </p>
                    </div>
                  )}

                  {/* DADOS DA OPERAÇÃO EXECUTADA */}
                  <div className={`space-y-3 transition-opacity ${!selectedAsset ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipo de Operação</Label>
                        <Select
                          value={newOrderForm.orderType}
                          onValueChange={(val: OrderType) => setNewOrderForm({ ...newOrderForm, orderType: val })}
                          disabled={!selectedAsset}
                        >
                          <SelectTrigger className="h-8 text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BUY">🟢 Compra (BUY)</SelectItem>
                            <SelectItem value="SELL">🔴 Venda (SELL)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Data e Hora da Execução</Label>
                        <Input
                          type="datetime-local"
                          value={newOrderForm.dateTime}
                          onChange={(e) => setNewOrderForm({ ...newOrderForm, dateTime: e.target.value })}
                          className="h-8 text-xs font-mono"
                          disabled={!selectedAsset}
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
                          className="h-8 text-xs font-mono font-bold"
                          disabled={!selectedAsset}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          {selectedAsset?.currency === "USD" ? "Preço Unitário (USD)" : "Preço Unitário (BRL)"}
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          value={selectedAsset?.currency === "USD" ? newOrderForm.unitPriceUSD : newOrderForm.unitPriceBRL}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const fx = parseFloat(newOrderForm.fxRate) || 5.8069;
                            if (selectedAsset?.currency === "USD") {
                              setNewOrderForm({
                                ...newOrderForm,
                                unitPriceUSD: e.target.value,
                                unitPriceBRL: (val * fx).toFixed(2),
                              });
                            } else {
                              setNewOrderForm({
                                ...newOrderForm,
                                unitPriceBRL: e.target.value,
                                unitPriceUSD: (val / fx).toFixed(2),
                              });
                            }
                          }}
                          placeholder="0.00"
                          className="h-8 text-xs font-mono font-bold"
                          disabled={!selectedAsset}
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
                            const fx = parseFloat(e.target.value) || 5.8069;
                            const uUSD = parseFloat(newOrderForm.unitPriceUSD) || 0;
                            setNewOrderForm({
                              ...newOrderForm,
                              fxRate: e.target.value,
                              unitPriceBRL: (uUSD * fx).toFixed(2),
                            });
                          }}
                          className="h-8 text-xs font-mono"
                          disabled={!selectedAsset}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Taxa de Corretagem ({selectedAsset?.currency || "USD"})</Label>
                        <Input
                          type="number"
                          step="any"
                          value={selectedAsset?.currency === "USD" ? newOrderForm.feeUSD : newOrderForm.feeBRL}
                          onChange={(e) => {
                            const fee = parseFloat(e.target.value) || 0;
                            const fx = parseFloat(newOrderForm.fxRate) || 5.8069;
                            if (selectedAsset?.currency === "USD") {
                              setNewOrderForm({
                                ...newOrderForm,
                                feeUSD: e.target.value,
                                feeBRL: (fee * fx).toFixed(2),
                              });
                            } else {
                              setNewOrderForm({
                                ...newOrderForm,
                                feeBRL: e.target.value,
                                feeUSD: (fee / fx).toFixed(2),
                              });
                            }
                          }}
                          placeholder="0.00"
                          className="h-8 text-xs font-mono"
                          disabled={!selectedAsset}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Notas / Justificativa</Label>
                        <Input
                          value={newOrderForm.notes}
                          onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                          placeholder="Ex: aporte programado, rebalanceamento..."
                          className="h-8 text-xs"
                          disabled={!selectedAsset}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!selectedAsset}
                      className="bg-primary hover:bg-primary/90 font-semibold gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Salvar Transação Vinculada
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
                <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  💼 {filter.year && filter.year !== "all" ? `Patrimônio / Aportes (${filter.year})` : "Patrimônio Atual"}
                </span>
                <div className="flex items-center gap-1">
                  {filter.year && filter.year !== "all" && (
                    <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/40 bg-cyan-500/10 font-mono py-0">
                      {filter.year}
                    </Badge>
                  )}
                  <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Wallet className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-foreground">
                  {formatBRL(stats.totalCurrentValueBRL)}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <span>
                    {filter.year && filter.year !== "all"
                      ? `Aportes em ${filter.year}: ${formatBRL(stats.totalBuyVolumeBRL)}`
                      : `Custo: ${formatBRL(stats.totalInvestedBRL)}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm hover:border-emerald-500/40 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  📈 Lucro Não Realizado
                </span>
                <div className="flex items-center gap-1">
                  {filter.year && filter.year !== "all" && (
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40 bg-emerald-500/10 font-mono py-0">
                      {filter.year}
                    </Badge>
                  )}
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                </div>
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
                  {filter.year && filter.year !== "all"
                    ? `Variação sobre operações de ${filter.year}`
                    : "Variação sobre o preço médio consolidado"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm hover:border-teal-500/40 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  💰 Lucro Realizado
                </span>
                <div className="flex items-center gap-1">
                  {filter.year && filter.year !== "all" && (
                    <Badge variant="outline" className="text-[10px] text-teal-400 border-teal-500/40 bg-teal-500/10 font-mono py-0">
                      {filter.year}
                    </Badge>
                  )}
                  <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                    <DollarSign className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <div>
                <span className={`text-2xl font-black ${stats.totalRealizedProfitBRL >= 0 ? "text-teal-400" : "text-destructive"}`}>
                  {stats.totalRealizedProfitBRL >= 0 ? "+" : ""}{formatBRL(stats.totalRealizedProfitBRL)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  {filter.year && filter.year !== "all"
                    ? `Embolsado em ${stats.sellCount} vendas de ${filter.year}`
                    : `Embolsado em ${stats.sellCount} ordens de venda executadas`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm hover:border-blue-500/40 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  ⚡ APIs & Operações
                </span>
                <div className="flex items-center gap-1">
                  {filter.year && filter.year !== "all" && (
                    <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/40 bg-blue-500/10 font-mono py-0">
                      {filter.year}
                    </Badge>
                  )}
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Zap className="w-4 h-4" />
                  </span>
                </div>
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
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {filter.year && filter.year !== "all" ? `Filtrado para o ano ${filter.year}` : "5 APIs Integradas & Sincronizadas"}
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
                value={filter.year || "all"}
                onValueChange={(val: string) => setFilter({ ...filter, year: val })}
              >
                <SelectTrigger className="w-[125px] h-9 text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Ano" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Anos</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y}>
                      Ano {y}
                    </SelectItem>
                  ))}
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
