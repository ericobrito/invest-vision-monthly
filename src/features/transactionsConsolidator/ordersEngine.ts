import type { AssetAveragePriceSummary, ConsolidatedOrder, OrderFilterState, TaxEstimationItem, YearTaxSummary } from "./types";
import { initialHistoricalOrders } from "./defaultOrdersData";

const STORAGE_KEY = "invest_vision_consolidated_orders_v2";

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
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("invest_vision_consolidated_orders_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove legacy uncalibrated mock entries
          const cleanParsed = parsed.filter((o: any) => o.id !== "ord_bin_btc_2026" && o.id !== "ord_bin_eth_2026");
          const existingIds = new Set(cleanParsed.map((o: any) => o.id));
          const missingDefaults = initialHistoricalOrders.filter((o) => !existingIds.has(o.id));
          this.orders = missingDefaults.length > 0 ? [...cleanParsed, ...missingDefaults] : cleanParsed;
          this.recalculateAllWeightedAverages();
          this.persistOrders();
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
   * Summarizes assets with current holdings, average prices, market value and P&L.
   * Can accept a filtered order subset (e.g. for a specific year) or defaults to all orders.
   */
  public getAssetSummaries(customOrders?: ConsolidatedOrder[]): AssetAveragePriceSummary[] {
    const ordersList = customOrders || this.orders;
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

    for (const order of ordersList) {
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

    if (filter.year && filter.year !== "all") {
      result = result.filter((o) => {
        try {
          const y = new Date(o.dateTime).getFullYear().toString();
          return y === filter.year;
        } catch {
          return false;
        }
      });
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

  /**
   * Calculates comprehensive tax estimations across all asset classes and fiscal regimes:
   * 1. Ações Americanas / Exterior (Lei 14.754/2023 - 15% na DAA IRPF do ano seguinte)
   * 2. Criptoativos (IN 1888 / GCAP - isenção R$ 35k/mês ou 15% via DARF 4600 / DAA)
   * 3. Ações Brasil (Isenção R$ 20k/mês ou 15% Swing Trade via DARF 6015)
   */
  public getTaxSummary(targetYear?: string): YearTaxSummary {
    const sellOrders = this.orders.filter((o) => o.orderType === "SELL");

    // Filter by year if targetYear is passed and not "all"
    const filteredSells = targetYear && targetYear !== "all"
      ? sellOrders.filter((o) => {
          try {
            return new Date(o.dateTime).getFullYear().toString() === targetYear;
          } catch {
            return false;
          }
        })
      : sellOrders;

    // Group monthly gross sales for exemption threshold calculation
    const monthlyGrossByBrokerAndCat = new Map<string, number>();
    for (const order of filteredSells) {
      const monthKey = order.dateTime.slice(0, 7);
      const key = `${monthKey}::${order.broker}::${order.category}`;
      monthlyGrossByBrokerAndCat.set(key, (monthlyGrossByBrokerAndCat.get(key) || 0) + order.grossValueBRL);
    }

    const items: TaxEstimationItem[] = [];
    let totalOffshoreProfitBRL = 0;
    let totalOffshoreTaxBRL = 0;
    let totalCryptoGainsBRL = 0;
    let totalCryptoTaxBRL = 0;
    let totalStocksBRGainsBRL = 0;
    let totalStocksBRTaxBRL = 0;
    let totalRealizedSalesBRL = 0;
    let totalRealizedProfitBRL = 0;

    for (const order of filteredSells) {
      const saleDate = new Date(order.dateTime);
      const saleYear = saleDate.getFullYear();
      const monthKey = order.dateTime.slice(0, 7);
      const dueYear = (saleYear + 1).toString();

      const profit = order.realizedProfitBRL || 0;
      const grossProceeds = order.grossValueBRL;
      const costBRL = Math.max(0, grossProceeds - profit);

      totalRealizedSalesBRL += grossProceeds;
      totalRealizedProfitBRL += profit;

      const isOffshore = order.category === "stocks_us" || order.broker.toLowerCase().includes("avenue");

      if (isOffshore) {
        // Lei 14.754/2023 - 15% taxa uniforme sobre ganho de capital e aplicações financeiras no exterior na DAA
        const taxRate = 15;
        const tax = profit > 0 ? profit * 0.15 : 0;
        totalOffshoreProfitBRL += profit;
        totalOffshoreTaxBRL += tax;

        items.push({
          orderId: order.id,
          dateTime: order.dateTime,
          ticker: order.ticker,
          assetName: order.assetName,
          broker: order.broker,
          category: order.category,
          grossProceedsBRL: grossProceeds,
          costBRL,
          profitBRL: profit,
          taxRatePct: taxRate,
          estimatedTaxBRL: Number(tax.toFixed(2)),
          taxRegime: "OFFSHORE_DAA_15",
          dueYear,
          filingLabel: `DAA IRPF ${dueYear} (Ano-Calendário ${saleYear})`,
          legalBasis: "Art. 2º da Lei nº 14.754/2023 (Tributação de Investimentos no Exterior)",
        });
      } else if (order.category === "crypto") {
        const brokerLow = order.broker.toLowerCase();
        const isNational = brokerLow.includes("mercado bitcoin") || brokerLow.includes("foxbit") || brokerLow.includes("novadax");
        const monthTotal = monthlyGrossByBrokerAndCat.get(`${monthKey}::${order.broker}::${order.category}`) || grossProceeds;
        const isExempt = isNational && monthTotal <= 35000;

        const taxRate = isExempt ? 0 : 15;
        const tax = !isExempt && profit > 0 ? profit * 0.15 : 0;
        totalCryptoGainsBRL += profit;
        totalCryptoTaxBRL += tax;

        items.push({
          orderId: order.id,
          dateTime: order.dateTime,
          ticker: order.ticker,
          assetName: order.assetName,
          broker: order.broker,
          category: order.category,
          grossProceedsBRL: grossProceeds,
          costBRL,
          profitBRL: profit,
          taxRatePct: taxRate,
          estimatedTaxBRL: Number(tax.toFixed(2)),
          taxRegime: isExempt ? "CRYPTO_EXEMPT_35K" : "CRYPTO_TAXABLE_15",
          dueYear: isExempt ? `IRPF ${dueYear}` : `${order.dateTime.slice(0, 7)} (DARF 4600)`,
          filingLabel: isExempt ? "Isento GCAP (≤ R$ 35k/mês nacional)" : "GCAP / DARF Cód. 4600 (15%)",
          legalBasis: "IN RFB nº 1.888/2019 e Art. 21 da Lei nº 8.981/1995",
        });
      } else if (order.category === "stocks_br") {
        const monthTotal = monthlyGrossByBrokerAndCat.get(`${monthKey}::${order.broker}::${order.category}`) || grossProceeds;
        const isExempt = monthTotal <= 20000;
        const taxRate = isExempt ? 0 : 15;
        const tax = !isExempt && profit > 0 ? profit * 0.15 : 0;
        totalStocksBRGainsBRL += profit;
        totalStocksBRTaxBRL += tax;

        items.push({
          orderId: order.id,
          dateTime: order.dateTime,
          ticker: order.ticker,
          assetName: order.assetName,
          broker: order.broker,
          category: order.category,
          grossProceedsBRL: grossProceeds,
          costBRL,
          profitBRL: profit,
          taxRatePct: taxRate,
          estimatedTaxBRL: Number(tax.toFixed(2)),
          taxRegime: isExempt ? "STOCKS_BR_EXEMPT_20K" : "STOCKS_BR_SWING_15",
          dueYear: isExempt ? `IRPF ${dueYear}` : `${order.dateTime.slice(0, 7)} (DARF 6015)`,
          filingLabel: isExempt ? "Isento B3 (≤ R$ 20k/mês)" : "DARF Cód. 6015 (15% Swing Trade)",
          legalBasis: "Art. 72 da Lei nº 8.981/1995",
        });
      }
    }

    const totalEstimatedTaxBRL = totalOffshoreTaxBRL + totalCryptoTaxBRL + totalStocksBRTaxBRL;

    return {
      year: targetYear || "all",
      totalRealizedSalesBRL: Number(totalRealizedSalesBRL.toFixed(2)),
      totalRealizedProfitBRL: Number(totalRealizedProfitBRL.toFixed(2)),
      totalOffshoreProfitBRL: Number(totalOffshoreProfitBRL.toFixed(2)),
      totalOffshoreTaxBRL: Number(totalOffshoreTaxBRL.toFixed(2)),
      totalCryptoGainsBRL: Number(totalCryptoGainsBRL.toFixed(2)),
      totalCryptoTaxBRL: Number(totalCryptoTaxBRL.toFixed(2)),
      totalStocksBRGainsBRL: Number(totalStocksBRGainsBRL.toFixed(2)),
      totalStocksBRTaxBRL: Number(totalStocksBRTaxBRL.toFixed(2)),
      totalEstimatedTaxBRL: Number(totalEstimatedTaxBRL.toFixed(2)),
      items: items.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
    };
  }
}

export const ordersConsolidatorEngine = new OrdersConsolidatorEngine();
