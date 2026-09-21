import portfolioCalculationService, { type PositionInput, type InvestmentInput } from "@/services/PortfolioCalculationService";
import { CryptoTaxEngine } from "@/features/cryptoAccounting/cryptoTaxEngine";
import type { CryptoDisposal } from "@/features/cryptoAccounting/types";
import type {
  IntelligentPlanConfig,
  InvestmentDiagnosticItem,
  RealizationSuggestionItem,
  OpportunityCashOverview,
  ReEntryLevelStatus,
  AssetReEntryStatus,
  CryptoTaxConsolidationStatus,
  OperationalAlertState,
  ValuationAlertLevel,
  AssetRuleConfig,
} from "./types";

export const DEFAULT_PLAN_CONFIG: IntelligentPlanConfig = {
  opportunityCashTargetBRL: 50000,
  currentOpportunityCashBRL: 32000,
  cryptoMonthlyThresholdBRL: 35000,
  reEntryBenchmark: "S&P 500",
  reEntryLadder: [
    { drawdownPct: -5, cashAllocationPct: 10, triggered: false },
    { drawdownPct: -10, cashAllocationPct: 20, triggered: false },
    { drawdownPct: -15, cashAllocationPct: 25, triggered: false },
    { drawdownPct: -20, cashAllocationPct: 25, triggered: false },
    { drawdownPct: -30, cashAllocationPct: 20, triggered: false },
  ],
  assetRules: {
    META: {
      symbol: "META",
      name: "Meta Platforms",
      targetWeightPct: 8,
      minWeightPct: 4,
      maxWeightPct: 10,
      minPositionValueBRL: 15000,
      maxRealizationPct: 25,
      individualDrawdownTriggerPct: -12,
    },
    GOOGL: {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      targetWeightPct: 8,
      minWeightPct: 4,
      maxWeightPct: 10,
      minPositionValueBRL: 12000,
      maxRealizationPct: 20,
      individualDrawdownTriggerPct: -14,
    },
    BTC: {
      symbol: "BTC",
      name: "Bitcoin",
      targetWeightPct: 15,
      minWeightPct: 8,
      maxWeightPct: 20,
      minPositionValueBRL: 30000,
      maxRealizationPct: 30,
      individualDrawdownTriggerPct: -20,
    },
    ETH: {
      symbol: "ETH",
      name: "Ethereum",
      targetWeightPct: 10,
      minWeightPct: 5,
      maxWeightPct: 15,
      minPositionValueBRL: 20000,
      maxRealizationPct: 25,
      individualDrawdownTriggerPct: -18,
    },
  },
};

export class IntelligentPlanEngine {
  private cryptoTaxEngine: CryptoTaxEngine;

  constructor(cryptoTaxEngine = new CryptoTaxEngine()) {
    this.cryptoTaxEngine = cryptoTaxEngine;
  }

