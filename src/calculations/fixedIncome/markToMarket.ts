/**
 * Central engine for Fixed Income Mark-to-Market Simulation
 */

import { BondType, simulateBondRateShift, calculateBondTheoreticalPrice } from "./pricing";

export interface BondInput {
  name: string;
  type: BondType;
  buyRate: number;
  sellRate?: number;
  price: number;
  maturityDate: string | Date;
  maturityYears?: number;
  hasCoupons?: boolean;
}

export interface SimulationInput {
  bond: BondInput;
  investmentAmount: number;
  currentRate?: number;
  targetRate: number;
  expectedIpca: number; // % p.a.
  valuationDate?: string | Date;
  includeCosts?: boolean;
}

export interface SimulationResult {
  currentPrice: number;
  simulatedPrice: number;
  priceVariationPercent: number; // MtM gain/loss %
  investedAmount: number;
  estimatedGrossValue: number;
  estimatedGrossProfit: number;
  nominalReturnPercent: number;
  realReturnPercent: number;
  remainingTermYears: number;
  durationYears: number;
  targetRate: number;
  currentRate: number;
  expectedIpca: number;
  bondType: BondType;
  costsBreakdown?: {
    incomeTaxRatePct: number;
    incomeTaxAmount: number;
    custodyFeeAmount: number;
    totalCosts: number;
    netValue: number;
    netProfit: number;
    netReturnPercent: number;
  };
}

/**
 * Primary calculation function for Mark-to-Market simulation.
 */
export function simulateMarkToMarket(input: SimulationInput): SimulationResult {
  const {
    bond,
    investmentAmount,
    targetRate,
    expectedIpca,
    valuationDate = new Date(),
    includeCosts = false,
  } = input;

  const currentRate = input.currentRate != null && !isNaN(input.currentRate)
    ? input.currentRate
    : bond.buyRate;

  // Calculate remaining term in years
  const vDate = new Date(valuationDate);
  const mDate = new Date(bond.maturityDate);
  const diffTime = Math.max(0, mDate.getTime() - vDate.getTime());
  const diffDays = Math.max(1, diffTime / (1000 * 3600 * 24));
  const remainingTermYears = bond.maturityYears || Math.max(0.1, diffDays / 365.25);

  // Compute theoretical unit prices and rate shift sensitivity
  const shiftResult = simulateBondRateShift({
    type: bond.type,
    currentRate,
    targetRate,
    yearsToMaturity: remainingTermYears,
    expectedIpca,
    hasCoupons: bond.hasCoupons,
  });

  const priceVariationPercent = shiftResult.priceVariationPercent;
  const currentTheoreticalPrice = shiftResult.currentRealPrice != null
    ? shiftResult.currentRealPrice
    : (shiftResult as any).currentPrice;
  const simulatedTheoreticalPrice = shiftResult.simulatedRealPrice != null
    ? shiftResult.simulatedRealPrice
    : (shiftResult as any).simulatedPrice;

  // Real & Nominal Evolution Calculations
  const mtmMultiplier = 1 + priceVariationPercent;
  const inflationMultiplier = Math.pow(1 + expectedIpca / 100, remainingTermYears);

  let estimatedGrossValue = 0;
  if (bond.type === "IPCA") {
    // For IPCA+: MtM value shift + inflation evolution over period
    estimatedGrossValue = investmentAmount * mtmMultiplier * inflationMultiplier;
  } else {
    // For Prefixado: MtM value shift + nominal discount evolution over period
    const nominalTargetMultiplier = Math.pow(1 + targetRate / 100, remainingTermYears);
    estimatedGrossValue = investmentAmount * mtmMultiplier * nominalTargetMultiplier;
  }

  const estimatedGrossProfit = estimatedGrossValue - investmentAmount;
  const nominalReturnPercent = investmentAmount > 0 ? estimatedGrossProfit / investmentAmount : 0;

  const realReturnPercent = inflationMultiplier > 0
    ? (1 + nominalReturnPercent) / inflationMultiplier - 1
    : nominalReturnPercent;

  // Unit Price scaling
  const currentPrice = bond.price > 0 ? bond.price : currentTheoreticalPrice;
  const simulatedPrice = currentPrice * mtmMultiplier;

  // Optional Costs Breakdown
  let costsBreakdown: SimulationResult["costsBreakdown"] = undefined;
  if (includeCosts) {
    let incomeTaxRatePct = 15.0;
    if (diffDays <= 180) {
      incomeTaxRatePct = 22.5;
    } else if (diffDays <= 360) {
      incomeTaxRatePct = 20.0;
    } else if (diffDays <= 720) {
      incomeTaxRatePct = 17.5;
    } else {
      incomeTaxRatePct = 15.0;
    }

    const incomeTaxAmount = estimatedGrossProfit > 0
      ? estimatedGrossProfit * (incomeTaxRatePct / 100)
      : 0;

    // B3 Custody fee: 0.20% p.a.
    const custodyFeeAmount = investmentAmount * 0.0020 * remainingTermYears;
    const totalCosts = incomeTaxAmount + custodyFeeAmount;
    const netProfit = estimatedGrossProfit - totalCosts;
    const netValue = investmentAmount + netProfit;
    const netReturnPercent = investmentAmount > 0 ? netProfit / investmentAmount : 0;

    costsBreakdown = {
      incomeTaxRatePct,
      incomeTaxAmount,
      custodyFeeAmount,
      totalCosts,
      netValue,
      netProfit,
      netReturnPercent,
    };
  }

  return {
    currentPrice,
    simulatedPrice,
    priceVariationPercent,
    investedAmount: investmentAmount,
    estimatedGrossValue,
    estimatedGrossProfit,
    nominalReturnPercent,
    realReturnPercent,
    remainingTermYears,
    durationYears: shiftResult.modifiedDuration,
    targetRate,
    currentRate,
    expectedIpca,
    bondType: bond.type,
    costsBreakdown,
  };
}
