import type { ETFMetrics } from "../types";
import { ETF_UNIVERSE } from "../universe/etfUniverseData";

export class ETFMarketDataEngine {
  private cache: Map<string, { timestamp: number; data: ETFMetrics }> = new Map();
  private cacheTtlMs = 10 * 60 * 1000; // 10 minutes cache
  private defaultFxRateBRL = 5.45;

  public async getFxRateBRL(): Promise<number> {
    try {
      // Read-only try to fetch real FX rate or fallback safely
      const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/BRL=X?interval=1d&range=1d");
      if (res.ok) {
        const json = await res.json();
        const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof price === "number" && price > 3 && price < 10) {
          return price;
        }
      }
    } catch {
      // Silently fall back to default
    }
    return this.defaultFxRateBRL;
  }

  public async getMetricsForEtf(ticker: string): Promise<ETFMetrics> {
    const uppercaseTicker = ticker.toUpperCase();
    const cached = this.cache.get(uppercaseTicker);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    const fxRate = await this.getFxRateBRL();

    // Deterministic realistic baseline seed for isolated ETF Radar metrics
    const metrics = this.calculateMockDeterministicMetrics(uppercaseTicker, fxRate);
    this.cache.set(uppercaseTicker, { timestamp: Date.now(), data: metrics });
    return metrics;
  }

  public async getAllMetrics(): Promise<ETFMetrics[]> {
    const list: ETFMetrics[] = [];
    for (const item of ETF_UNIVERSE) {
      const m = await this.getMetricsForEtf(item.ticker);
      list.push(m);
    }
    return list;
  }

  private calculateMockDeterministicMetrics(ticker: string, fxRate: number): ETFMetrics {
    // Isolated seed values per ticker for consistent analytical demonstration
    const seeds: Record<string, Partial<ETFMetrics>> = {
      SPY: {
        currentPriceUSD: 565.40, return1YPct: 24.5, return3YPct: 32.1, return5YPct: 92.4, return10YPct: 228.5,
        cagrPct: 12.6, volatilityPct: 14.2, maxDrawdownPct: -18.2, sharpeRatio: 1.45, beta: 1.00, alphaVsSp500Pct: 0.0,
        bestYearPct: 26.2, worstYearPct: -18.1, averageDailyVolumeMillionsUSD: 2850, fxEffect1YPct: 6.2
      },
      QQQ: {
        currentPriceUSD: 485.20, return1YPct: 31.2, return3YPct: 41.8, return5YPct: 138.5, return10YPct: 385.2,
        cagrPct: 17.1, volatilityPct: 19.5, maxDrawdownPct: -32.5, sharpeRatio: 1.38, beta: 1.18, alphaVsSp500Pct: 6.7,
        bestYearPct: 54.6, worstYearPct: -32.6, averageDailyVolumeMillionsUSD: 1950, fxEffect1YPct: 6.2
      },
      AIQ: {
        currentPriceUSD: 38.90, return1YPct: 38.4, return3YPct: 54.2, return5YPct: 145.8, return10YPct: 180.0,
        cagrPct: 18.5, volatilityPct: 23.4, maxDrawdownPct: -35.2, sharpeRatio: 1.22, beta: 1.35, alphaVsSp500Pct: 13.9,
        bestYearPct: 48.2, worstYearPct: -35.1, averageDailyVolumeMillionsUSD: 48.5, fxEffect1YPct: 6.2
      },
      SOXX: {
        currentPriceUSD: 235.10, return1YPct: 44.8, return3YPct: 62.4, return5YPct: 195.2, return10YPct: 520.4,
        cagrPct: 20.1, volatilityPct: 26.8, maxDrawdownPct: -37.4, sharpeRatio: 1.31, beta: 1.48, alphaVsSp500Pct: 20.3,
        bestYearPct: 68.1, worstYearPct: -36.2, averageDailyVolumeMillionsUSD: 210, fxEffect1YPct: 6.2
      },
      SMH: {
        currentPriceUSD: 252.80, return1YPct: 52.1, return3YPct: 78.4, return5YPct: 235.6, return10YPct: 610.2,
        cagrPct: 21.8, volatilityPct: 28.5, maxDrawdownPct: -39.1, sharpeRatio: 1.36, beta: 1.55, alphaVsSp500Pct: 27.6,
        bestYearPct: 72.4, worstYearPct: -35.8, averageDailyVolumeMillionsUSD: 420, fxEffect1YPct: 6.2
      },
      XLE: {
        currentPriceUSD: 91.40, return1YPct: 12.4, return3YPct: 48.6, return5YPct: 85.2, return10YPct: 45.2,
        cagrPct: 3.8, volatilityPct: 24.1, maxDrawdownPct: -54.2, sharpeRatio: 0.62, beta: 0.82, alphaVsSp500Pct: -12.1,
        bestYearPct: 64.3, worstYearPct: -36.8, averageDailyVolumeMillionsUSD: 680, fxEffect1YPct: 6.2
      },
      URA: {
        currentPriceUSD: 29.80, return1YPct: 34.2, return3YPct: 58.1, return5YPct: 165.4, return10YPct: 42.1,
        cagrPct: 3.6, volatilityPct: 31.2, maxDrawdownPct: -48.6, sharpeRatio: 0.85, beta: 1.25, alphaVsSp500Pct: 9.7,
        bestYearPct: 48.5, worstYearPct: -41.2, averageDailyVolumeMillionsUSD: 65, fxEffect1YPct: 6.2
      },
      COPX: {
        currentPriceUSD: 42.10, return1YPct: 28.6, return3YPct: 36.4, return5YPct: 112.4, return10YPct: 78.2,
        cagrPct: 5.9, volatilityPct: 27.5, maxDrawdownPct: -45.1, sharpeRatio: 0.78, beta: 1.32, alphaVsSp500Pct: 4.1,
        bestYearPct: 42.1, worstYearPct: -38.4, averageDailyVolumeMillionsUSD: 42, fxEffect1YPct: 6.2
      },
      PAVE: {
        currentPriceUSD: 39.50, return1YPct: 26.8, return3YPct: 45.2, return5YPct: 124.5, return10YPct: 140.0,
        cagrPct: 9.1, volatilityPct: 17.8, maxDrawdownPct: -24.1, sharpeRatio: 1.15, beta: 1.05, alphaVsSp500Pct: 2.3,
        bestYearPct: 34.2, worstYearPct: -19.5, averageDailyVolumeMillionsUSD: 85, fxEffect1YPct: 6.2
      },
      IHAK: {
        currentPriceUSD: 44.20, return1YPct: 22.4, return3YPct: 28.5, return5YPct: 74.2, return10YPct: 95.0,
        cagrPct: 6.9, volatilityPct: 21.2, maxDrawdownPct: -29.8, sharpeRatio: 0.92, beta: 1.12, alphaVsSp500Pct: -2.1,
        bestYearPct: 38.6, worstYearPct: -28.4, averageDailyVolumeMillionsUSD: 18, fxEffect1YPct: 6.2
      },
      XLK: {
        currentPriceUSD: 225.40, return1YPct: 29.8, return3YPct: 38.4, return5YPct: 142.1, return10YPct: 410.5,
        cagrPct: 17.7, volatilityPct: 19.8, maxDrawdownPct: -31.4, sharpeRatio: 1.32, beta: 1.20, alphaVsSp500Pct: 5.3,
        bestYearPct: 49.8, worstYearPct: -28.2, averageDailyVolumeMillionsUSD: 1250, fxEffect1YPct: 6.2
      },
      XLF: {
        currentPriceUSD: 45.80, return1YPct: 28.4, return3YPct: 29.5, return5YPct: 68.4, return10YPct: 145.2,
        cagrPct: 9.4, volatilityPct: 16.5, maxDrawdownPct: -22.4, sharpeRatio: 1.25, beta: 0.98, alphaVsSp500Pct: 3.9,
        bestYearPct: 32.1, worstYearPct: -18.6, averageDailyVolumeMillionsUSD: 1100, fxEffect1YPct: 6.2
      },
      XLV: {
        currentPriceUSD: 148.60, return1YPct: 14.2, return3YPct: 18.5, return5YPct: 48.2, return10YPct: 135.8,
        cagrPct: 8.9, volatilityPct: 12.8, maxDrawdownPct: -14.8, sharpeRatio: 1.10, beta: 0.72, alphaVsSp500Pct: -10.3,
        bestYearPct: 22.4, worstYearPct: -11.5, averageDailyVolumeMillionsUSD: 720, fxEffect1YPct: 6.2
      },
      XLI: {
        currentPriceUSD: 132.50, return1YPct: 23.4, return3YPct: 34.2, return5YPct: 78.5, return10YPct: 165.4,
        cagrPct: 10.2, volatilityPct: 15.9, maxDrawdownPct: -21.5, sharpeRatio: 1.28, beta: 1.02, alphaVsSp500Pct: -1.1,
        bestYearPct: 28.4, worstYearPct: -14.2, averageDailyVolumeMillionsUSD: 410, fxEffect1YPct: 6.2
      },
      XLB: {
        currentPriceUSD: 92.10, return1YPct: 16.5, return3YPct: 21.4, return5YPct: 56.2, return10YPct: 118.5,
        cagrPct: 8.1, volatilityPct: 18.4, maxDrawdownPct: -25.2, sharpeRatio: 0.95, beta: 1.08, alphaVsSp500Pct: -8.0,
        bestYearPct: 24.5, worstYearPct: -18.4, averageDailyVolumeMillionsUSD: 180, fxEffect1YPct: 6.2
      },
    };

    const s = seeds[ticker] || {
      currentPriceUSD: 100.0, return1YPct: 15.0, return3YPct: 25.0, return5YPct: 50.0, return10YPct: 120.0,
      cagrPct: 8.2, volatilityPct: 18.0, maxDrawdownPct: -22.0, sharpeRatio: 1.0, beta: 1.0, alphaVsSp500Pct: 0.0,
      bestYearPct: 25.0, worstYearPct: -15.0, averageDailyVolumeMillionsUSD: 100, fxEffect1YPct: 6.2
    };

    const priceBRL = s.currentPriceUSD! * fxRate;
    const return1YBRLPct = ((1 + s.return1YPct! / 100) * (1 + s.fxEffect1YPct! / 100) - 1) * 100;

    return {
      ticker,
      currentPriceUSD: s.currentPriceUSD!,
      priceBRL,
      fxRateBRL: fxRate,
      return1YPct: s.return1YPct!,
      return3YPct: s.return3YPct!,
      return5YPct: s.return5YPct!,
      return10YPct: s.return10YPct!,
      cagrPct: s.cagrPct!,
      volatilityPct: s.volatilityPct!,
      maxDrawdownPct: s.maxDrawdownPct!,
      sharpeRatio: s.sharpeRatio!,
      beta: s.beta!,
      alphaVsSp500Pct: s.alphaVsSp500Pct!,
      bestYearPct: s.bestYearPct!,
      worstYearPct: s.worstYearPct!,
      averageDailyVolumeMillionsUSD: s.averageDailyVolumeMillionsUSD!,
      fxEffect1YPct: s.fxEffect1YPct!,
      return1YBRLPct,
    };
  }
}

export const etfMarketDataEngine = new ETFMarketDataEngine();
export default etfMarketDataEngine;
