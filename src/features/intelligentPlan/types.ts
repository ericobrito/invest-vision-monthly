export type OperationalAlertState =
  | "STRATEGY_OK" // 🟢 Dentro da estratégia
  | "REQUIRES_ATTENTION" // 🟡 Requer atenção
  | "RULE_TRIGGERED" // 🔴 Regra acionada
  | "AWAITING_TRIGGER"; // 🔵 Aguardando gatilho

export type ValuationAlertLevel = "NONE" | "ATTENTION" | "HIGH" | "VERY_HIGH"; // +50%, +100%, +200%

export interface AssetRuleConfig {
  symbol: string;
  name: string;
  targetWeightPct: number;
  minWeightPct: number;
  maxWeightPct: number;
  minPositionValueBRL: number;
  maxRealizationPct: number;
  targetProfitPct?: number; // e.g. 30% target profit for TSLA
  individualDrawdownTriggerPct?: number; // e.g. -12%
}

export interface IntelligentPlanConfig {
  opportunityCashTargetBRL: number;
  currentOpportunityCashBRL: number;
  cryptoMonthlyThresholdBRL: number; // Default R$ 35.000
  minProfitRealizationPct?: number; // Default 20% minimum profit required for partial realization
  reEntryBenchmark: string; // e.g. "S&P 500"
  reEntryLadder: {
    drawdownPct: number; // -5, -10, -15, -20, -30
    cashAllocationPct: number; // 10%, 20%, 25%, 25%, 20%
    triggered: boolean;
  }[];
  assetRules: Record<string, AssetRuleConfig>;
}

export interface InvestmentDiagnosticItem {
  id: string;
  symbol: string;
  name: string;
  category: string;
  nativeCurrency: string;
  currentValueNative: number;
  currentValueBRL: number;
  investedValueBRL: number;
  profitBRL: number;
  profitPercent: number;
  quantity: number;
  averageCost: number;
  currentWeightPct: number;
  targetWeightPct: number;
  maxWeightPct: number;
  minWeightPct: number;
  capitalExcessBRL: number;
  valuationAlert: ValuationAlertLevel;
  alertState: OperationalAlertState;
  alertMessage: string;
  distanceFromMaxPct: number;
  currentDrawdownPct: number;
}

export interface RealizationSuggestionItem {
  symbol: string;
  name: string;
  currentPositionBRL: number;
  configuredRealizationPct: number;
  suggestedSaleBRL: number;
  suggestedSalePct: number;
  remainingPositionBRL: number;
  newWeightPct: number;
  estimatedRealizedProfitBRL: number;
  cashGeneratedBRL: number;
  alertState: OperationalAlertState;
}

export interface OpportunityCashOverview {
  targetBRL: number;
  currentBRL: number;
  gapBRL: number;
  progressPct: number;
  emergencyReserveBRL?: number;
  operationalCashBRL?: number;
  stablecoinCashBRL?: number;
}

export interface ReEntryLevelStatus {
  drawdownPct: number;
  cashAllocationPct: number;
  cashAllocationBRL: number;
  triggered: boolean;
  benchmarkPrice?: number;
  referenceHighPrice?: number;
  currentDrawdownPct?: number;
}

export interface AssetReEntryStatus {
  symbol: string;
  name: string;
  currentDrawdownPct: number;
  configuredTriggerPct: number;
  isTriggered: boolean;
  suggestedReEntryBRL: number;
}

export interface CryptoTaxConsolidationStatus {
  month: string;
  monthlyThresholdBRL: number; // R$ 35.000
  consolidatedDisposalsBRL: number; // Across all exchanges
  remainingThresholdBRL: number;
  thresholdUsedPct: number;
  projectedDisposalsBRL: number;
  projectedNetGainBRL: number;
  estimatedTaxBRL: number;
  exceededLimit: boolean;
  alertState: OperationalAlertState;
  exchangesIncluded: string[];
}

export interface StrategySimulationScenario {
  strategyId: "STRATEGY_A" | "STRATEGY_B" | "STRATEGY_C";
  strategyName: string;
  description: string;
  finalPortfolioValueBRL: number;
  opportunityCashBRL: number;
  investedCapitalBRL: number;
  positionSizeBRL: number;
  averageCostBRL: number;
  repurchasedQuantity: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  estimatedTaxBRL: number;
  transactionCostsBRL: number;
  opportunityCostBRL: number;
}

export interface HistoricalRealizationRecord {
  id: string;
  date: string;
  symbol: string;
  type: "REALIZATION" | "RE_ENTRY";
  amountBRL: number;
  cashImpactBRL: number;
  taxImpactBRL: number;
  notes: string;
}
