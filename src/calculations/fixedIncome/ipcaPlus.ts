/**
 * Calculation formulas for Tesouro IPCA+ (NTN-B Principal & NTN-B with coupons)
 */

export interface CalculateIpcaPlusParams {
  currentRate: number; // e.g. 7.70 (%)
  targetRate: number; // e.g. 5.00 (%)
  expectedIpca: number; // e.g. 5.00 (% p.a.)
  yearsToMaturity: number;
  hasCoupons?: boolean;
}

export interface IpcaPlusPricingResult {
  currentRealPrice: number;
  simulatedRealPrice: number;
  priceVariationPercent: number; // Mark-to-market shift
  macaulayDuration: number;
  modifiedDuration: number;
}

/**
 * Calculates the theoretical real unit price (PU) per R$ 1,000 face value of an IPCA+ bond.
 * PU_real(r) = 1000 / (1 + r)^t
 */
export function calculateIpcaPlusPrice(
  ratePct: number,
  yearsToMaturity: number,
  hasCoupons: boolean = false
): { price: number; macaulayDuration: number; modifiedDuration: number } {
  const r = ratePct / 100;
  if (yearsToMaturity <= 0) {
    return { price: 1000, macaulayDuration: 0, modifiedDuration: 0 };
  }

  if (!hasCoupons) {
    // NTN-B Principal (no coupons)
    const price = 1000 / Math.pow(1 + r, yearsToMaturity);
    const macaulayDuration = yearsToMaturity;
    const modifiedDuration = yearsToMaturity / (1 + r);
    return { price, macaulayDuration, modifiedDuration };
  } else {
    // NTN-B with semiannual coupons (coupon = 6% p.a. effective, i.e. (1.06)^0.5 - 1 per period)
    const semiannualRate = Math.pow(1 + r, 0.5) - 1;
    const semiannualCouponRate = Math.pow(1.06, 0.5) - 1; // ~2.9563% per 6 months
    const numPeriods = Math.max(1, Math.round(yearsToMaturity * 2));
    const couponVal = 1000 * semiannualCouponRate;

    let price = 0;
    let weightedTimeSum = 0;

    for (let k = 1; k <= numPeriods; k++) {
      const tYears = k / 2;
      const df = Math.pow(1 + semiannualRate, k);
      const couponPV = couponVal / df;
      price += couponPV;
      weightedTimeSum += tYears * couponPV;
    }

    const principalPV = 1000 / Math.pow(1 + semiannualRate, numPeriods);
    price += principalPV;
    weightedTimeSum += yearsToMaturity * principalPV;

    const macaulayDuration = price > 0 ? weightedTimeSum / price : yearsToMaturity;
    const modifiedDuration = macaulayDuration / (1 + semiannualRate);

    return { price, macaulayDuration, modifiedDuration };
  }
}

/**
 * Calculates IPCA+ Mark-to-Market price variation when rate changes from currentRate to targetRate
 */
export function simulateIpcaPlusMarkToMarket(
  params: CalculateIpcaPlusParams
): IpcaPlusPricingResult {
  const { currentRate, targetRate, yearsToMaturity, hasCoupons = false } = params;

  const current = calculateIpcaPlusPrice(currentRate, yearsToMaturity, hasCoupons);
  const simulated = calculateIpcaPlusPrice(targetRate, yearsToMaturity, hasCoupons);

  const priceVariationPercent =
    current.price > 0 ? (simulated.price - current.price) / current.price : 0;

  return {
    currentRealPrice: current.price,
    simulatedRealPrice: simulated.price,
    priceVariationPercent,
    macaulayDuration: current.macaulayDuration,
    modifiedDuration: current.modifiedDuration,
  };
}
