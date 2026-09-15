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

export class CryptoAccountingEngine {
  private trades: CryptoTrade[] = [];
  private costBasisEngine: CryptoCostBasisEngine;
  private taxEngine: CryptoTaxEngine;
  private defaultFxRateBRL = 5.0740;

  constructor(defaultFxRateBRL = 5.0740) {
    this.defaultFxRateBRL = defaultFxRateBRL;
    this.costBasisEngine = new CryptoCostBasisEngine(defaultFxRateBRL);
    this.taxEngine = new CryptoTaxEngine();

    // Populate with historical executed Bybit/Binance/Coinbase trades
    this.loadDefaultHistoricalTrades();
  }

  public getTaxRuleVersion() {
    return this.taxEngine.getTaxRuleVersion();
  }

  private loadDefaultHistoricalTrades() {
    // Historical executions from Bybit / Binance / Coinbase matching full portfolio positions
    const historical: CryptoTrade[] = [
      {
        id: "trade_hist_1",
        broker: "Bybit",
        dateTime: "2024-03-15T10:00:00Z",
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
        source: "CSV",
      },
      {
        id: "trade_hist_1b",
        broker: "Binance",
        dateTime: "2024-03-20T11:00:00Z",
        asset: "USDT",
        quantity: 3859.326752,
        side: "BUY",
        price: 1.00,
        grossValue: 3859.33,
        fee: 0,
        feeAsset: "USD",
        netValue: 3859.33,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "KY",
        source: "CSV",
      },
      {
        id: "trade_hist_2",
        broker: "Bybit",
        dateTime: "2024-04-10T14:30:00Z",
        asset: "BTC",
        quantity: 0.061088,
        side: "BUY",
        price: 29882.78,
        grossValue: 1825.48,
        fee: 2.5,
        feeAsset: "USD",
        netValue: 1827.98,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "AE",
        source: "CSV",
      },
      {
        id: "trade_hist_2b",
        broker: "Binance",
        dateTime: "2024-04-15T16:00:00Z",
        asset: "BTC",
        quantity: 0.098533,
        side: "BUY",
        price: 29882.78,
        grossValue: 2944.44,
        fee: 3.5,
        feeAsset: "USD",
        netValue: 2947.94,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "KY",
        source: "CSV",
      },
      {
        id: "trade_hist_3",
        broker: "Bybit",
        dateTime: "2024-05-20T09:15:00Z",
        asset: "ETH",
        quantity: 0.919702,
        side: "BUY",
        price: 169.77,
        grossValue: 156.14,
        fee: 0.5,
        feeAsset: "USD",
        netValue: 156.64,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "AE",
        source: "CSV",
      },
      {
        id: "trade_hist_3b",
        broker: "Coinbase",
        dateTime: "2024-06-10T15:30:00Z",
        asset: "ETH",
        quantity: 2.196619,
        side: "BUY",
        price: 2994.40,
        grossValue: 6577.55,
        fee: 5.0,
        feeAsset: "USD",
        netValue: 6582.55,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "US",
        source: "CSV",
      },
      {
        id: "trade_hist_4",
        broker: "Bybit",
        dateTime: "2025-11-01T12:00:00Z",
        asset: "ETH",
        quantity: 0.919702,
        side: "SELL",
        price: 169.77,
        grossValue: 156.14,
        fee: 0,
        feeAsset: "USD",
        netValue: 156.14,
        quoteCurrency: "USD",
        transactionType: "TRANSFER",
        sourceWallet: "Bybit",
        destinationWallet: "Coinbase",
        country: "AE",
        source: "CSV",
        notes: "Custody transfer from Bybit to Coinbase",
      },
      {
        id: "trade_hist_5",
        broker: "Coinbase",
        dateTime: "2025-11-01T12:05:00Z",
        asset: "ETH",
        quantity: 0.919702,
        side: "BUY",
        price: 169.77,
        grossValue: 156.14,
        fee: 0,
        feeAsset: "USD",
        netValue: 156.14,
        quoteCurrency: "USD",
        transactionType: "TRANSFER",
        sourceWallet: "Bybit",
        destinationWallet: "Coinbase",
        country: "US",
        source: "CSV",
        notes: "Custody transfer received at Coinbase",
      },
    ];

    this.trades = historical;
  }

  public importCSV(csvText: string, broker = "Binance"): number {
    const imported = parseCSVText(csvText, broker);
    if (imported.length > 0) {
      this.trades.push(...imported);
      this.trades.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    }
    return imported.length;
  }

  public addTrade(trade: CryptoTrade) {
    this.trades.push(trade);
    this.trades.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
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
