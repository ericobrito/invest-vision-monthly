import { supabase } from "@/integrations/supabase/client";
import { cryptoAccountingEngine } from "@/features/cryptoAccounting/cryptoAccountingEngine";
import { ordersConsolidatorEngine } from "@/features/transactionsConsolidator/ordersEngine";
import { FALLBACK_USD_BRL } from "@/config/marketDefaults";
import { toast } from "sonner";

export interface SyncedExchangeTrade {
  id: string;
  broker: string;
  ticker: string;
  symbol: string;
  dateTime: string;
  orderType: "BUY" | "SELL";
  quantity: number;
  unitPriceUSD: number;
  grossValueUSD: number;
  feeUSD: number;
  feeAsset?: string;
  source: string;
  notes?: string;
}

export class ExchangeOrdersSyncService {
  private static isSyncing = false;

  /**
   * Syncs all trade histories and executed orders from connected exchange APIs
   * (Binance, Coinbase, Bybit, etc.) into the Tax Ledger and Orders Consolidator.
   */
  public static async syncAllTrades(options?: { silent?: boolean }): Promise<{ success: boolean; count: number; trades: SyncedExchangeTrade[] }> {
    if (this.isSyncing) {
      return { success: false, count: 0, trades: [] };
    }

    this.isSyncing = true;
    try {
      console.log("[ExchangeOrdersSyncService] Triggering online exchange trades sync...");

      const { data, error } = await supabase.functions.invoke("variable-assets", {
        body: { action: "sync_trades" },
      });

      if (error) {
        console.warn("[ExchangeOrdersSyncService] Sync trades error from edge function:", error);
        if (!options?.silent) {
          toast.error("Não foi possível sincronizar ordens das corretoras automaticamente.");
        }
        return { success: false, count: 0, trades: [] };
      }

      const rawTrades: SyncedExchangeTrade[] = (data?.trades as SyncedExchangeTrade[]) || [];
      console.log(`[ExchangeOrdersSyncService] Received ${rawTrades.length} trades from exchange APIs`);

      let newTradesCount = 0;
      const fxRate = FALLBACK_USD_BRL;

      // 1. Ingest into Crypto Accounting Engine (GCAP / IRPF Tax Ledger)
      const existingCryptoTrades = new Set(cryptoAccountingEngine.getTrades().map((t) => t.id));
      for (const t of rawTrades) {
        if (!existingCryptoTrades.has(t.id)) {
          cryptoAccountingEngine.addTrade({
            id: t.id,
            broker: t.broker || "Binance",
            dateTime: t.dateTime,
            asset: t.ticker.toUpperCase(),
            quantity: t.quantity,
            side: t.orderType,
            price: t.unitPriceUSD,
            grossValue: t.grossValueUSD,
            fee: t.feeUSD,
            feeAsset: t.feeAsset || "USD",
            netValue: t.grossValueUSD,
            quoteCurrency: "USD",
            transactionType: "SPOT",
            country: t.broker.toLowerCase().includes("mercado") ? "BR" : "KY",
            source: t.source || "API_BINANCE",
            notes: t.notes || `Sincronização online ${t.broker}`,
          });
          newTradesCount++;
        }
      }

      // 2. Ingest into Orders Consolidator Engine (Average Price Ledger)
      const existingConsolidatedOrders = new Set(ordersConsolidatorEngine.getOrders().map((o) => o.id));
      for (const t of rawTrades) {
        if (!existingConsolidatedOrders.has(t.id)) {
          ordersConsolidatorEngine.addOrder({
            id: t.id,
            dateTime: t.dateTime,
            orderType: t.orderType,
            ticker: t.ticker.toUpperCase(),
            assetName: t.ticker.toUpperCase(),
            category: "crypto",
            broker: t.broker || "Binance",
            quantity: t.quantity,
            unitPriceUSD: t.unitPriceUSD,
            unitPriceBRL: Number((t.unitPriceUSD * fxRate).toFixed(2)),
            fxRate: fxRate,
            grossValueUSD: t.grossValueUSD,
            grossValueBRL: Number((t.grossValueUSD * fxRate).toFixed(2)),
            feeUSD: t.feeUSD,
            feeBRL: Number((t.feeUSD * fxRate).toFixed(2)),
            netValueUSD: t.grossValueUSD,
            netValueBRL: Number((t.grossValueUSD * fxRate).toFixed(2)),
            source: t.source || "API_BINANCE",
            notes: t.notes || `Sincronização automática ${t.broker}`,
          });
        }
      }

      // Dispatch global window event so any open dashboard updates instantly
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exchange_orders_synced", { detail: { count: rawTrades.length, newTradesCount } }));
      }

      if (!options?.silent) {
        if (newTradesCount > 0) {
          toast.success(`${newTradesCount} novas ordens sincronizadas com sucesso da Binance/Coinbase!`);
        } else if (rawTrades.length > 0) {
          toast.info(`${rawTrades.length} ordens de corretoras verificadas e atualizadas.`);
        } else {
          toast.info("Sincronização concluída. Nenhuma ordem nova encontrada nas corretoras.");
        }
      }

      return { success: true, count: rawTrades.length, trades: rawTrades };
    } catch (e) {
      console.error("[ExchangeOrdersSyncService] Unexpected error during sync:", e);
      if (!options?.silent) {
        toast.error("Erro inesperado ao sincronizar ordens das corretoras.");
      }
      return { success: false, count: 0, trades: [] };
    } finally {
      this.isSyncing = false;
    }
  }
}
