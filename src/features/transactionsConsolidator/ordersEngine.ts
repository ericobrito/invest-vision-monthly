import type { AssetAveragePriceSummary, ConsolidatedOrder, OrderFilterState } from "./types";
import { initialHistoricalOrders } from "./defaultOrdersData";

const STORAGE_KEY = "invest_vision_consolidated_orders_v1";

export class OrdersConsolidatorEngine {
  private orders: ConsolidatedOrder[] = [];
  private liveQuotes: Record<string, { currentPriceUSD: number; fxRate: number }> = {
    "TSLA": { currentPriceUSD: 379.74, fxRate: 5.7838 },
    "META": { currentPriceUSD: 626.41, fxRate: 5.7838 },
    "BRK-B": { currentPriceUSD: 592.85, fxRate: 5.7838 },
    "BRK.B": { currentPriceUSD: 592.85, fxRate: 5.7838 },
    "GOOGL": { currentPriceUSD: 283.72, fxRate: 5.7838 },
    "AMD": { currentPriceUSD: 504.28, fxRate: 5.7838 },
    "IONQ": { currentPriceUSD: 42.54, fxRate: 5.7838 },
    "RGTI": { currentPriceUSD: 16.01, fxRate: 5.7838 },
    "BTC": { currentPriceUSD: 78243.14, fxRate: 5.0740 },
    "ETH": { currentPriceUSD: 2465.48, fxRate: 5.0740 },
    "USDT": { currentPriceUSD: 1.00, fxRate: 5.0740 },
  };

  constructor() {
    this.loadOrders();
  }

  public setLiveQuotes(quotes: Record<string, { currentPriceUSD: number; fxRate: number }>) {
    this.liveQuotes = { ...this.liveQuotes, ...quotes };
  }

  public getOrders(): ConsolidatedOrder[] {
    return [...this.orders].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }

