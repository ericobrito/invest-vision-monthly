import { describe, it, expect } from "vitest";
import { InvestmentNormalizationService } from "../services/InvestmentNormalizationService";

describe("InvestmentNormalizationService", () => {
  it("normalizes Avenue - Dólar correctly using canonical rules", () => {
    const rawSnapshot = { id: "snap-1", month: "2026-03", label: "Mar 2026", total: 100000 };
    const rawInvestments = [
      { id: "inv-avenue", name: "Avenue - Dólar", value: 61833.82, mode: "CONSOLIDATED", currency: "BRL" }
    ];
    const positionsByInvestment = new Map();
    const fxRates = { USD: 5.1322 };

    const snapshot = InvestmentNormalizationService.normalizeSnapshot(
      rawSnapshot,
      rawInvestments,
      positionsByInvestment,
      fxRates
    );

    const avenue = snapshot.investments.find((i) => i.name === "Avenue - Dólar");
    expect(avenue).toBeDefined();
    expect(avenue?.mode).toBe("DETAILED");
    expect(avenue?.currency).toBe("USD");
    expect(avenue?.value).toBeCloseTo(12280.27, 2);
    expect(avenue?.valueBRL).toBeCloseTo(63024.90, 1);
    expect(avenue?.positions?.length).toBe(8);

    const usdt = avenue?.positions?.find((p) => p.symbol === "USDT");
    expect(usdt?.quantity).toBe(1936.56);
  });
});
