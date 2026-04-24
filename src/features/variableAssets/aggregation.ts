import type {
  Position,
  AggregatedPosition,
  CategoryValidation,
  ValidationStatus,
} from "./types";

/** Aggregate raw positions by ticker (merges manual + aggregator). */
export function aggregatePositions(positions: Position[]): AggregatedPosition[] {
  const map = new Map<string, AggregatedPosition>();
  for (const p of positions) {
    const key = p.ticker.toUpperCase();
    const existing = map.get(key);
    if (existing) {
      existing.totalValue += p.currentValue;
      existing.totalQuantity += p.quantity;
      if (!existing.sources.includes(p.broker)) existing.sources.push(p.broker);
      existing.positionIds.push(p.id);
    } else {
      map.set(key, {
        ticker: key,
        assetType: p.assetType,
        totalValue: p.currentValue,
        totalQuantity: p.quantity,
        sources: [p.broker],
        positionIds: [p.id],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
}

function statusFromDelta(delta: number): ValidationStatus {
  const abs = Math.abs(delta);
  if (abs < 5) return "matched";
  if (abs <= 20) return "warning";
  return "error";
}

/** Compare crypto totals only (per spec). */
export function validateCrypto(
  monthlyCrypto: number,
  aggregated: AggregatedPosition[],
): CategoryValidation {
  const aggCrypto = aggregated
    .filter((a) => a.assetType === "crypto")
    .reduce((s, a) => s + a.totalValue, 0);

  if (monthlyCrypto <= 0) {
    return {
      monthlyTotal: 0,
      aggregatedTotal: aggCrypto,
      delta: 0,
      status: "no-reference",
    };
  }

  const delta = ((aggCrypto - monthlyCrypto) / monthlyCrypto) * 100;
  return {
    monthlyTotal: monthlyCrypto,
    aggregatedTotal: aggCrypto,
    delta,
    status: statusFromDelta(delta),
  };
}
