import type { MonthlySnapshot } from "@/data/investments";
import { CANONICAL_INVESTMENT_RULES } from "@/config/investmentRegistry";

function inferIncomeType(name: string): "fixed" | "variable" {
  const n = (name || "").toLowerCase();
  if (
    n.includes("ações") || n.includes("fii") || n.includes("bitcoin") ||
    n.includes("cripto") || n.includes("bybit") || n.includes("binance") ||
    n.includes("coinbase") || n.includes("dólar") || n.includes("avenue") ||
    n.includes("robo")
  ) {
    return "variable";
  }
  return "fixed";
}

export interface VariableAssetPeakDetail {
  name: string;
  current: number;
  peak: number;
  gap: number;
}

export interface PeakProjectionResult {
  projectedTotalAtPeak: number;
  totalVariablePeakGap: number;
  projectedGainPct: number;
  assetDetails: VariableAssetPeakDetail[];
}

export interface ApiPeakQuote {
  currentPrice: number;
  peakPrice: number;
  currency?: string;
}

const KNOWN_ATH_MAP: Record<string, number> = {
  "BTC": 126198.07,
  "BTC-USD": 126198.07,
  "BITCOIN": 126198.07,
  "ETH": 4953.73,
  "ETH-USD": 4953.73,
  "ETHEREUM": 4953.73,
  "SOL": 294.33,
  "SOL-USD": 294.33,
  "USDT": 1.0,
  "USDC": 1.0,
  "TSLA": 498.83,
  "GOOGL": 408.61,
  "GOOG": 408.61,
  "META": 796.25,
  "AMD": 584.73,
  "IONQ": 84.64,
  "BRK-B": 542.07,
  "BRK.B": 542.07,
  "RGTI": 58.15,
  "NVDA": 140.76,
};

const KNOWN_CURRENT_PRICE_MAP: Record<string, number> = {
  "BTC": 64000.0,
  "BTC-USD": 64000.0,
  "BITCOIN": 64000.0,
  "ETH": 2600.0,
  "ETH-USD": 2600.0,
  "ETHEREUM": 2600.0,
  "SOL": 180.0,
  "SOL-USD": 180.0,
  "TSLA": 250.0,
  "META": 520.0,
  "GOOGL": 178.0,
  "GOOG": 178.0,
  "AMD": 155.0,
  "IONQ": 10.5,
  "BRK-B": 460.0,
  "BRK.B": 460.0,
  "RGTI": 1.5,
  "NVDA": 118.0,
};

function getAssetAsymmetryRatio(key: string, apiQuote?: ApiPeakQuote): number {
  if (apiQuote && apiQuote.currentPrice > 0 && apiQuote.peakPrice > 0) {
    const ratio = apiQuote.peakPrice / apiQuote.currentPrice;
    if (Number.isFinite(ratio) && ratio >= 1) return ratio;
  }

  const k = key.toUpperCase().trim();
  const ath = KNOWN_ATH_MAP[k] || 0;
  const curr = KNOWN_CURRENT_PRICE_MAP[k] || 0;
  if (ath > 0 && curr > 0) {
    return Math.max(1, ath / curr);
  }

  if (k.includes("BITCOIN") || k.includes("CRIPTO") || k.includes("BYBIT") || k.includes("BINANCE")) {
    return Math.max(1, KNOWN_ATH_MAP["BTC"] / KNOWN_CURRENT_PRICE_MAP["BTC"]);
  }

  return 1;
}

