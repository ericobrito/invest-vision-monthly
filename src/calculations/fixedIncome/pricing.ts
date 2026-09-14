/**
 * Unified pricing router for Brazilian Fixed Income Bonds
 */

import { calculateIpcaPlusPrice, simulateIpcaPlusMarkToMarket } from "./ipcaPlus";
import { calculatePrefixadoPrice, simulatePrefixadoMarkToMarket } from "./prefixado";

export type BondType = "IPCA" | "PREFIXADO";

export interface CalculateBondPriceParams {
  type: BondType;
  ratePct: number;
  yearsToMaturity: number;
  hasCoupons?: boolean;
}

export interface SimulateBondParams {
  type: BondType;
  currentRate: number;
  targetRate: number;
  yearsToMaturity: number;
  expectedIpca?: number;
  hasCoupons?: boolean;
}

export function calculateBondTheoreticalPrice(params: CalculateBondPriceParams) {
  if (params.type === "IPCA") {
    return calculateIpcaPlusPrice(params.ratePct, params.yearsToMaturity, params.hasCoupons);
  } else {
    return calculatePrefixadoPrice(params.ratePct, params.yearsToMaturity, params.hasCoupons);
  }
}

export function simulateBondRateShift(params: SimulateBondParams) {
  if (params.type === "IPCA") {
    return simulateIpcaPlusMarkToMarket({
      currentRate: params.currentRate,
      targetRate: params.targetRate,
      expectedIpca: params.expectedIpca ?? 5.0,
      yearsToMaturity: params.yearsToMaturity,
      hasCoupons: params.hasCoupons,
    });
  } else {
    return simulatePrefixadoMarkToMarket({
      currentRate: params.currentRate,
      targetRate: params.targetRate,
      yearsToMaturity: params.yearsToMaturity,
      hasCoupons: params.hasCoupons,
    });
  }
}
