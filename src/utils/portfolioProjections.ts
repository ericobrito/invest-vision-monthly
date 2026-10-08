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

export function calculateVariablePeakProjection(allSnapshots: MonthlySnapshot[]): PeakProjectionResult {
  if (!allSnapshots || allSnapshots.length === 0) {
    return { projectedTotalAtPeak: 0, totalVariablePeakGap: 0, projectedGainPct: 0, assetDetails: [] };
  }

  const latestSnapshot = allSnapshots[allSnapshots.length - 1];
  const currentTotal = latestSnapshot.total;

  // Track historical peaks for every variable asset/position across all snapshots
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
          // Skip cash / stablecoins like USDT if not considered variable risk asset
          if (!sym || sym === "USDT" || sym === "USDC") return;

          const fx = p.fxRate || (p.currency === "USD" ? 5.1322 : 1);
          const valBRL = p.currentValueBRL ?? p.currentValue * fx;

          const list = assetHistoryMap.get(sym) || [];
          list.push(valBRL);
          assetHistoryMap.set(sym, list);
        });
      } else {
        const isVariable = inv.incomeType === "variable" || inferIncomeType(inv.name) === "variable";
        if (isVariable) {
          const key = inv.name.trim();
          const valBRL = inv.valueBRL ?? (inv.currency === "USD" ? inv.value * 5.45 : inv.value);
          const list = assetHistoryMap.get(key) || [];
          list.push(valBRL);
          assetHistoryMap.set(key, list);
        }
      }
    });
  });

  // Calculate gaps for assets present in the current portfolio vs their historical peak
  let totalVariablePeakGap = 0;
  const assetDetails: VariableAssetPeakDetail[] = [];

  assetHistoryMap.forEach((values, assetKey) => {
    const peak = Math.max(...values);
    // Find current value in latest snapshot
    let current = 0;
    latestSnapshot.investments.forEach((inv) => {
      let positions = inv.positions;
      const rule = CANONICAL_INVESTMENT_RULES.find((r) => r.match(inv.name));
      if ((!positions || positions.length === 0) && rule) {
        positions = rule.getCanonicalPositions({});
      }

      if (positions && positions.length > 0) {
        positions.forEach((p) => {
          const sym = (p.symbol || p.name || "").toUpperCase().trim();
          if (sym === assetKey) {
            const fx = p.fxRate || (p.currency === "USD" ? 5.1322 : 1);
            current += p.currentValueBRL ?? p.currentValue * fx;
          }
        });
      } else if (inv.name.trim() === assetKey) {
        current += inv.valueBRL ?? (inv.currency === "USD" ? inv.value * 5.45 : inv.value);
      }
    });

    const gap = Math.max(0, peak - current);
    if (gap > 0 || current > 0) {
      assetDetails.push({ name: assetKey, current, peak, gap });
      totalVariablePeakGap += gap;
    }
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
