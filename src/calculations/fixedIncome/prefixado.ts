/**
 * Calculation formulas for Tesouro Prefixado (LTN & NTN-F with coupons)
 */

export interface CalculatePrefixadoParams {
  currentRate: number; // e.g. 12.00 (%)
  targetRate: number; // e.g. 10.00 (%)
  yearsToMaturity: number;
  hasCoupons?: boolean;
}

export interface PrefixadoPricingResult {
  currentPrice: number;
  simulatedPrice: number;
  priceVariationPercent: number; // Mark-to-market shift
  macaulayDuration: number;
  modifiedDuration: number;
}

/**
 * Calculates the theoretical unit price (PU) per R$ 1,000 face value of a Prefixado bond.
 * PU(r) = 1000 / (1 + r)^t
 */
export function calculatePrefixadoPrice(
  ratePct: number,
  yearsToMaturity: number,
  hasCoupons: boolean = false
): { price: number; macaulayDuration: number; modifiedDuration: number } {
  const r = ratePct / 100;
  if (yearsToMaturity <= 0) {
    return { price: 1000, macaulayDuration: 0, modifiedDuration: 0 };
  }

  if (!hasCoupons) {
    // LTN (no coupons)
    const price = 1000 / Math.pow(1 + r, yearsToMaturity);
    const macaulayDuration = yearsToMaturity;
    const modifiedDuration = yearsToMaturity / (1 + r);
    return { price, macaulayDuration, modifiedDuration };
  } else {
    // NTN-F with semiannual coupons (10% p.a. nominal = R$ 50.00 per semiannual period)
    const semiannualRate = Math.pow(1 + r, 0.5) - 1;
    const numPeriods = Math.max(1, Math.round(yearsToMaturity * 2));
    const couponVal = 50; // R$ 50.00 per period per R$ 1,000 face value

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
 * Calculates Prefixado Mark-to-Market price variation when rate changes from currentRate to targetRate
 */
export function simulatePrefixadoMarkToMarket(
  params: CalculatePrefixadoParams
): PrefixadoPricingResult {
  const { currentRate, targetRate, yearsToMaturity, hasCoupons = false } = params;

  const current = calculatePrefixadoPrice(currentRate, yearsToMaturity, hasCoupons);
  const simulated = calculatePrefixadoPrice(targetRate, yearsToMaturity, hasCoupons);

  const priceVariationPercent =
    current.price > 0 ? (simulated.price - current.price) / current.price : 0;

  return {
    currentPrice: current.price,
    simulatedPrice: simulated.price,
    priceVariationPercent,
    macaulayDuration: current.macaulayDuration,
    modifiedDuration: current.modifiedDuration,
  };
}
