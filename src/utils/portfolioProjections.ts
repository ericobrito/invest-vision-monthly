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

  // 3. Calculate gap and peak incorporating dynamic API peak quotes
  let totalVariablePeakGap = 0;
  const assetDetails: VariableAssetPeakDetail[] = [];

  currentActiveAssets.forEach((current, assetKey) => {
    const historicalValues = assetHistoryMap.get(assetKey) || [];

    // Calculate dynamic peak multiplier from API if available
    let peakFromApi = 0;
    const apiQuote = apiPeaksMap ? (apiPeaksMap[assetKey] || apiPeaksMap[assetKey.toUpperCase()]) : undefined;
    if (apiQuote && apiQuote.currentPrice > 0 && apiQuote.peakPrice > 0) {
      const ratio = apiQuote.peakPrice / apiQuote.currentPrice;
      if (Number.isFinite(ratio) && ratio >= 1) {
        peakFromApi = current * ratio;
      }
    }

    // Peak is the maximum of current value, historical max BRL, and dynamic API peak BRL
    const peak = Math.max(current, peakFromApi, ...historicalValues);
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
