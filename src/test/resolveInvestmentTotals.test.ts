import { describe, it, expect } from "vitest";
import { resolveInvestmentTotals } from "@/data/investments";

describe("resolveInvestmentTotals", () => {
  it("deve somar todas as posições em BRL para uma conta detalhada ou conectada com USDT", () => {
    const inv = {
      mode: "DETAILED" as const,
      value: 0,
      positions: [
        {
          symbol: "USDT",
          quantity: 1542.91,
          averagePrice: 1.0,
          currentPrice: 1.0,
          appliedAmount: 1542.72,
          currentValue: 1542.72,
          currentValueBRL: 7917.57,
          appliedAmountBRL: 7917.57,
          currency: "USD",
          fxRate: 5.1322,
        },
        {
          symbol: "TSLA",
          quantity: 14.0829,
          averagePrice: 319.69,
          currentPrice: 380.12,
          appliedAmount: 4502.18,
          currentValue: 5353.19,
          currentValueBRL: 27473.65,
          appliedAmountBRL: 23106.09,
          currency: "USD",
          fxRate: 5.1322,
        },
      ],
    };

    const totals = resolveInvestmentTotals(inv);

    expect(totals.valueBRL).toBeCloseTo(7917.57 + 27473.65, 2);
    expect(totals.appliedBRL).toBeCloseTo(7917.57 + 23106.09, 2);
    expect(totals.value).toBeCloseTo(1542.72 + 5353.19, 2);
  });
});
