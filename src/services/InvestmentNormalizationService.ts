import type { MonthlySnapshot, Investment, Position, IncomeType, Region, InvestmentMode } from "@/data/investments";
import { resolveInvestmentTotals } from "@/data/investments";
import { findCanonicalRule } from "@/config/investmentRegistry";
import type { FxRates } from "@/lib/fx";

function inferIncomeType(name: string, explicitType?: string): IncomeType {
  if (explicitType === "fixed" || explicitType === "variable") return explicitType;
  const n = (name || "").toLowerCase();
  if (
    n.includes("ações") || n.includes("fii") || n.includes("bitcoin") ||
    n.includes("cripto") || n.includes("bybit") || n.includes("binance") ||
    n.includes("coinbase") || n.includes("dólar") || n.includes("avenue") ||
    n.includes("robo")
  ) {
    return "variable";
  }
  return "fixed";
}

function inferRegion(name: string, explicitRegion?: string): Region {
  if (explicitRegion === "brazil" || explicitRegion === "exterior") return explicitRegion;
  const n = (name || "").toLowerCase();
  if (
    n.includes("dólar") || n.includes("avenue") || n.includes("bitcoin") ||
    n.includes("cripto") || n.includes("bybit") || n.includes("binance") ||
    n.includes("coinbase") || n.includes("exterior")
  ) {
    return "exterior";
  }
  return "brazil";
}

export class InvestmentNormalizationService {
  /**
   * Normalizes a raw snapshot and its raw DB investments into a canonical MonthlySnapshot.
   */
  static normalizeSnapshot(
    snapshotRow: any,
    rawInvestments: any[],
    positionsByInvestment: Map<string, Position[]>,
    fxRates: FxRates
  ): MonthlySnapshot {
    const sortedInvestments = [...rawInvestments].sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );

    const mappedInvestments: Investment[] = sortedInvestments.map((inv: any): Investment => {
      let positions = positionsByInvestment.get(inv.id);
      const rule = findCanonicalRule(inv.name);

      let mode = (inv.mode as InvestmentMode) || "CONSOLIDATED";
      if (rule?.forcedMode) {
        mode = rule.forcedMode;
      }

      // Check if positions should be overridden by canonical registry
      const hasValidPositions = positions && positions.length > 0 && (!rule?.isPositionValid || rule.isPositionValid(positions));

      if (!hasValidPositions && rule) {
        positions = rule.getCanonicalPositions(fxRates, Number(inv.value));
      } else if (!positions && (mode === "DETAILED" || mode === "CONNECTED")) {
        positions = [];
      }

      const isForeignPos = positions?.some((p) => (p.currency || "BRL").toUpperCase() !== "BRL");
      const invCurrency = rule?.forcedCurrency ?? (
        inv.currency && inv.currency.toUpperCase() !== "BRL"
          ? inv.currency.toUpperCase()
          : (isForeignPos ? "USD" : "BRL")
      );

      const totals = resolveInvestmentTotals(
        {
          mode,
          value: Number(inv.value),
          applied: inv.applied != null ? Number(inv.applied) : undefined,
          positions,
          currency: invCurrency,
        },
        undefined,
        fxRates
      );

      const incomeType = inferIncomeType(inv.name, inv.income_type);
      const region = inferRegion(inv.name, inv.region);
      const annualRateVal = inv.annual_rate != null ? Number(inv.annual_rate) : inv.annual_return != null ? Number(inv.annual_return) : undefined;

      return {
        id: inv.id,
        name: inv.name,
        value: totals.value,
        valueBRL: totals.valueBRL,
        appliedBRL: totals.appliedBRL,
        currency: invCurrency,
        percentage: Number(inv.percentage || 0),
        applied: totals.applied,
        totalReturn: inv.total_return != null ? Number(inv.total_return) : undefined,
        annualReturn: annualRateVal,
        annualRate: annualRateVal,
        rateType: inv.rate_type ?? undefined,
        rateSource: inv.rate_source ?? undefined,
        realizedIncome: inv.realized_income != null ? Number(inv.realized_income) : undefined,
        realizedReturn: inv.realized_return != null ? Number(inv.realized_return) : undefined,
        realizedReturnPercent: inv.realized_return_percent != null ? Number(inv.realized_return_percent) : undefined,
        period: inv.period ?? snapshotRow.month,
        benchmark: inv.benchmark ?? undefined,
        benchmarkReturn: inv.benchmark_return != null ? Number(inv.benchmark_return) : undefined,
        benchmarkReturnPercent: inv.benchmark_return_percent != null ? Number(inv.benchmark_return_percent) : undefined,
        yearStarted: inv.year_started ? (inv.year_started.length === 4 ? `${inv.year_started}-01-01` : inv.year_started) : undefined,
        incomeType,
        region,
        flags: {
          includeInVariablePositions: inv.include_in_variable_positions === true,
        },
        mode,
        institution: inv.institution ?? undefined,
        connectionId: inv.connection_id ?? undefined,
        positions,
        valueMode: (inv.value_mode as any) || "MANUAL",
        linkedAsset: inv.linked_provider && inv.linked_symbol
          ? { provider: inv.linked_provider, symbol: inv.linked_symbol }
          : undefined,
        quantity: inv.quantity != null ? Number(inv.quantity) : undefined,
        averagePrice: inv.average_price != null ? Number(inv.average_price) : undefined,
        currentPrice: inv.current_price != null ? Number(inv.current_price) : undefined,
        investedAmount: inv.invested_amount != null ? Number(inv.invested_amount) : undefined,
        lastPriceAt: inv.last_price_at ?? undefined,
      };
    });

