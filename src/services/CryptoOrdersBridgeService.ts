import { cryptoAccountingEngine } from "@/features/cryptoAccounting/cryptoAccountingEngine";
import { ordersConsolidatorEngine } from "@/features/transactionsConsolidator/ordersEngine";
import type { CryptoTrade, OrderSide, TaxRegime } from "@/features/cryptoAccounting/types";
import type { ConsolidatedOrder } from "@/features/transactionsConsolidator/types";
import { getBrokerRegime } from "@/features/cryptoAccounting/cryptoOrderNormalizer";

const ASSET_NAME_MAP: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  USDT: "Tether USD",
  SOL: "Solana",
  BNB: "Binance Coin",
  ADA: "Cardano",
  XRP: "XRP",
  DOGE: "Dogecoin",
  AVAX: "Avalanche",
  DOT: "Polkadot",
  MATIC: "Polygon",
  LINK: "Chainlink",
};

export class CryptoOrdersBridgeService {
  private static isSyncing = false;

  /**
   * Translates a crypto ConsolidatedOrder into a CryptoTrade for cryptoAccountingEngine.
   */
  public static orderToTrade(order: ConsolidatedOrder): CryptoTrade {
    const fx = order.fxRate > 0 ? order.fxRate : 5.0740;
    const priceUSD = order.unitPriceUSD != null && order.unitPriceUSD > 0
      ? order.unitPriceUSD
      : order.unitPriceBRL / fx;
    const grossUSD = order.grossValueUSD != null && order.grossValueUSD > 0
      ? order.grossValueUSD
      : order.grossValueBRL / fx;
    const feeUSD = order.feeUSD != null ? order.feeUSD : order.feeBRL / fx;
    const netUSD = order.netValueUSD != null && order.netValueUSD > 0
      ? order.netValueUSD
      : order.netValueBRL / fx;

    const brokerMeta = getBrokerRegime(order.broker);

    return {
      id: order.id,
      broker: order.broker,
      dateTime: order.dateTime,
      asset: order.ticker.toUpperCase(),
      quantity: order.quantity,
      side: order.orderType,
      price: Number(priceUSD.toFixed(4)),
      grossValue: Number(grossUSD.toFixed(2)),
      fee: Number(feeUSD.toFixed(2)),
      feeAsset: "USD",
      netValue: Number(netUSD.toFixed(2)),
      quoteCurrency: "USD",
      transactionType: "SPOT",
      country: brokerMeta.country || "KY",
      source: (order.source as any) || "API",
      notes: order.notes,
    };
  }

  /**
   * Translates a CryptoTrade into a ConsolidatedOrder for ordersConsolidatorEngine.
   */
  public static tradeToOrder(trade: CryptoTrade, fxRate = 5.0740): ConsolidatedOrder {
    const fx = trade.fxRateBRL && trade.fxRateBRL > 0 ? trade.fxRateBRL : fxRate;
    const unitPriceUSD = trade.price;
    const unitPriceBRL = trade.price * fx;
    const grossValueUSD = trade.grossValue;
    const grossValueBRL = trade.grossValue * fx;
    const feeUSD = trade.fee || 0;
    const feeBRL = (trade.fee || 0) * fx;
    const netValueUSD = trade.netValue || grossValueUSD;
    const netValueBRL = (trade.netValue || grossValueUSD) * fx;

    const tickerUpper = trade.asset.toUpperCase();
    const assetName = ASSET_NAME_MAP[tickerUpper] || `${tickerUpper} Crypto`;

    return {
      id: trade.id,
      dateTime: trade.dateTime,
      orderType: trade.side,
      ticker: tickerUpper,
      assetName,
      category: "crypto",
      broker: trade.broker,
      quantity: trade.quantity,
      unitPriceUSD: Number(unitPriceUSD.toFixed(4)),
      unitPriceBRL: Number(unitPriceBRL.toFixed(4)),
      fxRate: Number(fx.toFixed(4)),
      grossValueUSD: Number(grossValueUSD.toFixed(2)),
      grossValueBRL: Number(grossValueBRL.toFixed(2)),
      feeUSD: Number(feeUSD.toFixed(2)),
      feeBRL: Number(feeBRL.toFixed(2)),
      netValueUSD: Number(netUSDValue(trade.side, grossValueUSD, feeUSD).toFixed(2)),
      netValueBRL: Number(netBRLValue(trade.side, grossValueBRL, feeBRL).toFixed(2)),
      weightedAvgPriceAfterBRL: Number(unitPriceBRL.toFixed(4)),
      source: trade.source || "API_SYNC",
      notes: trade.notes,
    };
  }