  public addOrder(order: Omit<ConsolidatedOrder, "id"> & { id?: string }): ConsolidatedOrder {
    const newOrder: ConsolidatedOrder = {
      ...order,
      id: order.id || `ord_usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    this.orders.push(newOrder);
    this.recalculateAllWeightedAverages();
    this.persistOrders();
    return newOrder;
  }

  public deleteOrder(orderId: string): boolean {
    const initialLen = this.orders.length;
    this.orders = this.orders.filter((o) => o.id !== orderId);
    if (this.orders.length !== initialLen) {
      this.recalculateAllWeightedAverages();
      this.persistOrders();
      return true;
    }
    return false;
  }

  public resetToDefault(): void {
    this.orders = JSON.parse(JSON.stringify(initialHistoricalOrders));
    this.recalculateAllWeightedAverages();
    this.persistOrders();
  }

  private loadOrders(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.orders = parsed;
          this.recalculateAllWeightedAverages();
          return;
        }
      }
    } catch (e) {
      console.warn("Could not load stored orders from localStorage, using initial defaults:", e);
    }
    this.orders = JSON.parse(JSON.stringify(initialHistoricalOrders));
    this.recalculateAllWeightedAverages();
  }

  private persistOrders(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.orders));
    } catch (e) {
      console.error("Failed to persist orders to localStorage:", e);
    }
  }

  /**
   * Recalculates weighted average cost and realized profit order by order in chronological order.
   */
  public recalculateAllWeightedAverages(): void {
    // Sort chronologically ascending for simulation
    const sorted = [...this.orders].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

    interface AssetTracker {
      quantity: number;
      totalCostUSD: number;
      totalCostBRL: number;
    }

    const stateByAsset = new Map<string, AssetTracker>();

    for (const order of sorted) {
      const tickerKey = order.ticker.toUpperCase().replace(".", "-");
      const current = stateByAsset.get(tickerKey) || {
        quantity: 0,
        totalCostUSD: 0,
        totalCostBRL: 0,
      };

      const fx = order.fxRate > 0 ? order.fxRate : 5.0740;
      const unitUSD = order.unitPriceUSD != null ? order.unitPriceUSD : order.unitPriceBRL / fx;
      const feeUSD = order.feeUSD != null ? order.feeUSD : order.feeBRL / fx;
      const feeBRL = order.feeBRL != null ? order.feeBRL : (order.feeUSD ? order.feeUSD * fx : 0);

      const avgBeforeUSD = current.quantity > 0 ? current.totalCostUSD / current.quantity : undefined;
      const avgBeforeBRL = current.quantity > 0 ? current.totalCostBRL / current.quantity : undefined;

      order.weightedAvgPriceBeforeUSD = avgBeforeUSD;
      order.weightedAvgPriceBeforeBRL = avgBeforeBRL;

      if (order.orderType === "BUY") {
        const addCostUSD = (order.quantity * unitUSD) + feeUSD;
        const addCostBRL = (order.quantity * order.unitPriceBRL) + feeBRL;

        current.quantity += order.quantity;
        current.totalCostUSD += addCostUSD;
        current.totalCostBRL += addCostBRL;

        const newAvgUSD = current.quantity > 0 ? current.totalCostUSD / current.quantity : unitUSD;
        const newAvgBRL = current.quantity > 0 ? current.totalCostBRL / current.quantity : order.unitPriceBRL;

        order.weightedAvgPriceAfterUSD = Number(newAvgUSD.toFixed(4));
        order.weightedAvgPriceAfterBRL = Number(newAvgBRL.toFixed(4));
        order.realizedProfitBRL = undefined;
        order.realizedProfitPct = undefined;
      } else if (order.orderType === "SELL") {
        const costPerUnitUSD = avgBeforeUSD || unitUSD;
        const costPerUnitBRL = avgBeforeBRL || order.unitPriceBRL;

        const costOfSoldBRL = order.quantity * costPerUnitBRL;
        const proceedsBRL = (order.quantity * order.unitPriceBRL) - feeBRL;
        const profitBRL = proceedsBRL - costOfSoldBRL;
        const profitPct = costOfSoldBRL > 0 ? (profitBRL / costOfSoldBRL) * 100 : 0;

        order.realizedProfitBRL = Number(profitBRL.toFixed(2));
        order.realizedProfitPct = Number(profitPct.toFixed(2));

        current.quantity = Math.max(0, current.quantity - order.quantity);
        current.totalCostUSD = current.quantity * costPerUnitUSD;
        current.totalCostBRL = current.quantity * costPerUnitBRL;

        order.weightedAvgPriceAfterUSD = Number(costPerUnitUSD.toFixed(4));
        order.weightedAvgPriceAfterBRL = Number(costPerUnitBRL.toFixed(4));
      }

      stateByAsset.set(tickerKey, current);
    }

    this.orders = sorted;
  }

  /**
   * Summarizes all assets with current holdings, average prices, market value and P&L.
   */
  public getAssetSummaries(): AssetAveragePriceSummary[] {
    const map = new Map<string, {
      ticker: string;
      assetName: string;
      category: ConsolidatedOrder["category"];
      brokers: Set<string>;
      totalQuantity: number;
      totalCostUSD: number;
      totalCostBRL: number;
      totalRealizedProfitBRL: number;
      buyOrdersCount: number;
      sellOrdersCount: number;
      firstOrderDate: string;
      lastOrderDate: string;
    }>();

    for (const order of this.orders) {
      const tickerKey = order.ticker.toUpperCase().replace(".", "-");
      let item = map.get(tickerKey);
      if (!item) {
        item = {
          ticker: tickerKey,
          assetName: order.assetName,
          category: order.category,
          brokers: new Set<string>(),
          totalQuantity: 0,
          totalCostUSD: 0,
          totalCostBRL: 0,
          totalRealizedProfitBRL: 0,
          buyOrdersCount: 0,
          sellOrdersCount: 0,
          firstOrderDate: order.dateTime,
          lastOrderDate: order.dateTime,
        };
        map.set(tickerKey, item);
      }

      item.brokers.add(order.broker);
      if (new Date(order.dateTime) < new Date(item.firstOrderDate)) item.firstOrderDate = order.dateTime;
      if (new Date(order.dateTime) > new Date(item.lastOrderDate)) item.lastOrderDate = order.dateTime;

      const fx = order.fxRate > 0 ? order.fxRate : 5.0740;
      const unitUSD = order.unitPriceUSD != null ? order.unitPriceUSD : order.unitPriceBRL / fx;
      const feeUSD = order.feeUSD != null ? order.feeUSD : order.feeBRL / fx;
      const feeBRL = order.feeBRL != null ? order.feeBRL : (order.feeUSD ? order.feeUSD * fx : 0);

      if (order.orderType === "BUY") {
        item.buyOrdersCount++;
        item.totalQuantity += order.quantity;
        item.totalCostUSD += (order.quantity * unitUSD) + feeUSD;
        item.totalCostBRL += (order.quantity * order.unitPriceBRL) + feeBRL;
      } else if (order.orderType === "SELL") {
        item.sellOrdersCount++;
        const avgBRL = item.totalQuantity > 0 ? item.totalCostBRL / item.totalQuantity : order.unitPriceBRL;
        const avgUSD = item.totalQuantity > 0 ? item.totalCostUSD / item.totalQuantity : unitUSD;
        if (order.realizedProfitBRL != null) {
          item.totalRealizedProfitBRL += order.realizedProfitBRL;
        }
        item.totalQuantity = Math.max(0, item.totalQuantity - order.quantity);
        item.totalCostUSD = item.totalQuantity * avgUSD;
        item.totalCostBRL = item.totalQuantity * avgBRL;
      }
    }

    const summaries: AssetAveragePriceSummary[] = [];

    map.forEach((item, tickerKey) => {
      const quote = this.liveQuotes[tickerKey] || this.liveQuotes[item.ticker] || { currentPriceUSD: 0, fxRate: 5.7838 };
      const avgPriceUSD = item.totalQuantity > 0 ? item.totalCostUSD / item.totalQuantity : undefined;
      const avgPriceBRL = item.totalQuantity > 0 ? item.totalCostBRL / item.totalQuantity : 0;

      const currentPriceUSD = quote.currentPriceUSD > 0 ? quote.currentPriceUSD : avgPriceUSD;
      const fx = quote.fxRate > 0 ? quote.fxRate : 5.0740;
      const currentPriceBRL = currentPriceUSD ? currentPriceUSD * fx : avgPriceBRL;

      const currentValueBRL = item.totalQuantity * currentPriceBRL;
      const totalInvestedBRL = item.totalCostBRL;
      const unrealizedProfitBRL = currentValueBRL - totalInvestedBRL;
      const unrealizedProfitPct = totalInvestedBRL > 0 ? (unrealizedProfitBRL / totalInvestedBRL) * 100 : 0;

      summaries.push({
        ticker: item.ticker,
        assetName: item.assetName,
        category: item.category,
        brokers: Array.from(item.brokers),
        totalQuantity: item.totalQuantity,
        averagePriceUSD: avgPriceUSD ? Number(avgPriceUSD.toFixed(2)) : undefined,
        averagePriceBRL: Number(avgPriceBRL.toFixed(2)),
        currentPriceUSD: currentPriceUSD ? Number(currentPriceUSD.toFixed(2)) : undefined,
        currentPriceBRL: Number(currentPriceBRL.toFixed(2)),
        totalInvestedBRL: Number(totalInvestedBRL.toFixed(2)),
        currentValueBRL: Number(currentValueBRL.toFixed(2)),
        unrealizedProfitBRL: Number(unrealizedProfitBRL.toFixed(2)),
        unrealizedProfitPct: Number(unrealizedProfitPct.toFixed(2)),
        totalRealizedProfitBRL: Number(item.totalRealizedProfitBRL.toFixed(2)),
        buyOrdersCount: item.buyOrdersCount,
        sellOrdersCount: item.sellOrdersCount,
        firstOrderDate: item.firstOrderDate,
        lastOrderDate: item.lastOrderDate,
      });
    });

    return summaries.sort((a, b) => b.currentValueBRL - a.currentValueBRL);
  }

  /**
   * Filters and sorts orders according to user state.
   */
  public filterOrders(filter: OrderFilterState): ConsolidatedOrder[] {
    let result = [...this.orders];

    if (filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.ticker.toLowerCase().includes(q) ||
          o.assetName.toLowerCase().includes(q) ||
          o.broker.toLowerCase().includes(q) ||
          (o.notes && o.notes.toLowerCase().includes(q))
      );
    }

    if (filter.category !== "all") {
      result = result.filter((o) => o.category === filter.category);
    }

    if (filter.broker && filter.broker !== "all") {
      result = result.filter((o) => o.broker === filter.broker);
    }

    if (filter.orderType !== "all") {
      result = result.filter((o) => o.orderType === filter.orderType);
    }

    result.sort((a, b) => {
      if (filter.sortBy === "date_desc") {
        return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
      }
      if (filter.sortBy === "date_asc") {
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      }
      if (filter.sortBy === "value_desc") {
        return b.netValueBRL - a.netValueBRL;
      }
      if (filter.sortBy === "realized_desc") {
        return (b.realizedProfitBRL || -999999) - (a.realizedProfitBRL || -999999);
      }
      return 0;
    });

    return result;
  }

  /**
   * Exports orders as CSV file format.
   */
  public exportToCSV(ordersToExport?: ConsolidatedOrder[]): string {
    const list = ordersToExport || this.getOrders();
    const headers = [
      "ID",
      "Data e Hora",
      "Tipo",
      "Ticker",
      "Ativo",
      "Categoria",
      "Corretora",
      "Quantidade",
      "Preco Unit (USD)",
      "Preco Unit (BRL)",
      "Cambio FX",
      "Valor Liquido (USD)",
      "Valor Liquido (BRL)",
      "Taxa (BRL)",
      "PM Resultante (USD)",
      "PM Resultante (BRL)",
      "Lucro Realizado (BRL)",
      "Lucro Realizado (%)",
      "Origem/API",
      "Notas",
    ];

    const rows = list.map((o) => [
      `"${o.id}"`,
      `"${o.dateTime}"`,
      `"${o.orderType}"`,
      `"${o.ticker}"`,
      `"${o.assetName.replace(/"/g, '""')}"`,
      `"${o.category}"`,
      `"${o.broker}"`,
      o.quantity.toString().replace(".", ","),
      (o.unitPriceUSD != null ? o.unitPriceUSD.toFixed(2) : "").replace(".", ","),
      o.unitPriceBRL.toFixed(2).replace(".", ","),
      o.fxRate.toFixed(4).replace(".", ","),
      (o.netValueUSD != null ? o.netValueUSD.toFixed(2) : "").replace(".", ","),
      o.netValueBRL.toFixed(2).replace(".", ","),
      o.feeBRL.toFixed(2).replace(".", ","),
      (o.weightedAvgPriceAfterUSD != null ? o.weightedAvgPriceAfterUSD.toFixed(2) : "").replace(".", ","),
      o.weightedAvgPriceAfterBRL.toFixed(2).replace(".", ","),
      (o.realizedProfitBRL != null ? o.realizedProfitBRL.toFixed(2) : "").replace(".", ","),
      (o.realizedProfitPct != null ? `${o.realizedProfitPct.toFixed(2)}%` : "").replace(".", ","),
      `"${o.source}"`,
      `"${(o.notes || "").replace(/"/g, '""')}"`,
    ]);

    return [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
  }
}

export const ordersConsolidatorEngine = new OrdersConsolidatorEngine();