    const totalBRL = mappedInvestments.reduce((s, i) => s + (i.valueBRL ?? i.value), 0);
    const fixedBRL = mappedInvestments
      .filter((i) => i.incomeType === "fixed")
      .reduce((s, i) => s + (i.valueBRL ?? i.value), 0);
    const variableBRL = totalBRL - fixedBRL;

    const brazilBRL = mappedInvestments
      .filter((i) => i.region === "brazil")
      .reduce((s, i) => s + (i.valueBRL ?? i.value), 0);
    const exteriorBRL = totalBRL - brazilBRL;

    const derivedFixedIncome = totalBRL > 0 ? (fixedBRL / totalBRL) * 100 : undefined;
    const derivedVariableIncome = totalBRL > 0 ? (variableBRL / totalBRL) * 100 : undefined;
    const derivedBrazil = totalBRL > 0 ? (brazilBRL / totalBRL) * 100 : undefined;
    const derivedExterior = totalBRL > 0 ? (exteriorBRL / totalBRL) * 100 : undefined;

    return {
      id: snapshotRow.id,
      month: snapshotRow.month,
      label: snapshotRow.label,
      total: totalBRL,
      investments: mappedInvestments,
      fixedIncome: derivedFixedIncome ?? (snapshotRow.fixed_income != null ? Number(snapshotRow.fixed_income) : undefined),
      variableIncome: derivedVariableIncome ?? (snapshotRow.variable_income != null ? Number(snapshotRow.variable_income) : undefined),
      brazil: derivedBrazil ?? (snapshotRow.brazil != null ? Number(snapshotRow.brazil) : undefined),
      exterior: derivedExterior ?? (snapshotRow.exterior != null ? Number(snapshotRow.exterior) : undefined),
      change: snapshotRow.change_value != null && snapshotRow.change_percentage != null
        ? { value: Number(snapshotRow.change_value), percentage: Number(snapshotRow.change_percentage) }
        : undefined,
      growth2025: snapshotRow.growth2025 != null ? Number(snapshotRow.growth2025) : undefined,
      createdAt: snapshotRow.created_at ?? undefined,
      updatedAt: snapshotRow.updated_at ?? undefined,
      portfolioRealizedIncome: snapshotRow.portfolio_realized_income != null ? Number(snapshotRow.portfolio_realized_income) : undefined,
      portfolioProjectedIncome: snapshotRow.portfolio_projected_income != null ? Number(snapshotRow.portfolio_projected_income) : undefined,
      benchmarkRealizedReturn: snapshotRow.benchmark_realized_return != null ? Number(snapshotRow.benchmark_realized_return) : undefined,
      excessReturnVsBenchmark: snapshotRow.excess_return_vs_benchmark != null ? Number(snapshotRow.excess_return_vs_benchmark) : undefined,
      cdiRate: snapshotRow.cdi_rate != null ? Number(snapshotRow.cdi_rate) : undefined,
      ipcaRate: snapshotRow.ipca_rate != null ? Number(snapshotRow.ipca_rate) : undefined,
    };
  }
}
