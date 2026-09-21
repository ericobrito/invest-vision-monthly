import type { ETFMetrics, ETFScoreBreakdown } from "../types";
import { getEtfDefinition } from "../universe/etfUniverseData";

export function calculateEtfScore(metrics: ETFMetrics): ETFScoreBreakdown {
  const def = getEtfDefinition(metrics.ticker);

  // 1. Momentum (25% weight): evaluate 1Y and 3Y returns
  const momentumRaw = (metrics.return1YPct * 0.7) + (metrics.return3YPct / 3 * 0.3);
  const momentumScore = Math.max(0, Math.min(100, (momentumRaw + 10) * 1.8));

  // 2. Relative Performance (20% weight): Alpha vs S&P 500
  const alphaRaw = metrics.alphaVsSp500Pct;
  const relativePerfScore = Math.max(0, Math.min(100, 50 + (alphaRaw * 2.5)));

  // 3. Structural Growth (15% weight): 5Y/10Y CAGR and structural theme factor
  const structuralGrowthRaw = metrics.cagrPct;
  const structuralGrowthScore = Math.max(0, Math.min(100, structuralGrowthRaw * 5.0));

  // 4. Quality (10% weight): Sharpe ratio & top holdings concentration stability
  const qualityScore = Math.max(0, Math.min(100, metrics.sharpeRatio * 55));

  // 5. Valuation (10% weight): Expense ratio and pullback opportunity
  const expenseRatio = def?.expenseRatioPct ?? 0.35;
  const valuationScore = Math.max(0, Math.min(100, 100 - (expenseRatio * 80) + (Math.abs(metrics.maxDrawdownPct) < 25 ? 20 : 0)));

  // 6. Risk / Drawdown (10% weight): Lower volatility and max drawdown
  const riskRaw = 100 - (metrics.volatilityPct * 2.0) - (Math.abs(metrics.maxDrawdownPct) * 0.8);
  const riskDrawdownScore = Math.max(0, Math.min(100, riskRaw));

  // 7. Diversification (5% weight): Holdings count & top 5 concentration
  const holdingsCount = def?.holdingsCount ?? 50;
  const diversificationScore = Math.max(0, Math.min(100, Math.min(100, holdingsCount * 1.2)));

  // 8. Liquidity (5% weight): AUM & Average Daily Volume
  const volumeUSD = metrics.averageDailyVolumeMillionsUSD;
  const liquidityScore = Math.max(0, Math.min(100, volumeUSD >= 200 ? 100 : volumeUSD * 0.5));

  // Weighted Total ETF Score (0 - 100)
  const totalScore = Math.round(
    momentumScore * 0.25 +
    relativePerfScore * 0.20 +
    structuralGrowthScore * 0.15 +
    qualityScore * 0.10 +
    valuationScore * 0.10 +
    riskDrawdownScore * 0.10 +
    diversificationScore * 0.05 +
    liquidityScore * 0.05
  );

  const clampedTotal = Math.max(0, Math.min(100, totalScore));

  let status: ETFScoreBreakdown["status"] = "NEUTRAL";
  if (clampedTotal >= 78) status = "STRONG_BUY";
  else if (clampedTotal >= 65) status = "ACCUMULATE";
  else if (clampedTotal >= 45) status = "NEUTRAL";
  else status = "UNDERPERFORM";

  return {
    ticker: metrics.ticker,
    totalScore: clampedTotal,
    momentumScore: Math.round(momentumScore),
    relativePerfScore: Math.round(relativePerfScore),
    structuralGrowthScore: Math.round(structuralGrowthScore),
    qualityScore: Math.round(qualityScore),
    valuationScore: Math.round(valuationScore),
    riskDrawdownScore: Math.round(riskDrawdownScore),
    diversificationScore: Math.round(diversificationScore),
    liquidityScore: Math.round(liquidityScore),
    status,
  };
}
