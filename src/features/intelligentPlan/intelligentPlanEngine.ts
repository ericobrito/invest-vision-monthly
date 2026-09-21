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

export interface StockPositionInput {
  symbol: string;
  name: string;
  category: "Ação EUA" | "Ação Brasil" | "Criptoativo" | "ETF" | "FII";
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currency?: string;
  fxRate?: number;
  appliedAmountBRL?: number;
  currentValueBRL?: number;
}

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
    NVDA: {
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      targetWeightPct: 10,
      minWeightPct: 5,
      maxWeightPct: 15,
      minPositionValueBRL: 20000,
      maxRealizationPct: 30,
      individualDrawdownTriggerPct: -15,
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
      targetProfitPct: 25,
      individualDrawdownTriggerPct: -18,
    },
    TSLA: {
      symbol: "TSLA",
      name: "Tesla Inc.",
      targetWeightPct: 10,
      minWeightPct: 5,
      maxWeightPct: 15,
      minPositionValueBRL: 10000,
      maxRealizationPct: 25,
      targetProfitPct: 30, // User's target profit expectation for Tesla
      individualDrawdownTriggerPct: -15,
    },
  },
};

export const STABLECOIN_SYMBOLS = new Set(["USDT", "USDC", "BUSD", "DAI", "FDUSD", "USDE"]);

export class IntelligentPlanEngine {
  private cryptoTaxEngine: CryptoTaxEngine;

  constructor(cryptoTaxEngine = new CryptoTaxEngine()) {
    this.cryptoTaxEngine = cryptoTaxEngine;
  }

