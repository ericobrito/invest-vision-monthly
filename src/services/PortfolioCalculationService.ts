/**
 * PortfolioCalculationService
 * --------------------------------------------------------------------------
 * SINGLE source of truth for every portfolio performance calculation.
 *
 * No component, hook, page, table or card may calculate returns
 * independently. All consumers (Portfolio Summary, Portfolio Table, Asset
 * Detail Screen, Radar, Dashboard Widgets) must obtain metrics from this
 * service.
 *
 * Derived metrics are NEVER persisted. Storage only contains:
 *   { ticker/symbol, quantity, averagePrice, currency }
 *
 * All aggregation happens in BRL using a pre-resolved FX rate provided
 * per-position. The service does not fetch FX itself — it consumes already
 * normalized inputs so it stays deterministic and side-effect free.
 */

export interface PositionMetrics {
  investedValue: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

export interface PortfolioMetrics {
  investedValue: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

export interface PositionInput {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  /** Position native currency (default BRL). */
  currency?: string;
  /** Units of BRL per 1 unit of the position currency. */
  fxRate?: number;
}

export interface InvestmentInput {
  name: string;
  mode?: "CONSOLIDATED" | "DETAILED" | "CONNECTED";
  positions?: PositionInput[];
  /** For CONSOLIDATED / CONNECTED modes when positions aren't available. */
  appliedBRL?: number;
  currentValueBRL?: number;
}

const safe = (n: number | undefined | null): number =>
  Number.isFinite(Number(n)) ? Number(n) : 0;

class PortfolioCalculationService {
  /**
   * Per-position metrics. Always computed from quantity × price.
   * `currency` parameter is informational — the returned numbers stay in
   * the position's native currency. For BRL aggregation, use
   * calculatePositionMetricsBRL().
   */
  calculatePositionMetrics(
    quantity: number,
    averagePrice: number,
    currentPrice: number,
    symbol?: string,
  ): PositionMetrics {
    const q = safe(quantity);
    const ap = safe(averagePrice);
    const cp = safe(currentPrice);
    const investedValue = q * ap;
    const currentValue = q * cp;
    const profit = currentValue - investedValue;
    const profitPercent = investedValue > 0 ? (profit / investedValue) * 100 : 0;

    // Mandatory audit log per spec.
    console.log({
      symbol,
      quantity: q,
      averagePrice: ap,
      currentPrice: cp,
      investedValue,
      currentValue,
      profit,
      profitPercent,
    });

    return { investedValue, currentValue, profit, profitPercent };
  }

  /**
   * BRL-normalized per-position metrics. Multiplies native invested /
   * current by the supplied fxRate (1 for BRL positions).
   */
  calculatePositionMetricsBRL(p: PositionInput): PositionMetrics {
    const native = this.calculatePositionMetrics(
      p.quantity,
      p.averagePrice,
      p.currentPrice,
      p.symbol,
    );
    const rate = safe(p.fxRate) > 0 ? Number(p.fxRate) : 1;
    const investedValue = native.investedValue * rate;
    const currentValue = native.currentValue * rate;
    const profit = currentValue - investedValue;
    const profitPercent = investedValue > 0 ? (profit / investedValue) * 100 : 0;
    return { investedValue, currentValue, profit, profitPercent };
  }

  /**
   * Investment-level metrics in BRL.
   * - DETAILED → sum of position BRL metrics.
   * - CONSOLIDATED / CONNECTED → use supplied appliedBRL / currentValueBRL.
   */
  calculateInvestmentMetrics(inv: InvestmentInput): PortfolioMetrics {
    const mode = inv.mode || "CONSOLIDATED";
    if (mode === "DETAILED" && inv.positions && inv.positions.length > 0) {
      let investedValue = 0;
      let currentValue = 0;
      for (const p of inv.positions) {
        const m = this.calculatePositionMetricsBRL(p);
        investedValue += m.investedValue;
        currentValue += m.currentValue;
      }
      const profit = currentValue - investedValue;
      const profitPercent = investedValue > 0 ? (profit / investedValue) * 100 : 0;
      return { investedValue, currentValue, profit, profitPercent };
    }

    const investedValue = safe(inv.appliedBRL);
    const currentValue = safe(inv.currentValueBRL);
    const profit = currentValue - investedValue;
    const profitPercent = investedValue > 0 ? (profit / investedValue) * 100 : 0;
    return { investedValue, currentValue, profit, profitPercent };
  }

  /**
   * Portfolio-level aggregation in BRL. Validates math consistency between
   * the sum of investment profits and the aggregated portfolio profit.
   */
  calculatePortfolioMetrics(investments: InvestmentInput[]): PortfolioMetrics {
    let portfolioInvestedValue = 0;
    let portfolioCurrentValue = 0;
    let sumOfInvestmentProfits = 0;

    for (const inv of investments) {
      const m = this.calculateInvestmentMetrics(inv);
      portfolioInvestedValue += m.investedValue;
      portfolioCurrentValue += m.currentValue;
      sumOfInvestmentProfits += m.profit;
    }

    const portfolioProfit = portfolioCurrentValue - portfolioInvestedValue;
    const portfolioReturnPercent =
      portfolioInvestedValue > 0 ? (portfolioProfit / portfolioInvestedValue) * 100 : 0;

    console.log({
      portfolioInvestedValue,
      portfolioCurrentValue,
      portfolioProfit,
      portfolioReturnPercent,
    });

    const difference = Math.abs(portfolioProfit - sumOfInvestmentProfits);
    if (difference > 0.01) {
      console.error("Portfolio inconsistente", {
        portfolioProfit,
        sumOfInvestmentProfits,
        difference,
      });
    }

    return {
      investedValue: portfolioInvestedValue,
      currentValue: portfolioCurrentValue,
      profit: portfolioProfit,
      profitPercent: portfolioReturnPercent,
    };
  }

  /**
   * Projected monthly income based on current asset value and annual rate.
   * FORMULA: current_value × annual_rate ÷ 12
   * This formula is ONLY used for projection/estimates, NEVER for historical realized income.
   */
  calculateProjectedMonthlyIncome(currentValueBRL: number, annualRate?: number): number {
    const val = safe(currentValueBRL);
    const rate = safe(annualRate);
    if (val <= 0 || rate <= 0) return 0;
    return (val * (rate / 100)) / 12;
  }

  /**
   * Realized monthly income from historical records.
   * Priority:
   * 1. Direct recorded realized income (`realizedIncome`)
   * 2. Undefined if no historical data is present (never fall back to projection!)
   */
  calculateRealizedMonthlyIncome(inv: { realizedIncome?: number }): number | undefined {
    if (inv.realizedIncome != null && Number.isFinite(Number(inv.realizedIncome))) {
      return Number(inv.realizedIncome);
    }
    return undefined;
  }

  /**
   * Excess return over benchmark (Prêmio de Risco e Liquidez).
   * Both sides MUST use identical historical periods and methodologies.
   * FORMULA: portfolio_realized_return - benchmark_realized_return = excess_return
   */
  calculateExcessReturn(portfolioReturnMonth: number, benchmarkReturnMonth: number): number {
    return safe(portfolioReturnMonth) - safe(benchmarkReturnMonth);
  }
}

export const portfolioCalculationService = new PortfolioCalculationService();
export default portfolioCalculationService;