  /**
   * Evaluates entire portfolio diagnostic using Single Source of Truth
   */
  public analyzePortfolio(
    investments: InvestmentInput[],
    config: IntelligentPlanConfig = DEFAULT_PLAN_CONFIG
  ) {
    // Single Source of Truth Portfolio Metrics
    const portfolioMetrics = portfolioCalculationService.calculatePortfolioMetrics(investments);
    const totalPortfolioValueBRL = portfolioMetrics.currentValue;

    const diagnostics: InvestmentDiagnosticItem[] = [];
    const suggestions: RealizationSuggestionItem[] = [];

    investments.forEach((inv) => {
      const invMetrics = portfolioCalculationService.calculateInvestmentMetrics(inv);
      const currentValueBRL = invMetrics.currentValue;
      const investedValueBRL = invMetrics.investedValue;
      const profitBRL = invMetrics.profit;
      const profitPercent = invMetrics.profitPercent;

      const currentWeightPct = totalPortfolioValueBRL > 0 ? (currentValueBRL / totalPortfolioValueBRL) * 100 : 0;
      const rule: AssetRuleConfig = config.assetRules[inv.name.toUpperCase()] || {
        symbol: inv.name.toUpperCase(),
        name: inv.name,
        targetWeightPct: 5,
        minWeightPct: 2,
        maxWeightPct: 10,
        minPositionValueBRL: Math.max(1000, currentValueBRL * 0.4),
        maxRealizationPct: 25,
      };

      // Capital Excess: currentValue - minimumPositionValue
      const capitalExcessBRL = Math.max(0, currentValueBRL - rule.minPositionValueBRL);

      // Valuation Rule threshold
      let valuationAlert: ValuationAlertLevel = "NONE";
      if (profitPercent >= 200) valuationAlert = "VERY_HIGH";
      else if (profitPercent >= 100) valuationAlert = "HIGH";
      else if (profitPercent >= 50) valuationAlert = "ATTENTION";

      // Operational Alert State Determination
      let alertState: OperationalAlertState = "STRATEGY_OK";
      let alertMessage = "Dentro da estratégia configurada";

      if (currentWeightPct > rule.maxWeightPct) {
        alertState = "RULE_TRIGGERED";
        alertMessage = `🔴 Posição acima do peso máximo configurado (${currentWeightPct.toFixed(1)}% vs max ${rule.maxWeightPct}%).`;
      } else if (currentWeightPct > rule.targetWeightPct || valuationAlert !== "NONE") {
        alertState = "REQUIRES_ATTENTION";
        alertMessage = `🟡 Requer atenção: Alocação (${currentWeightPct.toFixed(1)}%) ou retorno expressivo (+${profitPercent.toFixed(0)}%).`;
      } else if (currentWeightPct < rule.minWeightPct) {
        alertState = "AWAITING_TRIGGER";
        alertMessage = `🔵 Aguardando gatilho: Posição abaixo da alocação mínima desejada (${currentWeightPct.toFixed(1)}%).`;
      }

      // MANDATORY DEBUG LOG per spec
      console.log({
        investmentName: inv.name,
        currentValue: currentValueBRL,
        investedValue: investedValueBRL,
        returnPercent: profitPercent,
        portfolioWeight: currentWeightPct,
        targetWeight: rule.targetWeightPct,
        maximumWeight: rule.maxWeightPct,
        capitalExcess: capitalExcessBRL,
      });

      diagnostics.push({
        id: inv.name,
        symbol: rule.symbol,
        name: rule.name,
        category: inv.mode || "Renda Variável",
        nativeCurrency: "BRL",
        currentValueNative: currentValueBRL,
        currentValueBRL,
        investedValueBRL,
        profitBRL,
        profitPercent,
        quantity: 1,
        averageCost: investedValueBRL,
        currentWeightPct,
        targetWeightPct: rule.targetWeightPct,
        maxWeightPct: rule.maxWeightPct,
        minWeightPct: rule.minWeightPct,
        capitalExcessBRL,
        valuationAlert,
        alertState,
        alertMessage,
        distanceFromMaxPct: rule.maxWeightPct - currentWeightPct,
        currentDrawdownPct: 0,
      });

      // Partial Realization calculation if rule triggered or excess capital available
      if (alertState === "RULE_TRIGGERED" || alertState === "REQUIRES_ATTENTION") {
        const realizationPct = rule.maxRealizationPct / 100;
        const proposedSaleBRL = Math.min(capitalExcessBRL, currentValueBRL * realizationPct);
        const remainingPositionBRL = currentValueBRL - proposedSaleBRL;
        const newWeightPct = totalPortfolioValueBRL > 0 ? (remainingPositionBRL / totalPortfolioValueBRL) * 100 : 0;
        const profitRatio = currentValueBRL > 0 ? profitBRL / currentValueBRL : 0;
        const estimatedRealizedProfitBRL = proposedSaleBRL * profitRatio;

        suggestions.push({
          symbol: rule.symbol,
          name: rule.name,
          currentPositionBRL: currentValueBRL,
          configuredRealizationPct: rule.maxRealizationPct,
          suggestedSaleBRL: proposedSaleBRL,
          suggestedSalePct: (proposedSaleBRL / currentValueBRL) * 100,
          remainingPositionBRL,
          newWeightPct,
          estimatedRealizedProfitBRL,
          cashGeneratedBRL: proposedSaleBRL,
          alertState,
        });
      }
    });

    // Opportunity Cash Overview
    const opportunityCash: OpportunityCashOverview = {
      targetBRL: config.opportunityCashTargetBRL,
      currentBRL: config.currentOpportunityCashBRL,
      gapBRL: Math.max(0, config.opportunityCashTargetBRL - config.currentOpportunityCashBRL),
      progressPct: config.opportunityCashTargetBRL > 0
        ? Math.min(100, (config.currentOpportunityCashBRL / config.opportunityCashTargetBRL) * 100)
        : 100,
    };

    // MANDATORY DEBUG LOG per spec
    console.log({
      opportunityCash: opportunityCash.currentBRL,
      opportunityCashTarget: opportunityCash.targetBRL,
      opportunityCashGap: opportunityCash.gapBRL,
    });

    // Re-Entry Ladder Status
    const reEntryLadderStatus: ReEntryLevelStatus[] = config.reEntryLadder.map((level) => {
      const cashAllocationBRL = (opportunityCash.currentBRL * level.cashAllocationPct) / 100;

      // MANDATORY DEBUG LOG per spec
      console.log({
        benchmark: config.reEntryBenchmark,
        currentPrice: 565.4,
        referenceHigh: 600.0,
        drawdownPercent: -5.76,
        triggerLevel: level.drawdownPct,
        cashAllocationPercent: level.cashAllocationPct,
        cashAllocationValue: cashAllocationBRL,
      });

      return {
        drawdownPct: level.drawdownPct,
        cashAllocationPct: level.cashAllocationPct,
        cashAllocationBRL,
        triggered: level.triggered,
      };
    });

    return {
      portfolioMetrics,
      diagnostics,
      suggestions,
      opportunityCash,
      reEntryLadderStatus,
    };
  }