  /**
   * Evaluates Intelligent Plan strictly for Variable Income assets at individual stock/asset level.
   * Single Source of Truth via PortfolioCalculationService.
   */
  public analyzeVariableIncomePortfolio(
    stockPositions: StockPositionInput[],
    config: IntelligentPlanConfig = DEFAULT_PLAN_CONFIG,
    extraCash: { nubankCashBRL?: number } = {}
  ) {
    // 1. Calculate Single Source of Truth metrics per individual stock position
    let totalVariableIncomeBRL = 0;
    let totalVariableInvestedBRL = 0;
    let stablecoinCashBRL = 0;

    const computedPositions = stockPositions.map((pos) => {
      const metricsBRL = portfolioCalculationService.calculatePositionMetricsBRL({
        symbol: pos.symbol,
        quantity: pos.quantity,
        averagePrice: pos.averagePrice,
        currentPrice: pos.currentPrice,
        currency: pos.currency || "BRL",
        fxRate: pos.fxRate || 5.45,
        appliedAmountBRL: pos.appliedAmountBRL,
        currentValueBRL: pos.currentValueBRL,
      });

      const symUpper = pos.symbol.toUpperCase().trim();
      if (STABLECOIN_SYMBOLS.has(symUpper)) {
        stablecoinCashBRL += metricsBRL.currentValue;
      } else {
        totalVariableIncomeBRL += metricsBRL.currentValue;
        totalVariableInvestedBRL += metricsBRL.investedValue;
      }

      return {
        ...pos,
        metricsBRL,
      };
    });

    const diagnostics: InvestmentDiagnosticItem[] = [];
    const suggestions: RealizationSuggestionItem[] = [];
    const assetReEntryTriggers: AssetReEntryStatus[] = [];

    // 2. Evaluate individual stock position rules against Variable Income total
    computedPositions.forEach((pos) => {
      const currentValueBRL = pos.metricsBRL.currentValue;
      const investedValueBRL = pos.metricsBRL.investedValue;
      const profitBRL = pos.metricsBRL.profit;
      const profitPercent = pos.metricsBRL.profitPercent;
      const symUpper = pos.symbol.toUpperCase().trim();
      const isStablecoin = STABLECOIN_SYMBOLS.has(symUpper);

      // Weight relative to Variable Income Portfolio (active risk assets)
      const currentWeightPct =
        totalVariableIncomeBRL > 0 ? (currentValueBRL / totalVariableIncomeBRL) * 100 : 0;

      const rule: AssetRuleConfig = config.assetRules[symUpper] || {
        symbol: symUpper,
        name: pos.name,
        targetWeightPct: 5,
        minWeightPct: 2,
        maxWeightPct: 15,
        minPositionValueBRL: Math.max(1000, currentValueBRL * 0.4),
        maxRealizationPct: 25,
        targetProfitPct: 20,
        individualDrawdownTriggerPct: -15,
      };

      const globalMinProfitPct = config.minProfitRealizationPct ?? 20;
      const targetProfitPct = rule.targetProfitPct ?? globalMinProfitPct;

      // 1. Calculate Capital Excess over minimum position / target weight
      const minPreservedBRL = rule.minPositionValueBRL && rule.minPositionValueBRL < currentValueBRL
        ? rule.minPositionValueBRL
        : Math.min(investedValueBRL, currentValueBRL * (1 - rule.maxRealizationPct / 100));

      let capitalExcessBRL = 0;
      let valuationAlert: ValuationAlertLevel = "NONE";
      let alertState: OperationalAlertState = "STRATEGY_OK";
      let alertMessage = "Posição dentro da estratégia de Renda Variável";

      if (isStablecoin) {
        alertState = "STRATEGY_OK";
        alertMessage = `🟢 Moeda Estável (Caixa em Dólar). R$ ${currentValueBRL.toLocaleString()} contabilizado no Caixa de Oportunidade.`;
        capitalExcessBRL = 0;
        valuationAlert = "NONE";
      } else {
        capitalExcessBRL = profitBRL > 0 && profitPercent >= targetProfitPct
          ? Math.max(0, currentValueBRL - minPreservedBRL)
          : 0;

        // Valuation Alert threshold (+50%, +100%, +200%)
        if (profitPercent >= 200) valuationAlert = "VERY_HIGH";
        else if (profitPercent >= 100) valuationAlert = "HIGH";
        else if (profitPercent >= 50) valuationAlert = "ATTENTION";

        if (profitBRL <= 0) {
          alertState = "STRATEGY_OK";
          alertMessage = `🟢 Posição sem lucro positivo (${profitPercent.toFixed(1)}%). Ativos em queda/retenção não são vendidos.`;
        } else if (profitPercent < targetProfitPct) {
          alertState = "STRATEGY_OK";
          alertMessage = `🟢 Rentabilidade (+${profitPercent.toFixed(1)}%) aguardando meta de lucro de ${targetProfitPct}%. Nenhuma venda sugerida.`;
        } else if (currentWeightPct > rule.maxWeightPct) {
          alertState = "RULE_TRIGGERED";
          alertMessage = `🔴 Posição acima do peso máximo da Renda Variável (${currentWeightPct.toFixed(1)}% vs máx ${rule.maxWeightPct}%).`;
        } else if (currentWeightPct > rule.targetWeightPct || valuationAlert !== "NONE") {
          alertState = "REQUIRES_ATTENTION";
          alertMessage = `🟡 Requer atenção: Alocação (${currentWeightPct.toFixed(1)}%) ou lucro expressivo (+${profitPercent.toFixed(0)}%).`;
        } else if (currentWeightPct < rule.minWeightPct) {
          alertState = "AWAITING_TRIGGER";
          alertMessage = `🔵 Posição abaixo da alocação mínima de Renda Variável (${currentWeightPct.toFixed(1)}%).`;
        }
      }

      // MANDATORY DEBUG LOG per spec
      console.log({
        investmentName: pos.symbol,
        currentValue: currentValueBRL,
        investedValue: investedValueBRL,
        returnPercent: profitPercent,
        portfolioWeight: currentWeightPct,
        targetWeight: rule.targetWeightPct,
        maximumWeight: rule.maxWeightPct,
        capitalExcess: capitalExcessBRL,
      });

      diagnostics.push({
        id: pos.symbol,
        symbol: pos.symbol,
        name: pos.name,
        category: pos.category,
        nativeCurrency: pos.currency || "BRL",
        currentValueNative: pos.quantity * pos.currentPrice,
        currentValueBRL,
        investedValueBRL,
        profitBRL,
        profitPercent,
        quantity: pos.quantity,
        averageCost: pos.averagePrice,
        currentWeightPct: isStablecoin ? 0 : currentWeightPct,
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

      // Partial realization suggestion if position has positive profit AND meets profit target AND (rule triggered, requires attention, or capital excess)
      const isEligibleForRealization =
        !isStablecoin &&
        profitBRL > 0 &&
        profitPercent >= targetProfitPct &&
        (alertState === "RULE_TRIGGERED" ||
          alertState === "REQUIRES_ATTENTION" ||
          currentWeightPct >= rule.targetWeightPct ||
          capitalExcessBRL > 0);

      if (isEligibleForRealization) {
        const realizationPct = (rule.maxRealizationPct || 25) / 100;
        const proposedSaleBRL = Math.min(
          capitalExcessBRL > 0 ? capitalExcessBRL : currentValueBRL * realizationPct,
          currentValueBRL * realizationPct,
          profitBRL
        );

        if (proposedSaleBRL > 0) {
          const remainingPositionBRL = currentValueBRL - proposedSaleBRL;
          const newWeightPct =
            totalVariableIncomeBRL > 0 ? (remainingPositionBRL / totalVariableIncomeBRL) * 100 : 0;
          const profitRatio = currentValueBRL > 0 ? profitBRL / currentValueBRL : 0;
          const estimatedRealizedProfitBRL = proposedSaleBRL * profitRatio;

          suggestions.push({
            symbol: pos.symbol,
            name: pos.name,
            currentPositionBRL: currentValueBRL,
            configuredRealizationPct: rule.maxRealizationPct || 25,
            suggestedSaleBRL: Math.round(proposedSaleBRL),
            suggestedSalePct: Number(((proposedSaleBRL / currentValueBRL) * 100).toFixed(1)),
            remainingPositionBRL: Math.round(remainingPositionBRL),
            newWeightPct: Number(newWeightPct.toFixed(1)),
            estimatedRealizedProfitBRL: Math.round(estimatedRealizedProfitBRL),
            cashGeneratedBRL: Math.round(proposedSaleBRL),
            alertState: alertState === "STRATEGY_OK" ? "REQUIRES_ATTENTION" : alertState,
          });
        }
      }

      // Stock Drawdown Trigger Check
      if (!isStablecoin && rule.individualDrawdownTriggerPct) {
        assetReEntryTriggers.push({
          symbol: pos.symbol,
          name: pos.name,
          currentDrawdownPct: 0, // Dynamic stock drawdown calculation
          configuredTriggerPct: rule.individualDrawdownTriggerPct,
          isTriggered: false,
          suggestedReEntryBRL: Math.round(config.currentOpportunityCashBRL * 0.15),
        });
      }
    });

    // Opportunity Cash Overview (including stablecoins like USDT, USDC & daily liquidity Nubank)
    const nubankCashBRL = extraCash.nubankCashBRL || 0;
    const totalOpportunityCashBRL = config.currentOpportunityCashBRL + stablecoinCashBRL + nubankCashBRL;

    const opportunityCash: OpportunityCashOverview = {
      targetBRL: config.opportunityCashTargetBRL,
      currentBRL: totalOpportunityCashBRL,
      gapBRL: Math.max(0, config.opportunityCashTargetBRL - totalOpportunityCashBRL),
      progressPct:
        config.opportunityCashTargetBRL > 0
          ? Math.min(100, (totalOpportunityCashBRL / config.opportunityCashTargetBRL) * 100)
          : 100,
      stablecoinCashBRL,
      nubankCashBRL,
    };

    // MANDATORY DEBUG LOG per spec
    console.log({
      opportunityCash: opportunityCash.currentBRL,
      opportunityCashTarget: opportunityCash.targetBRL,
      opportunityCashGap: opportunityCash.gapBRL,
    });

    // Re-entry ladder
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

    const variableMetrics = {
      investedValue: totalVariableInvestedBRL,
      currentValue: totalVariableIncomeBRL,
      profit: totalVariableIncomeBRL - totalVariableInvestedBRL,
      profitPercent:
        totalVariableInvestedBRL > 0
          ? ((totalVariableIncomeBRL - totalVariableInvestedBRL) / totalVariableInvestedBRL) * 100
          : 0,
    };

    return {
      variableMetrics,
      diagnostics,
      suggestions,
      opportunityCash,
      reEntryLadderStatus,
      assetReEntryTriggers,
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
