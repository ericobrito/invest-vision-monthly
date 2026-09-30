import { describe, it, expect } from "vitest";
import portfolioCalculationService from "@/services/PortfolioCalculationService";

describe("PortfolioCalculationService", () => {
  it("deve calcular métricas da posição em BRL respeitando fxRate e valores pre-calculados", () => {
    const metrics = portfolioCalculationService.calculatePositionMetricsBRL({
      symbol: "USDT",
      quantity: 1542.91,
      averagePrice: 1.0,
      currentPrice: 1.0,
      currency: "USD",
      fxRate: 5.1322,
      currentValueBRL: 7917.57,
      appliedAmountBRL: 7917.57,
    });

    expect(metrics.currentValue).toBeCloseTo(7917.57, 2);
    expect(metrics.investedValue).toBeCloseTo(7917.57, 2);
    expect(metrics.profit).toBeCloseTo(0, 2);
    expect(metrics.profitPercent).toBeCloseTo(0, 2);
  });

  it("deve somar corretamente posições em USD (TSLA, META, USDT) no total do investimento", () => {
    const avenueInv = {
      name: "Avenue - Dólar",
      mode: "DETAILED" as const,
      positions: [
        {
          symbol: "TSLA",
          quantity: 14.0829,
          averagePrice: 319.69,
          currentPrice: 380.12,
          currency: "USD",
          fxRate: 5.1322,
          currentValueBRL: 27473.65,
          appliedAmountBRL: 23106.09,
        },
        {
          symbol: "META",
          quantity: 2.9699,
          averagePrice: 210.52,
          currentPrice: 744.1,
          currency: "USD",
          fxRate: 5.1322,
          currentValueBRL: 11341.66,
          appliedAmountBRL: 3208.75,
        },
        {
          symbol: "USDT",
          quantity: 1542.91,
          averagePrice: 1.0,
          currentPrice: 1.0,
          currency: "USD",
          fxRate: 5.1322,
          currentValueBRL: 7917.57,
          appliedAmountBRL: 7917.57,
        },
      ],
    };

    const metrics = portfolioCalculationService.calculateInvestmentMetrics(avenueInv);

    expect(metrics.currentValue).toBeCloseTo(27473.65 + 11341.66 + 7917.57, 2);
    expect(metrics.investedValue).toBeCloseTo(23106.09 + 3208.75 + 7917.57, 2);
    expect(metrics.profit).toBeGreaterThan(0);
  });

  it("deve validar a consistência do portfólio consolidado sem divergências", () => {
    const portfolioMetrics = portfolioCalculationService.calculatePortfolioMetrics([
      {
        name: "Avenue - Dólar",
        mode: "DETAILED",
        positions: [
          {
            symbol: "USDT",
            quantity: 1000,
            averagePrice: 1,
            currentPrice: 1,
            currency: "USD",
            fxRate: 5.5,
            currentValueBRL: 5500,
            appliedAmountBRL: 5500,
          },
        ],
      },
      {
        name: "NuBank - Reserva",
        mode: "CONSOLIDATED",
        currentValueBRL: 10000,
        appliedBRL: 10000,
      },
    ]);

    expect(portfolioMetrics.currentValue).toBe(15500);
    expect(portfolioMetrics.investedValue).toBe(15500);
    expect(portfolioMetrics.profit).toBe(0);
  });
});
