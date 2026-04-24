import type {
  Position,
  AggregatedPosition,
  ValidationResult,
  ValidationStatus,
  CategoryValidation,
} from "./types";

/**
 * Aggregate raw positions by ticker.
 * This is the ONLY dataset the UI/decisions should consume.
 */
export function aggregatePositions(positions: Position[]): AggregatedPosition[] {
  const map = new Map<string, AggregatedPosition>();

  for (const p of positions) {
    const key = p.ticker.toUpperCase();
    const existing = map.get(key);
    if (existing) {
      existing.totalValue += p.currentValue;
      existing.totalQuantity += p.quantity;
      if (!existing.sources.includes(p.broker)) {
        existing.sources.push(p.broker);
      }
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

function compare(monthlyTotal: number, aggregatedTotal: number): CategoryValidation {
  const base = monthlyTotal > 0 ? monthlyTotal : aggregatedTotal;
  const delta = base > 0 ? ((aggregatedTotal - monthlyTotal) / base) * 100 : 0;
  return {
    monthlyTotal,
    aggregatedTotal,
    delta,
    status: statusFromDelta(delta),
  };
}

export function validateAgainstMonthly(
  monthly: { equities: number; crypto: number },
  aggregated: AggregatedPosition[]
): ValidationResult {
  const aggEquities = aggregated
    .filter((a) => a.assetType === "equity")
    .reduce((s, a) => s + a.totalValue, 0);
  const aggCrypto = aggregated
    .filter((a) => a.assetType === "crypto")
    .reduce((s, a) => s + a.totalValue, 0);

  const equities = compare(monthly.equities, aggEquities);
  const crypto = compare(monthly.crypto, aggCrypto);

  const worst: ValidationStatus = [equities.status, crypto.status].includes("error")
    ? "error"
    : [equities.status, crypto.status].includes("warning")
      ? "warning"
      : "matched";

  return { equities, crypto, overall: worst };
}
