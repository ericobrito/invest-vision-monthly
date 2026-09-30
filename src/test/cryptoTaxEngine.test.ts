import { describe, it, expect } from "vitest";
import { CryptoTaxEngine } from "@/features/cryptoAccounting/cryptoTaxEngine";
import type { CryptoDisposal } from "@/features/cryptoAccounting/types";

describe("CryptoTaxEngine", () => {
  const engine = new CryptoTaxEngine();

  it("deve aplicar isenção de R$ 35.000 para vendas cripto nacionais no mês", () => {
    const disposals: CryptoDisposal[] = [
      {
        id: "1",
        dateTime: "2026-09-10T10:00:00Z",
        exchange: "Binance",
        asset: "BTC",
        grossProceedsBRL: 20000,
        gainLossBRL: 5000,
        taxRegime: "NATIONAL",
        isExempt: true,
      },
      {
        id: "2",
        dateTime: "2026-09-15T14:00:00Z",
        exchange: "Mercado Bitcoin",
        asset: "ETH",
        grossProceedsBRL: 10000,
        gainLossBRL: 2000,
        taxRegime: "NATIONAL",
        isExempt: true,
      },
    ];

    const summary = engine.calculateMonthlySummary("2026-09", disposals);

    expect(summary.nationalDisposalsBRL).toBe(30000);
    expect(summary.nationalRemainingLimitBRL).toBe(5000);
    expect(summary.nationalEstimatedTaxBRL).toBe(0);
  });

  it("deve calcular imposto devido quando as vendas superam o limite de R$ 35.000", () => {
    const disposals: CryptoDisposal[] = [
      {
        id: "1",
        dateTime: "2026-09-10T10:00:00Z",
        exchange: "Binance",
        asset: "BTC",
        grossProceedsBRL: 40000,
        gainLossBRL: 10000,
        taxRegime: "NATIONAL",
        isExempt: false,
      },
    ];

    const summary = engine.calculateMonthlySummary("2026-09", disposals);

    expect(summary.nationalDisposalsBRL).toBe(40000);
    expect(summary.nationalEstimatedTaxBRL).toBe(1500); // 15% sobre o ganho de R$ 10.000
  });
});
