import type {
  CostResetSimulationResult,
  CryptoDisposal,
  CryptoPositionStock,
  CryptoReconciliationResult,
  CryptoTaxAlert,
  CryptoTaxMonthSummary,
  CryptoTrade,
  HybridBuybackSimulationResult,
  RebalanceItem,
  RebalanceSimulationResult,
  SimulationResult,
} from "./types";
import { parseCSVText } from "./cryptoOrderNormalizer";
import { CryptoCostBasisEngine } from "./cryptoCostBasisEngine";
import { buildDisposalFromTrade, isAlienationOperation } from "./cryptoDisposalsEngine";
import { CryptoTaxEngine } from "./cryptoTaxEngine";
import { generateCryptoTaxAlerts } from "./cryptoAlertEngine";
import { detectAutomatedTradingClusters } from "./automatedTradingDetector";
import { reconcileCryptoAccounting } from "./cryptoReconciliationEngine";

const STORAGE_KEY = "invest_vision_crypto_accounting_trades_v2";

export class CryptoAccountingEngine {
  private trades: CryptoTrade[] = [];
  private costBasisEngine: CryptoCostBasisEngine;
  private taxEngine: CryptoTaxEngine;
  private defaultFxRateBRL = 5.0740;

  constructor(defaultFxRateBRL = 5.0740) {
    this.defaultFxRateBRL = defaultFxRateBRL;
    this.costBasisEngine = new CryptoCostBasisEngine(defaultFxRateBRL);
    this.taxEngine = new CryptoTaxEngine();

    this.loadTrades();
  }

  public getTaxRuleVersion() {
    return this.taxEngine.getTaxRuleVersion();
  }

