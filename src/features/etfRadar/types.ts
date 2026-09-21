export type ETFHorizon = "SHORT" | "MEDIUM" | "LONG";

export type ETFCategory =
  | "BROAD_MARKET"
  | "TECH_SEMIS"
  | "AI_AUTOMATION"
  | "ENERGY_NUCLEAR"
  | "INFRA_MATERIALS"
  | "CYBERSECURITY"
  | "FINANCIALS"
  | "HEALTHCARE";

export interface ETFHolding {
  symbol: string;
  name: string;
  weightPct: number;
  sector?: string;
}

export interface ETFDefinition {
  ticker: string;
  name: string;
  category: ETFCategory;
  theme: string;
  description: string;
  expenseRatioPct: number;
  aumBillionsUSD: number;
  inceptionDate: string;
  holdingsCount: number;
  topHoldingsConcentrationPct: number;
  topHoldings: ETFHolding[];
}

export interface ETFMetrics {
  ticker: string;
  currentPriceUSD: number;
  priceBRL: number;
  fxRateBRL: number;
  return1YPct: number;
  return3YPct: number;
  return5YPct: number;
  return10YPct: number;
  cagrPct: number;
  volatilityPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  beta: number;
  alphaVsSp500Pct: number;
  bestYearPct: number;
  worstYearPct: number;
  averageDailyVolumeMillionsUSD: number;
  fxEffect1YPct: number;
  return1YBRLPct: number;
}

export interface ETFScoreBreakdown {
  ticker: string;
  totalScore: number; // 0-100
  momentumScore: number; // 25%
  relativePerfScore: number; // 20%
  structuralGrowthScore: number; // 15%
  qualityScore: number; // 10%
  valuationScore: number; // 10%
  riskDrawdownScore: number; // 10%
  diversificationScore: number; // 5%
  liquidityScore: number; // 5%
  status: "STRONG_BUY" | "ACCUMULATE" | "NEUTRAL" | "UNDERPERFORM";
}

export interface ETFTrendSignal {
  ticker: string;
  theme: string;
  shortTermTrend: "BULLISH" | "NEUTRAL" | "BEARISH";
  mediumTermTrend: "BULLISH" | "NEUTRAL" | "BEARISH";
  longTermTrend: "BULLISH" | "NEUTRAL" | "BEARISH";
  alignmentScore: number; // 0-100
  driverSummary: string;
}

export type RebalanceFrequency =
  | "BUY_AND_HOLD"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUAL"
  | "ANNUAL";

export interface StrategyAllocation {
  ticker: string;
  weightPct: number;
}

export interface BacktestStrategyConfig {
  id: string;
  name: string;
  description: string;
  allocations: StrategyAllocation[];
  isTrendRotation?: boolean;
}

export interface BacktestYearlyResult {
  year: number;
  returnUSD: number;
  returnBRL: number;
  portfolioValueUSD: number;
}

export interface BacktestSummaryResult {
  strategyId: string;
  strategyName: string;
  initialCapitalUSD: number;
  finalValueUSD: number;
  finalValueBRL: number;
  totalReturnPctUSD: number;
  totalReturnPctBRL: number;
  cagrPct: number;
  volatilityPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  bestYearPct: number;
  worstYearPct: number;
  positiveYearsCount: number;
  totalYearsCount: number;
  yearlyDetails: BacktestYearlyResult[];
  historicalIntegrityNotes: string[];
}
