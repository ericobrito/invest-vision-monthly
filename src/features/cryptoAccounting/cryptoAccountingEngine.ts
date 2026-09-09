import type {
  CostResetSimulationResult,
  CryptoDisposal,
  CryptoPositionStock,
  CryptoReconciliationResult,
  CryptoTaxAlert,
  CryptoTaxMonthSummary,
  CryptoTrade,
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
    // Historical executions from Bybit / Binance / Coinbase
    const historical: CryptoTrade[] = [
      {
        id: "trade_hist_1",
        broker: "Bybit",
        dateTime: "2024-03-15T10:00:00Z",
        asset: "USDT",
        quantity: 4754.7789,
        side: "BUY",
        price: 0.46,
        grossValue: 2187.20,
        fee: 0,
        feeAsset: "USD",
        netValue: 2187.20,
        quoteCurrency: "USD",
        transactionType: "SPOT",
        country: "AE",
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
    simulatedPriceUSD: number
  ): CostResetSimulationResult {
    const fx = this.defaultFxRateBRL;
    const stock = this.costBasisEngine.getPositionStock(asset);
    const sellPriceBRL = simulatedPriceUSD * fx;
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
}

export const cryptoAccountingEngine = new CryptoAccountingEngine();
export default cryptoAccountingEngine;