export function calculateVariablePeakProjection(
  allSnapshots: MonthlySnapshot[],
  apiPeaksMap?: Record<string, ApiPeakQuote>
): PeakProjectionResult {
  if (!allSnapshots || allSnapshots.length === 0) {
    return { projectedTotalAtPeak: 0, totalVariablePeakGap: 0, projectedGainPct: 0, assetDetails: [] };
  }

  const latestSnapshot = allSnapshots[allSnapshots.length - 1];
  const currentTotal = latestSnapshot.total;

  // 1. Identify active variable assets/positions currently held in the latest snapshot (current > 0)
  const currentActiveAssets = new Map<string, number>();

  latestSnapshot.investments.forEach((inv) => {
    let positions = inv.positions;
    const rule = CANONICAL_INVESTMENT_RULES.find((r) => r.match(inv.name));
    if ((!positions || positions.length === 0) && rule) {
      positions = rule.getCanonicalPositions({});
    }

    if (positions && positions.length > 0) {
      positions.forEach((p) => {
        const sym = (p.symbol || p.name || "").toUpperCase().trim();
        if (!sym || sym === "USDT" || sym === "USDC") return;

        const fx = p.fxRate || (p.currency === "USD" ? 5.45 : 1);
        const valBRL = p.currentValueBRL ?? p.currentValue * fx;
        if (valBRL > 0) {
          const prev = currentActiveAssets.get(sym) || 0;
          currentActiveAssets.set(sym, prev + valBRL);
        }
      });
    } else {
      const isVariable = inv.incomeType === "variable" || inferIncomeType(inv.name) === "variable";
      if (isVariable) {
        const key = inv.name.trim();
        const valBRL = inv.valueBRL ?? (inv.currency === "USD" ? inv.value * 5.45 : inv.value);
        if (valBRL > 0) {
          const prev = currentActiveAssets.get(key) || 0;
          currentActiveAssets.set(key, prev + valBRL);
        }
      }
    }
  });

  // 2. Track historical values across all snapshots ONLY for currently active assets
  const assetHistoryMap = new Map<string, number[]>();

  allSnapshots.forEach((snap) => {
    snap.investments.forEach((inv) => {
      let positions = inv.positions;
      const rule = CANONICAL_INVESTMENT_RULES.find((r) => r.match(inv.name));
      if ((!positions || positions.length === 0) && rule) {
        positions = rule.getCanonicalPositions({});
      }

      if (positions && positions.length > 0) {
        positions.forEach((p) => {
          const sym = (p.symbol || p.name || "").toUpperCase().trim();
          if (!currentActiveAssets.has(sym)) return;

          const fx = p.fxRate || (p.currency === "USD" ? 5.45 : 1);
          const valBRL = p.currentValueBRL ?? p.currentValue * fx;
          const list = assetHistoryMap.get(sym) || [];
          list.push(valBRL);
          assetHistoryMap.set(sym, list);
        });
      } else {
        const key = inv.name.trim();
        if (currentActiveAssets.has(key)) {
          const valBRL = inv.valueBRL ?? (inv.currency === "USD" ? inv.value * 5.45 : inv.value);
          const list = assetHistoryMap.get(key) || [];
          list.push(valBRL);
          assetHistoryMap.set(key, list);
        }
      }
    });
  });

  // 3. Calculate gap and peak incorporating ATH asymmetry ratio
  let totalVariablePeakGap = 0;
  const assetDetails: VariableAssetPeakDetail[] = [];

  currentActiveAssets.forEach((current, assetKey) => {
    const historicalValues = assetHistoryMap.get(assetKey) || [];
    const apiQuote = apiPeaksMap ? (apiPeaksMap[assetKey] || apiPeaksMap[assetKey.toUpperCase()]) : undefined;

    const asymmetryRatio = getAssetAsymmetryRatio(assetKey, apiQuote);
    const peakFromAsymmetry = current * asymmetryRatio;

    // Peak is the maximum of current value, historical max BRL, and ATH asymmetry peak BRL
    const peak = Math.max(current, peakFromAsymmetry, ...historicalValues);
    const gap = Math.max(0, peak - current);

    assetDetails.push({ name: assetKey, current, peak, gap });
    totalVariablePeakGap += gap;
  });

  // Sort: assets with gap first (highest gap top), then assets at peak
  assetDetails.sort((a, b) => {
    if (b.gap !== a.gap) return b.gap - a.gap;
    return b.current - a.current;
  });

  const projectedTotalAtPeak = currentTotal + totalVariablePeakGap;
  const projectedGainPct = currentTotal > 0 ? (totalVariablePeakGap / currentTotal) * 100 : 0;

  return {
    projectedTotalAtPeak,
    totalVariablePeakGap,
    projectedGainPct,
    assetDetails,
  };
}

/**
 * Calculates portfolio annualized return (CAGR) based on active window (Jan 2024 to present/snapshot date)
 */
export function calculateActivePortfolioCAGR(
  finalValue: number,
  appliedValue: number,
  startDateStr = "2024-01-01",
  endDateStr?: string
): number {
  if (!appliedValue || appliedValue <= 0 || !finalValue || finalValue <= 0) return 0;

  const startDate = new Date(startDateStr);
  const endDate = endDateStr ? new Date(endDateStr) : new Date();

  const diffDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const years = diffDays / 365.25;

  if (years <= 0) return 0;

  const cagr = Math.pow(finalValue / appliedValue, 1 / years) - 1;
  return cagr * 100;
}