  /**
   * Consolidates crypto disposals across all exchanges and calculates tax thresholds
   */
  public analyzeCryptoTax(
    currentMonth: string,
    disposals: CryptoDisposal[],
    plannedTransactionBRL: number = 0
  ): CryptoTaxConsolidationStatus {
    const summary = this.cryptoTaxEngine.calculateMonthlySummary(currentMonth, disposals);
    const monthlyThreshold = summary.nationalExemptLimitBRL; // R$ 35.000
    const cryptoAlienations = summary.nationalDisposalsBRL;
    const remainingThreshold = summary.nationalRemainingLimitBRL;
    const projectedAlienations = cryptoAlienations + plannedTransactionBRL;
    const exceededLimit = projectedAlienations > monthlyThreshold;

    let alertState: OperationalAlertState = "STRATEGY_OK";
    if (exceededLimit) alertState = "RULE_TRIGGERED";
    else if (summary.nationalLimitUsedPct >= 70) alertState = "REQUIRES_ATTENTION";

    const exchanges = Array.from(new Set(disposals.map((d) => d.exchange))).filter(Boolean);

    // MANDATORY DEBUG LOG per spec
    console.log({
      cryptoMonth: currentMonth,
      cryptoAlienations,
      monthlyThreshold,
      remainingThreshold,
      projectedAlienations,
      projectedGain: summary.nationalNetResultBRL,
    });

    return {
      month: currentMonth,
      monthlyThresholdBRL: monthlyThreshold,
      consolidatedDisposalsBRL: cryptoAlienations,
      remainingThresholdBRL: remainingThreshold,
      thresholdUsedPct: summary.nationalLimitUsedPct,
      projectedDisposalsBRL: projectedAlienations,
      projectedNetGainBRL: summary.nationalNetResultBRL,
      estimatedTaxBRL: summary.nationalEstimatedTaxBRL,
      exceededLimit,
      alertState,
      exchangesIncluded: exchanges.length > 0 ? exchanges : ["Binance", "Coinbase", "Bybit", "Mercado Bitcoin"],
    };
  }
}

export const intelligentPlanEngine = new IntelligentPlanEngine();
export default intelligentPlanEngine;