  private loadTrades() {
    this.loadDefaultHistoricalTrades();
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("invest_vision_crypto_accounting_trades_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const deletedTradeIds = new Set<string>();
            try {
              const storedDeleted = JSON.parse(localStorage.getItem("invest_vision_deleted_trade_ids") || "[]");
              if (Array.isArray(storedDeleted)) storedDeleted.forEach((id: string) => deletedTradeIds.add(id));
            } catch (e) {}

            const defaultMap = new Map(this.trades.filter((t) => !deletedTradeIds.has(t.id)).map((t) => [t.id, t]));
            const legacyIdsToSkip = new Set([
              "ord_bin_btc_sell_1",
              "trade_binance_2026_btc",
              "trade_binance_2026_eth",
              "trade_binance_2026_03_btc",
              "trade_binance_2026_03_eth",
              "trade_binance_2026_11_16_btc",
              "trade_binance_2026_11_16_eth",
              "trade_hist_1",
              "trade_hist_1b",
              "trade_hist_2",
              "trade_hist_2b",
              "trade_hist_3",
              "trade_hist_3b",
            ]);

            parsed.forEach((t: CryptoTrade) => {
              // Priority 1: User manual records and CSV imports are SACROSANCT and ALWAYS preserved
              if (t.source === "MANUAL" || t.id?.startsWith("ord_usr_") || t.id?.startsWith("trade_usr_") || t.source === "CSV_IMPORT") {
                defaultMap.set(t.id, t);
                return;
              }
              if (legacyIdsToSkip.has(t.id)) {
                return;
              }
              // If it's an online synced trade or custom trade, preserve it
              if (!defaultMap.has(t.id)) {
                defaultMap.set(t.id, t);
              }
            });
            this.trades = Array.from(defaultMap.values())
              .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
            this.persistTrades();
            return;
          }
        }
      } catch (e) {
        console.warn("[CryptoAccountingEngine] Failed to load trades from storage:", e);
      }
    }
  }

  private persistTrades() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.trades));
      } catch (e) {
        console.warn("[CryptoAccountingEngine] Failed to persist trades:", e);
      }
    }
  }

  private loadDefaultHistoricalTrades() {
    // Canonical crypto trades unified with Orders Consolidator
    const historical: CryptoTrade[] = [
      {
        id: "ord_bin_usdt_1",
        broker: "Binance",
        dateTime: "2024-01-10T12:00:00Z",
        asset: "USDT",
        quantity: 3858.1800,
        side: "BUY",
        price: 1.00,
        grossValue: 3858.18,
        fee: 0,
        feeAsset: "USD",
        netValue: 3858.18,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "KY",
        source: "API",
        notes: "Depósito e conversão P2P Binance",
      },
      {
        id: "ord_bin_btc_1",
        broker: "Binance",
        dateTime: "2024-01-15T11:20:00Z",
        asset: "BTC",
        quantity: 0.04894251,
        side: "BUY",
        price: 29882.78,
        grossValue: 1462.54,
        fee: 1.46,
        feeAsset: "USD",
        netValue: 1464.00,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "KY",
        source: "API",
        notes: "Execução Spot Binance BTC/USDT",
      },
      {
        id: "ord_cb_btc_1",
        broker: "Coinbase",
        dateTime: "2024-02-05T09:40:00Z",
        asset: "BTC",
        quantity: 0.02000000,
        side: "BUY",
        price: 29882.78,
        grossValue: 597.66,
        fee: 0.80,
        feeAsset: "USD",
        netValue: 598.46,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "US",
        source: "API",
        notes: "Compra programada Coinbase Advanced",
      },
      {
        id: "ord_bybit_usdt_1",
        broker: "Bybit",
        dateTime: "2024-02-12T13:30:00Z",
        asset: "USDT",
        quantity: 4754.7789,
        side: "BUY",
        price: 1.00,
        grossValue: 4754.78,
        fee: 0,
        feeAsset: "USD",
        netValue: 4754.78,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "AE",
        source: "API",
        notes: "Aporte Bybit Cripto",
      },
      {
        id: "ord_cb_eth_1",
        broker: "Coinbase",
        dateTime: "2024-02-18T10:15:00Z",
        asset: "ETH",
        quantity: 0.91970200,
        side: "BUY",
        price: 2160.00,
        grossValue: 1986.56,
        fee: 2.00,
        feeAsset: "USD",
        netValue: 1988.56,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "US",
        source: "API",
        notes: "Alocação ETH para Staking Coinbase",
      },
      {
        id: "ord_bin_eth_1",
        broker: "Binance",
        dateTime: "2024-03-01T14:00:00Z",
        asset: "ETH",
        quantity: 1.08041850,
        side: "BUY",
        price: 2160.00,
        grossValue: 2333.70,
        fee: 2.30,
        feeAsset: "USD",
        netValue: 2336.00,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "KY",
        source: "API",
        notes: "Spot Binance ETH/USDT",
      },
      {
        id: "ord_mb_eth_1",
        broker: "Mercado Bitcoin",
        dateTime: "2024-03-22T16:45:00Z",
        asset: "ETH",
        quantity: 0.40945792,
        side: "BUY",
        price: 2160.00,
        grossValue: 884.43,
        fee: 1.20,
        feeAsset: "USD",
        netValue: 885.63,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "BR",
        source: "API",
        notes: "Ordem a Mercado Mercado Bitcoin",
      },
      // Início de 2026 - Cotação oficial Binance Klines (10/03/2026 Close: US$ 69.948,63)
      {
        id: "ord_bin_btc_2026_03",
        broker: "Binance",
        dateTime: "2026-03-10T14:22:15Z",
        asset: "BTC",
        quantity: 0.01429618,
        side: "BUY",
        price: 69948.63,
        grossValue: 1000.00,
        fee: 1.0,
        feeAsset: "USDT",
        netValue: 1001.00,
        quoteCurrency: "USDT",
        transactionType: "SPOT",
        country: "KY",
        source: "API",
        notes: "Execução Binance Spot BTC/USDT em 10/03/2026 (Cotação oficial Binance Klines: US$ 69.948,63)",
      },
      // Início de 2026 - Cotação oficial Binance Klines (12/03/2026 Close: US$ 2.073,52)
      {
        id: "ord_bin_eth_2026_03",
        broker: "Binance",
        dateTime: "2026-03-12T18:45:30Z",
        asset: "ETH",
        quantity: 0.331537,
        side: "BUY",
        price: 2073.52,
        grossValue: 687.45,
        fee: 0.70,
        feeAsset: "USDT",
        netValue: 688.15,
        quoteCurrency: "USDT",
        transactionType: "SPOT",
        country: "KY",
        source: "API",
        notes: "Execução Binance Spot ETH/USDT em 12/03/2026 (Cotação oficial Binance Klines: US$ 2.073,52)",
      },
      // Compras de Ontem (16/11/2026) - Cotação oficial Binance Klines (16/11/2026 Close: US$ 64.882,87 / R$ 376.716,00)
      {
        id: "ord_bin_btc_2026_11_16",
        broker: "Binance",
        dateTime: "2026-11-16T14:22:15Z",
        asset: "BTC",
        quantity: 0.01480518,
        side: "BUY",
        price: 64882.87,
        grossValue: 960.60,
        fee: 0.96,
        feeAsset: "USDT",
        netValue: 961.56,
        quoteCurrency: "USDT",
        transactionType: "SPOT",
        country: "KY",
        source: "API",
        notes: "Execução Binance Spot BTC/USDT de ontem 16/11/2026 (Cotação oficial Binance Klines: US$ 64.882,87 / R$ 376.716,00)",
      },
      // Compras de Ontem (16/11/2026) - Cotação oficial Binance Klines (16/11/2026 Close: US$ 1.820,67 / R$ 10.581,09)
      {
        id: "ord_bin_eth_2026_11_16",
        broker: "Binance",
        dateTime: "2026-11-16T15:45:30Z",
        asset: "ETH",
        quantity: 0.39590370,
        side: "BUY",
        price: 1820.67,
        grossValue: 720.81,
        fee: 0.72,
        feeAsset: "USDT",
        netValue: 721.53,
        quoteCurrency: "USDT",
        transactionType: "SPOT",
        country: "KY",
        source: "API",
        notes: "Execução Binance Spot ETH/USDT de ontem 16/11/2026 (Cotação oficial Binance Klines: US$ 1.820,67 / R$ 10.581,09)",
      },
    ];

    this.trades = historical;
  }

  public importCSV(csvText: string, broker = "Binance"): number {
    const imported = parseCSVText(csvText, broker);
    if (imported.length > 0) {
      this.trades.push(...imported);
      this.trades.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
      this.persistTrades();
    }
    return imported.length;
  }

  public addTrade(trade: CryptoTrade) {
    this.trades.push(trade);
    this.trades.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    this.persistTrades();
  }

  public deleteTrade(id: string): boolean {
    const prev = this.trades.length;
    this.trades = this.trades.filter((t) => t.id !== id);
    if (this.trades.length !== prev) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const storedDeleted = JSON.parse(localStorage.getItem("invest_vision_deleted_trade_ids") || "[]");
          if (Array.isArray(storedDeleted) && !storedDeleted.includes(id)) {
            storedDeleted.push(id);
            localStorage.setItem("invest_vision_deleted_trade_ids", JSON.stringify(storedDeleted));
          }
        }
      } catch (e) {
        console.warn("[CryptoAccountingEngine] Could not persist deleted trade id:", e);
      }
      this.persistTrades();
      return true;
    }
    return false;
  }

  public resetToDefault() {
    this.loadDefaultHistoricalTrades();
    this.persistTrades();
  }

  public getTrades(): CryptoTrade[] {
    return [...this.trades].sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }

  public processAll(): {
    stocks: CryptoPositionStock[];
    disposals: CryptoDisposal[];
    monthlySummaries: Record<string, CryptoTaxMonthSummary>;
    alerts: CryptoTaxAlert[];
    reconciliation: CryptoReconciliationResult;
  } {
    this.costBasisEngine.reset();
    const disposals: CryptoDisposal[] = [];

    // Sort trades chronologically
    const sortedTrades = [...this.trades].sort((a, b) => a.dateTime.localeCompare(b.dateTime));

    for (const trade of sortedTrades) {
      const { allocatedCostBRL } = this.costBasisEngine.processTrade(trade);

      if (isAlienationOperation(trade)) {
        const disposal = buildDisposalFromTrade(trade, allocatedCostBRL, this.defaultFxRateBRL);
        disposals.push(disposal);
      }
    }

    const stocks = this.costBasisEngine.getAllPositionStocks();

    // Group disposals by month YYYY-MM
    const monthSet = new Set<string>();
    sortedTrades.forEach((t) => monthSet.add(t.dateTime.slice(0, 7)));
    disposals.forEach((d) => monthSet.add(d.dateTime.slice(0, 7)));

    // Ensure 2026-09 is present
    monthSet.add("2026-09");

    const monthlySummaries: Record<string, CryptoTaxMonthSummary> = {};
    const allAlerts: CryptoTaxAlert[] = [];

    Array.from(monthSet)
      .sort()
      .forEach((m) => {
        const summary = this.taxEngine.calculateMonthlySummary(m, disposals);
        monthlySummaries[m] = summary;

        const alerts = generateCryptoTaxAlerts(summary, sortedTrades);
        allAlerts.push(...alerts);
      });

    const reconciliation = reconcileCryptoAccounting(sortedTrades, stocks, this.defaultFxRateBRL);

    return {
      stocks,
      disposals,
      monthlySummaries,
      alerts: allAlerts,
      reconciliation,
    };
  }

  // Simulator #1: "O que acontece se eu vender?"
  public simulateSale(
    month: string,
    asset: string,
    quantity: number,
    priceUSD: number,
    broker = "Mercado Bitcoin"
  ): SimulationResult {
    const fx = this.defaultFxRateBRL;
    const priceBRL = priceUSD * fx;
    const grossProceedsBRL = quantity * priceBRL;

    const currentStock = this.costBasisEngine.getPositionStock(asset);
    const avgCostBRL = currentStock.averageCostBRL;
    const allocatedCostBRL = quantity * avgCostBRL;
    const estimatedGainLossBRL = grossProceedsBRL - allocatedCostBRL;

    const { monthlySummaries } = this.processAll();
    const currentMonthSummary = monthlySummaries[month] || {
      nationalDisposalsBRL: 0,
      nationalExemptLimitBRL: 35000,
    };

    const currentDisposalsBRL = currentMonthSummary.nationalDisposalsBRL;
    const newDisposalsBRL = currentDisposalsBRL + grossProceedsBRL;
    const limitBRL = 35000;
    const limitRemainingBefore = Math.max(0, limitBRL - currentDisposalsBRL);
    const limitRemainingAfter = Math.max(0, limitBRL - newDisposalsBRL);
    const wouldExceed = newDisposalsBRL > limitBRL;

    let estimatedTaxBRL = 0;
    if (wouldExceed && estimatedGainLossBRL > 0) {
      estimatedTaxBRL = estimatedGainLossBRL * 0.15;
    }

    let status: SimulationResult["status"] = "GREEN";
    let message = "Venda dentro do limite mensal de isenção.";

    if (wouldExceed) {
      status = "RED";
      message = `⚠️ Esta operação elevará suas alienações mensais para ${newDisposalsBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, ultrapassando o limite de R$ 35.000,00. Impacto tributário estimado: ${estimatedTaxBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
    } else if (newDisposalsBRL >= limitBRL * 0.85) {
      status = "YELLOW";
      message = `Atenção: A operação deixará o saldo do limite mensal em apenas ${limitRemainingAfter.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`;
    }

    return {
      simulatedSaleAsset: asset,
      simulatedQuantity: quantity,
      simulatedPriceUSD: priceUSD,
      simulatedPriceBRL: priceBRL,
      grossProceedsBRL,
      allocatedCostBRL,
      estimatedGainLossBRL,
      currentMonthDisposalsBRL: currentDisposalsBRL,
      newMonthDisposalsBRL: newDisposalsBRL,
      limitBRL,
      limitRemainingBeforeBRL: limitRemainingBefore,
      limitRemainingAfterBRL: limitRemainingAfter,
      wouldExceedLimit: wouldExceed,
      estimatedTaxBRL,
      status,
      message,
    };
  }

  // Simulator #2: "Simular Rebalanceamento"
  public simulateRebalance(
    month: string,
    items: RebalanceItem[]
  ): RebalanceSimulationResult {
    const fx = this.defaultFxRateBRL;
    let totalDisposalsBRL = 0;
    let totalPurchasesBRL = 0;
    let totalGainLossBRL = 0;

    items.forEach((item) => {
      const volBRL = item.quantity * item.priceUSD * fx;
      if (item.action === "SELL") {
        totalDisposalsBRL += volBRL;
        const stock = this.costBasisEngine.getPositionStock(item.asset);
        const cost = item.quantity * stock.averageCostBRL;
        totalGainLossBRL += volBRL - cost;
      } else {
        totalPurchasesBRL += volBRL;
      }
    });

    const netCashBRL = totalDisposalsBRL - totalPurchasesBRL;
    const limitBRL = 35000;
    const remainingLimitBRL = Math.max(0, limitBRL - totalDisposalsBRL);
    const isOverLimit = totalDisposalsBRL > limitBRL;

    return {
      items,
      totalDisposalsBRL,
      totalPurchasesBRL,
      netCashBRL,
      estimatedGainLossBRL: totalGainLossBRL,
      remainingLimitBRL,
      status: isOverLimit ? "RED" : totalDisposalsBRL >= limitBRL * 0.8 ? "YELLOW" : "GREEN",
      summaryMessage: isOverLimit
        ? `⚠️ Alienações do rebalanceamento (${totalDisposalsBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) ultrapassam o limite isento. Compras de cripto não consomem o limite, mas as vendas sim.`
        : `Rebalanceamento dentro do limite mensal. Saldo restante do limite: ${remainingLimitBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    };
  }

  // Simulator #3: "Impacto no Custo de Aquisição"
  public simulateCostReset(
    asset: string,
    simulatedSellPriceUSD: number
  ): CostResetSimulationResult {
    const fx = this.defaultFxRateBRL;
    const stock = this.costBasisEngine.getPositionStock(asset);
    const sellPriceBRL = simulatedSellPriceUSD * fx;
    const grossProceedsBRL = stock.quantity * sellPriceBRL;
    const realizedGainLossBRL = grossProceedsBRL - stock.totalCostBRL;

    const newAvgCostBRL = sellPriceBRL;
    const newTotalCostBRL = grossProceedsBRL;
    const futureTaxShieldBRL = Math.max(0, newTotalCostBRL - stock.totalCostBRL);

    return {
      asset,
      currentQuantity: stock.quantity,
      currentAvgCostBRL: stock.averageCostBRL,
      currentTotalCostBRL: stock.totalCostBRL,
      simulatedSellPriceUSD,
      simulatedSellPriceBRL: sellPriceBRL,
      grossProceedsBRL,
      realizedGainLossBRL,
      newAvgCostBRL,
      newTotalCostBRL,
      futureTaxShieldBRL,
      disclaimer:
        "Simulação informativa. Operações de venda e recompra possuem consequências econômicas, operacionais e tributárias e devem ser avaliadas antes da execução.",
    };
  }

  // Simulator #4: "Metodologia Híbrida de Recompra (Reset & Limit DCA)"
  public simulateHybridBuyback(
    asset: string,
    totalSaleValueBRL: number,
    splitImmediatePct: number,
    sellPriceUSD: number,
    target1DropPct = 10,
    target2DropPct = 20
  ): HybridBuybackSimulationResult {
    const fx = this.defaultFxRateBRL;
    const sellPriceBRL = sellPriceUSD * fx;
    const totalSaleQty = sellPriceBRL > 0 ? totalSaleValueBRL / sellPriceBRL : 0;

    const splitImmediateRatio = Math.max(0, Math.min(100, splitImmediatePct)) / 100;
    const splitReserveRatio = 1 - splitImmediateRatio;

    const immediateAmountBRL = totalSaleValueBRL * splitImmediateRatio;
    const reserveAmountBRL = totalSaleValueBRL * splitReserveRatio;

    const immediateQtyRebought = sellPriceBRL > 0 ? immediateAmountBRL / sellPriceBRL : 0;

    // Target 1 (-10% default)
    const target1PriceUSD = sellPriceUSD * (1 - target1DropPct / 100);
    const target1PriceBRL = target1PriceUSD * fx;
    const target1AmountBRL = reserveAmountBRL * 0.5;
    const target1QtyRebought = target1PriceBRL > 0 ? target1AmountBRL / target1PriceBRL : 0;

    // Target 2 (-20% default)
    const target2PriceUSD = sellPriceUSD * (1 - target2DropPct / 100);
    const target2PriceBRL = target2PriceUSD * fx;
    const target2AmountBRL = reserveAmountBRL * 0.5;
    const target2QtyRebought = target2PriceBRL > 0 ? target2AmountBRL / target2PriceBRL : 0;

    const totalQtyIfHybridDropExecuted =
      immediateQtyRebought + target1QtyRebought + target2QtyRebought;
    const totalQtyIfImmediateOnly = totalSaleQty;

    const extraCryptoQtyGained = totalQtyIfHybridDropExecuted - totalQtyIfImmediateOnly;
    const extraCryptoGainedPct =
      totalQtyIfImmediateOnly > 0 ? (extraCryptoQtyGained / totalQtyIfImmediateOnly) * 100 : 0;

    // Tax Safety & Monthly Installments
    const isLimitExceeded = totalSaleValueBRL > 35000;
    const monthsRequiredForTaxExemption = isLimitExceeded
      ? Math.max(1, Math.ceil(totalSaleValueBRL / 34500))
      : 1;
    const monthlyExemptInstallmentBRL = totalSaleValueBRL / monthsRequiredForTaxExemption;
    const monthlyImmediateAmountBRL = monthlyExemptInstallmentBRL * splitImmediateRatio;
    const monthlyReserveAmountBRL = monthlyExemptInstallmentBRL * splitReserveRatio;

    // Reserve Yield: 0.8% a.m. (approx. 9.6% p.a. in USDT yield / CDI)
    const projectedReserveYieldMonthlyBRL = reserveAmountBRL * 0.008;

    return {
      asset,
      totalSaleValueBRL,
      splitImmediatePct: splitImmediateRatio * 100,
      splitReservePct: splitReserveRatio * 100,
      sellPriceUSD,
      sellPriceBRL,
      totalSaleQty,
      isLimitExceeded,
      monthsRequiredForTaxExemption,
      monthlyExemptInstallmentBRL,
      monthlyImmediateAmountBRL,
      monthlyReserveAmountBRL,
      immediateAmountBRL,
      immediateQtyRebought,
      newAvgCostBRL: sellPriceBRL,
      upsideProtectionPct: splitImmediateRatio * 100,
      reserveAmountBRL,
      target1DropPct,
      target1PriceUSD,
      target1PriceBRL,
      target1QtyRebought,
      target2DropPct,
      target2PriceUSD,
      target2PriceBRL,
      target2QtyRebought,
      totalQtyIfImmediateOnly,
      totalQtyIfHybridDropExecuted,
      extraCryptoQtyGained,
      extraCryptoGainedPct,
      projectedReserveYieldMonthlyBRL,
    };
  }
}

export const cryptoAccountingEngine = new CryptoAccountingEngine();
export default cryptoAccountingEngine;