  /**
   * Runs an automatic bi-directional synchronization pass between both engines:
   * 1. Imports missing crypto orders from ordersConsolidatorEngine -> cryptoAccountingEngine
   * 2. Imports missing crypto trades from cryptoAccountingEngine -> ordersConsolidatorEngine
   */
  public static syncBothEngines(): { syncedCount: number } {
    if (this.isSyncing) return { syncedCount: 0 };
    this.isSyncing = true;

    try {
      const allOrders = ordersConsolidatorEngine.getOrders();
      const cryptoOrders = allOrders.filter((o) => o.category === "crypto");
      const allTrades = cryptoAccountingEngine.getTrades();

      const tradesById = new Map<string, CryptoTrade>(allTrades.map((t) => [t.id, t]));
      const ordersById = new Map<string, ConsolidatedOrder>(cryptoOrders.map((o) => [o.id, o]));

      let syncedCount = 0;

      // 1. Check orders -> trades
      for (const order of cryptoOrders) {
        if (!tradesById.has(order.id)) {
          const newTrade = this.orderToTrade(order);
          cryptoAccountingEngine.addTrade(newTrade);
          tradesById.set(newTrade.id, newTrade);
          syncedCount++;
        }
      }

      // 2. Check trades -> orders
      for (const trade of allTrades) {
        if (!ordersById.has(trade.id)) {
          const newOrder = this.tradeToOrder(trade);
          ordersConsolidatorEngine.addOrder(newOrder);
          ordersById.set(newOrder.id, newOrder);
          syncedCount++;
        }
      }

      if (syncedCount > 0) {
        console.log(`[CryptoOrdersBridgeService] Synchronized ${syncedCount} items bidirectionally.`);
        this.broadcastUpdates();
      }

      return { syncedCount };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Adds a crypto trade in both engines simultaneously.
   */
  public static addCryptoTrade(trade: CryptoTrade): void {
    cryptoAccountingEngine.addTrade(trade);
    const order = this.tradeToOrder(trade);
    ordersConsolidatorEngine.addOrder(order);
    this.broadcastUpdates();
  }

  /**
   * Adds a consolidated order, and if it's crypto, adds it to cryptoAccountingEngine as well.
   */
  public static addConsolidatedOrder(order: ConsolidatedOrder): void {
    ordersConsolidatorEngine.addOrder(order);
    if (order.category === "crypto") {
      const trade = this.orderToTrade(order);
      cryptoAccountingEngine.addTrade(trade);
    }
    this.broadcastUpdates();
  }

  /**
   * Deletes a trade/order by ID from both engines.
   */
  public static deleteTradeOrOrder(id: string): void {
    cryptoAccountingEngine.deleteTrade(id);
    ordersConsolidatorEngine.deleteOrder(id);
    this.broadcastUpdates();
  }

  /**
   * Dispatches window events so all dashboards and tabs update instantaneously.
   */
  public static broadcastUpdates(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("crypto_trades_updated"));
      window.dispatchEvent(new CustomEvent("consolidated_orders_updated"));
      window.dispatchEvent(new CustomEvent("exchange_orders_synced"));
    }
  }
}

function netUSDValue(side: OrderSide, gross: number, fee: number): number {
  return side === "BUY" ? gross + fee : gross - fee;
}

function netBRLValue(side: OrderSide, gross: number, fee: number): number {
  return side === "BUY" ? gross + fee : gross - fee;
}
