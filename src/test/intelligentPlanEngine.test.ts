import { describe, it, expect } from "vitest";
import intelligentPlanEngine, {
  DEFAULT_PLAN_CONFIG,
  type StockPositionInput,
} from "@/features/intelligentPlan/intelligentPlanEngine";

describe("IntelligentPlanEngine", () => {
  const mockPositions: StockPositionInput[] = [
    {
      symbol: "TSLA",
      name: "Tesla Inc",
      category: "Ação EUA",
      quantity: 14.0829,
      averagePrice: 319.69,
      currentPrice: 380.12,
      currency: "USD",
      fxRate: 5.1322,
      currentValueBRL: 27473.65,
      appliedAmountBRL: 23106.09,
    },
    {
      symbol: "USDT",
      name: "Tether USDt USD",
      category: "Criptoativo",
      quantity: 1542.91,
      averagePrice: 1.0,
      currentPrice: 1.0,
      currency: "USD",
      fxRate: 5.1322,
      currentValueBRL: 7917.57,
      appliedAmountBRL: 7917.57,
    },
  ];

  it("deve incluir o USDT no valor total da Renda Variável e no Caixa de Oportunidades", () => {
    const analysis = intelligentPlanEngine.analyzeVariableIncomePortfolio(
      mockPositions,
      DEFAULT_PLAN_CONFIG,
      { nubankCashBRL: 10000 }
    );

    // Total de Renda Variável deve incluir o valor do USDT (27473.65 + 7917.57 = 35391.22)
    expect(analysis.variableMetrics.currentValue).toBeCloseTo(35391.22, 2);

    // Caixa de Oportunidades deve contabilizar o USDT como stablecoinCashBRL
    expect(analysis.opportunityCash.stablecoinCashBRL).toBeCloseTo(7917.57, 2);
    expect(analysis.opportunityCash.nubankCashBRL).toBe(10000);
  });

  it("deve gerar diagnósticos com peso percentual correto para cada ativo", () => {
    const analysis = intelligentPlanEngine.analyzeVariableIncomePortfolio(
      mockPositions,
      DEFAULT_PLAN_CONFIG
    );

    const tslaDiag = analysis.diagnostics.find((d) => d.symbol === "TSLA");
    const usdtDiag = analysis.diagnostics.find((d) => d.symbol === "USDT");

    expect(tslaDiag).toBeDefined();
    expect(usdtDiag).toBeDefined();

    // Peso do TSLA = (27473.65 / 35391.22) * 100 ~ 77.6%
    expect(tslaDiag?.currentWeightPct).toBeGreaterThan(70);
    // Peso do USDT = (7917.57 / 35391.22) * 100 ~ 22.3%
    expect(usdtDiag?.currentWeightPct).toBeGreaterThan(20);
  });
});
