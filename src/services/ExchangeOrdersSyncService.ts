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

      let rawTrades: SyncedExchangeTrade[] = [];

      try {
        const { data, error } = await supabase.functions.invoke("variable-assets", {
          body: { action: "sync_trades" },
        });
        if (!error && Array.isArray(data?.trades)) {
          rawTrades = data.trades as SyncedExchangeTrade[];
        }
      } catch (err) {
        console.warn("[ExchangeOrdersSyncService] Edge function sync_trades notice:", err);
      }

      // If remote edge function returned no trades, execute direct client-side Binance API sync
      if (rawTrades.length === 0) {
        console.log("[ExchangeOrdersSyncService] Edge function returned 0 trades. Initiating direct client-side Binance API sync...");
        const directBinanceTrades = await this.fetchRealBinanceTradesClient();
        if (directBinanceTrades.length > 0) {
          rawTrades = directBinanceTrades;
        }
      }

      console.log(`[ExchangeOrdersSyncService] Total ${rawTrades.length} real trades received from exchange APIs`);

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

  private static async hmacSha256Hex(secret: string, message: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  public static async fetchRealBinanceTradesClient(): Promise<SyncedExchangeTrade[]> {
    try {
      const { data: conns } = await supabase
        .from("va_connections")
        .select("id, provider, status")
        .eq("provider", "binance");

      if (!conns || conns.length === 0) return [];
      const connId = conns[0].id;

      const { data: cred } = await supabase
        .from("va_credentials")
        .select("api_key, api_secret")
        .eq("connection_id", connId)
        .maybeSingle();

      if (!cred || !cred.api_key || !cred.api_secret) {
        console.warn("[ExchangeOrdersSyncService] No credentials for Binance found in va_credentials");
        return [];
      }

      const symbols = ["BTCBRL", "BTCUSDT", "ETHBRL", "ETHUSDT", "USDTBRL", "SOLUSDT", "SOLBRL", "BNBUSDT", "BNBBRL"];
      const trades: SyncedExchangeTrade[] = [];
      const key = cred.api_key;
      const secret = cred.api_secret;

      for (const symbol of symbols) {
        try {
          const ts = Date.now();
          const query = `symbol=${symbol}&timestamp=${ts}&recvWindow=10000&limit=500`;
          const sig = await this.hmacSha256Hex(secret, query);
          const url = `https://api.binance.com/api/v3/myTrades?${query}&signature=${sig}`;

          const res = await fetch(url, {
            headers: {
              "X-MBX-APIKEY": key,
            },
          });

          if (!res.ok) continue;
          const list = await res.json();
          if (Array.isArray(list)) {
            for (const t of list) {
              const isBuy = t.isBuyer === true;
              const qty = parseFloat(t.qty) || 0;
              const price = parseFloat(t.price) || 0;
              const quoteQty = parseFloat(t.quoteQty) || (qty * price);
              const fee = parseFloat(t.commission) || 0;
              const isBrl = symbol.endsWith("BRL");
              const baseTicker = symbol.replace(/(USDT|BRL|USD|FDUSD|USDC)$/, "");

              trades.push({
                id: `bin_real_${t.id || t.orderId}`,
                broker: "Binance",
                ticker: baseTicker || symbol,
                symbol,
                dateTime: new Date(t.time).toISOString(),
                orderType: isBuy ? "BUY" : "SELL",
                quantity: qty,
                unitPriceUSD: isBrl ? Number((price / FALLBACK_USD_BRL).toFixed(2)) : price,
                grossValueUSD: isBrl ? Number((quoteQty / FALLBACK_USD_BRL).toFixed(2)) : quoteQty,
                feeUSD: fee,
                feeAsset: t.commissionAsset,
                source: "API_BINANCE_ONLINE",
                notes: `Ordem Real Binance Spot ${symbol} (#${t.orderId}) @ ${isBrl ? 'R$' : '$'}${price}`,
              });
            }
          }
        } catch (err) {
          console.warn(`[ExchangeOrdersSyncService] Error fetching Binance trades for ${symbol}:`, err);
        }
      }

      console.log(`[ExchangeOrdersSyncService] Direct Binance API returned ${trades.length} real trades`);
      return trades;
    } catch (e) {
      console.error("[ExchangeOrdersSyncService] Error during direct Binance trade fetch:", e);
      return [];
    }
  }
}
