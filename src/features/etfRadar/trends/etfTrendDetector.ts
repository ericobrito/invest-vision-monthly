import type { ETFMetrics, ETFTrendSignal } from "../types";
import { getEtfDefinition } from "../universe/etfUniverseData";

export function detectEtfTrend(metrics: ETFMetrics): ETFTrendSignal {
  const def = getEtfDefinition(metrics.ticker);
  const theme = def?.theme ?? "Tendência Geral";

  // Short term (3-12 months): evaluated via 1Y return and 1Y momentum vs baseline
  let shortTermTrend: ETFTrendSignal["shortTermTrend"] = "NEUTRAL";
  if (metrics.return1YPct > 20) {
    shortTermTrend = "BULLISH";
  } else if (metrics.return1YPct < 5) {
    shortTermTrend = "BEARISH";
  }

  // Medium term (1-3 years): evaluated via 3Y return & Sharpe ratio
  let mediumTermTrend: ETFTrendSignal["mediumTermTrend"] = "NEUTRAL";
  if (metrics.return3YPct > 35 && metrics.sharpeRatio >= 1.0) {
    mediumTermTrend = "BULLISH";
  } else if (metrics.return3YPct < 10) {
    mediumTermTrend = "BEARISH";
  }

  // Long term (3-10+ years): evaluated via 5Y/10Y returns & CAGR
  let longTermTrend: ETFTrendSignal["longTermTrend"] = "NEUTRAL";
  if (metrics.cagrPct >= 12 && metrics.return5YPct >= 70) {
    longTermTrend = "BULLISH";
  } else if (metrics.cagrPct < 5) {
    longTermTrend = "BEARISH";
  }

  // Alignment Score: Higher when Short, Medium, Long term signals agree in direction
  let bullishCount = 0;
  let bearishCount = 0;

  if (shortTermTrend === "BULLISH") bullishCount++;
  if (mediumTermTrend === "BULLISH") bullishCount++;
  if (longTermTrend === "BULLISH") bullishCount++;

  if (shortTermTrend === "BEARISH") bearishCount++;
  if (mediumTermTrend === "BEARISH") bearishCount++;
  if (longTermTrend === "BEARISH") bearishCount++;

  let alignmentScore = 50;
  if (bullishCount === 3) alignmentScore = 95;
  else if (bullishCount === 2) alignmentScore = 78;
  else if (bearishCount === 3) alignmentScore = 15;
  else if (bearishCount === 2) alignmentScore = 32;

  // Driver summary narrative generator
  let driverSummary = "";
  if (bullishCount >= 2) {
    driverSummary = `Forte impulso estrutural alimentado por expansão no setor de ${theme} e força relativa com Alpha de ${metrics.alphaVsSp500Pct.toFixed(1)}% vs S&P 500.`;
  } else if (bearishCount >= 2) {
    driverSummary = `Pressão de correção ou fraqueza de médio prazo, com volatilidade de ${metrics.volatilityPct}% e Drawdown Máximo de ${metrics.maxDrawdownPct}%.`;
  } else {
    driverSummary = `Desempenho moderado e equilibrado, apresentando CAGR de ${metrics.cagrPct}% ao ano com boa liquidez diária.`;
  }

  return {
    ticker: metrics.ticker,
    theme,
    shortTermTrend,
    mediumTermTrend,
    longTermTrend,
    alignmentScore,
    driverSummary,
  };
}

export function detectAllEtfTrends(metricsList: ETFMetrics[]): ETFTrendSignal[] {
  return metricsList.map(detectEtfTrend);
}
