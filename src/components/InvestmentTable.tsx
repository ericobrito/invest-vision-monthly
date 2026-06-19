import { formatBRL, formatCurrency, CHART_COLORS, type MonthlySnapshot, type Investment } from "@/data/investments";
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portfolioCalculationService } from "@/services/PortfolioCalculationService";


type SortKey = "percentage" | "value" | "name" | "applied" | "totalReturn" | "annualReturn";
type SortDir = "asc" | "desc";

interface InvestmentTableProps {
  snapshot: MonthlySnapshot;
  onEditInvestment?: (investment: Investment) => void;
  onDetailInvestment?: (investment: Investment) => void;
}

const InvestmentTable = ({ snapshot, onEditInvestment, onDetailInvestment }: InvestmentTableProps) => {
  const showActions = Boolean(onEditInvestment || onDetailInvestment);
  const hasApplied = snapshot.investments.some(i => i.applied !== undefined);
  const hasAnnualReturn = snapshot.investments.some(i => i.annualReturn !== undefined);

  // Per-investment metrics derived ONCE via the centralized service.
  const metricsByName = useMemo(() => {
    const map = new Map<string, ReturnType<typeof portfolioCalculationService.calculateInvestmentMetrics>>();
    for (const inv of snapshot.investments) {
      map.set(
        inv.name,
        portfolioCalculationService.calculateInvestmentMetrics({
          name: inv.name,
          mode: inv.mode || "CONSOLIDATED",
          positions: (inv.positions ?? []).map((p) => ({
            symbol: p.symbol,
            quantity: p.quantity,
            averagePrice: p.averagePrice,
            currentPrice: p.currentPrice,
            currency: p.currency,
            fxRate: p.fxRate ?? 1,
          })),
          appliedBRL: inv.appliedBRL ?? inv.applied,
          currentValueBRL: inv.valueBRL ?? inv.value,
        }),
      );
    }
    return map;
  }, [snapshot.investments]);

  // Derived display value: stored totalReturn is treated as legacy fallback
  // for rows without applied / positions. Anything with invested capital
  // must use the service result.
  const displayedTotalReturn = (inv: Investment): number | undefined => {
    const m = metricsByName.get(inv.name);
    if (m && m.investedValue > 0) return m.profitPercent;
    return inv.totalReturn;
  };

  // Single-source-of-truth BRL value for each row (from PortfolioCalculationService).
  const brlValueOf = (inv: Investment): number => {
    const m = metricsByName.get(inv.name);
    if (m && m.currentValue > 0) return m.currentValue;
    return inv.valueBRL ?? inv.value;
  };
  // Single-source-of-truth BRL applied value (from PortfolioCalculationService).
  const brlAppliedOf = (inv: Investment): number | undefined => {
    const m = metricsByName.get(inv.name);
    if (m && m.investedValue > 0) return m.investedValue;
    return inv.appliedBRL ?? inv.applied;
  };
  const isForeign = (inv: Investment): boolean => {
    const c = (inv.currency || "BRL").toUpperCase();
    if (c !== "BRL") return true;
    return Boolean(inv.positions?.some((p) => (p.currency || "BRL").toUpperCase() !== "BRL"));
  };
  const nativeCurrencyOf = (inv: Investment): string => {
    if (inv.currency && inv.currency.toUpperCase() !== "BRL") return inv.currency.toUpperCase();
    const fp = inv.positions?.find((p) => (p.currency || "BRL").toUpperCase() !== "BRL");
    return (fp?.currency || "BRL").toUpperCase();
  };

  // Mandatory audit log per spec — one entry per row.
  for (const inv of snapshot.investments) {
    const nativeCurrency = nativeCurrencyOf(inv);
    const nativeValue = inv.value;
    const nativeAppliedValue = inv.applied;
    const totalValueBRL = brlValueOf(inv);
    const appliedValueBRL = brlAppliedOf(inv);
    const returnPercentage =
      appliedValueBRL && appliedValueBRL > 0
        ? ((totalValueBRL - appliedValueBRL) / appliedValueBRL) * 100
        : undefined;
    const exchangeRate = nativeValue > 0 ? totalValueBRL / nativeValue : 1;
    console.log({
      investmentName: inv.name,
      nativeCurrency,
      nativeValue,
      nativeAppliedValue,
      appliedValueBRL,
      currentValueBRL: totalValueBRL,
      returnPercentage,
      exchangeRate,
    });
    console.log({
      portfolioId: inv.id ?? inv.name,
      portfolioAppliedBRL: appliedValueBRL,
      portfolioCurrentValueBRL: totalValueBRL,
    });
  }

  const [sortKey, setSortKey] = useState<SortKey>("percentage");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedInvestments = useMemo(() => {
    const list = [...snapshot.investments];
    list.sort((a, b) => {
      let va: number, vb: number;
      switch (sortKey) {
        case "name": {
          const cmp = a.name.localeCompare(b.name);
          return sortDir === "asc" ? cmp : -cmp;
        }
        case "value": va = brlValueOf(a); vb = brlValueOf(b); break;
        case "percentage": va = a.percentage; vb = b.percentage; break;
        case "applied": va = brlAppliedOf(a) ?? 0; vb = brlAppliedOf(b) ?? 0; break;
        case "totalReturn": va = displayedTotalReturn(a) ?? -Infinity; vb = displayedTotalReturn(b) ?? -Infinity; break;
        case "annualReturn": va = a.annualReturn ?? -Infinity; vb = b.annualReturn ?? -Infinity; break;
        default: va = a.percentage; vb = b.percentage;
      }
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return list;
  }, [snapshot.investments, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40 inline" />;
    return sortDir === "desc"
      ? <ArrowDown className="w-3 h-3 ml-1 inline" />
      : <ArrowUp className="w-3 h-3 ml-1 inline" />;
  };

  // Map original index for color consistency
  const originalOrder = snapshot.investments.map(i => i.name);

  // Portfolio totals via PortfolioCalculationService (single source of truth).
  const portfolio = portfolioCalculationService.calculatePortfolioMetrics(
    snapshot.investments.map((inv) => ({
      name: inv.name,
      mode: inv.mode || "CONSOLIDATED",
      positions: (inv.positions ?? []).map((p) => ({
        symbol: p.symbol,
        quantity: p.quantity,
        averagePrice: p.averagePrice,
        currentPrice: p.currentPrice,
        currency: p.currency,
        fxRate: p.fxRate ?? 1,
      })),
      appliedBRL: inv.appliedBRL ?? inv.applied,
      currentValueBRL: inv.valueBRL ?? inv.value,
    })),
  );
  const totalApplied = portfolio.investedValue > 0
    ? portfolio.investedValue
    : snapshot.investments.reduce((s, i) => s + (i.applied ?? 0), 0);
  const totalValue = portfolio.currentValue > 0 ? portfolio.currentValue : snapshot.total;
  const overallTotalReturn = totalApplied > 0 ? portfolio.profitPercent : undefined;

  const oldestYear = snapshot.investments
    .filter(i => i.yearStarted)
    .map(i => i.yearStarted!)
    .sort()[0];
  let overallAnnualReturn: number | undefined;
  if (oldestYear && totalApplied > 0 && totalValue > 0) {
    const startDate = new Date(oldestYear.length === 4 ? `${oldestYear}-01-01` : oldestYear);
    const years = (new Date().getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (years > 0) {
      overallAnnualReturn = (Math.pow(totalValue / totalApplied, 1 / years) - 1) * 100;
    }
  }

  return (
    <div className="gradient-card rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Detalhamento dos Investimentos</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-4 font-medium cursor-pointer select-none" onClick={() => handleSort("name")}>
                Investimento <SortIcon col="name" />
              </th>
              <th className="text-right p-4 font-medium cursor-pointer select-none" onClick={() => handleSort("value")}>
                Valor <SortIcon col="value" />
              </th>
              <th className="text-right p-4 font-medium cursor-pointer select-none" onClick={() => handleSort("percentage")}>
                % <SortIcon col="percentage" />
              </th>
              {hasApplied && (
                <>
                  <th className="text-right p-4 font-medium cursor-pointer select-none" onClick={() => handleSort("applied")}>
                    Aplicado <SortIcon col="applied" />
                  </th>
                  <th className="text-right p-4 font-medium cursor-pointer select-none" onClick={() => handleSort("totalReturn")}>
                    Rent. Total <SortIcon col="totalReturn" />
                  </th>
                </>
              )}
              {hasAnnualReturn && (
                <th className="text-right p-4 font-medium cursor-pointer select-none" onClick={() => handleSort("annualReturn")}>
                  Rent. Anual <SortIcon col="annualReturn" />
                </th>
              )}
              {showActions && (
                <th className="w-1 p-4"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedInvestments.map((inv) => {
              const originalIndex = originalOrder.indexOf(inv.name);
              return (
              <tr key={inv.name} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[originalIndex % CHART_COLORS.length] }}
                    />
                    <span className="text-foreground font-medium">{inv.name}</span>
                    {inv.mode === "DETAILED" && (
                      <Layers className="w-3 h-3 text-accent-foreground shrink-0" aria-label="Detalhado" />
                    )}
                    {inv.mode === "CONNECTED" && (
                      <Zap className="w-3 h-3 text-primary shrink-0" aria-label="Conectado" />
                    )}
                    {(!inv.mode || inv.mode === "CONSOLIDATED") && inv.valueMode === "AUTO" && (
                      <Zap className="w-3 h-3 text-primary shrink-0" aria-label="Automático" />
                    )}
                  </div>

                </td>
                <td className="text-right p-4 text-foreground font-mono">
                  {isForeign(inv) ? (
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(inv.value, nativeCurrencyOf(inv))}
                      </span>
                      <span>{formatBRL(brlValueOf(inv))}</span>
                    </div>
                  ) : (
                    formatBRL(brlValueOf(inv))
                  )}
                </td>
                <td className="text-right p-4 text-muted-foreground font-mono">{inv.percentage.toFixed(2)}%</td>
                {hasApplied && (
                  <>
                    <td className="text-right p-4 text-muted-foreground font-mono">
                      {(() => {
                        const appliedBRL = brlAppliedOf(inv);
                        if (appliedBRL === undefined) return "—";
                        if (isForeign(inv) && inv.applied !== undefined) {
                          return (
                            <div className="flex flex-col items-end leading-tight">
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(inv.applied, nativeCurrencyOf(inv))}
                              </span>
                              <span className="text-foreground">{formatBRL(appliedBRL)}</span>
                            </div>
                          );
                        }
                        return formatBRL(appliedBRL);
                      })()}
                    </td>
                    {(() => {
                      const tr = displayedTotalReturn(inv);
                      return (
                        <td className={`text-right p-4 font-mono ${
                          tr !== undefined
                            ? tr >= 0 ? "text-positive" : "text-negative"
                            : "text-muted-foreground"
                        }`}>
                          {tr !== undefined ? `${tr >= 0 ? "+" : ""}${tr.toFixed(2)}%` : "—"}
                        </td>
                      );
                    })()}
                  </>
                )}
                {hasAnnualReturn && (
                  <td className={`text-right p-4 font-mono ${
                    inv.annualReturn !== undefined
                      ? inv.annualReturn >= 0 ? "text-positive" : "text-negative"
                      : "text-muted-foreground"
                  }`}>
                    {inv.annualReturn !== undefined ? `${inv.annualReturn >= 0 ? "+" : ""}${inv.annualReturn.toFixed(2)}%` : "—"}
                  </td>
                )}
                {showActions && (
                  <td className="p-4 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1">
                      {onDetailInvestment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onDetailInvestment(inv)}
                        >
                          Detalhar
                        </Button>
                      )}
                      {onEditInvestment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onEditInvestment(inv)}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
              );
            })}
            {/* Total row */}
            <tr className="bg-secondary/20 font-semibold">
              <td className="p-4 text-foreground">Total</td>
              <td className="text-right p-4 text-foreground font-mono">{formatBRL(totalValue)}</td>
              <td className="text-right p-4 text-muted-foreground">100%</td>
              {hasApplied && (
                <>
                  <td className="text-right p-4 text-foreground font-mono">{formatBRL(totalApplied)}</td>
                  <td className={`text-right p-4 font-mono ${
                    overallTotalReturn !== undefined
                      ? overallTotalReturn >= 0 ? "text-positive" : "text-negative"
                      : "text-muted-foreground"
                  }`}>
                    {overallTotalReturn !== undefined ? `${overallTotalReturn >= 0 ? "+" : ""}${overallTotalReturn.toFixed(2)}%` : "—"}
                  </td>
                </>
              )}
              {hasAnnualReturn && (
                <td className={`text-right p-4 font-mono ${
                  overallAnnualReturn !== undefined
                    ? overallAnnualReturn >= 0 ? "text-positive" : "text-negative"
                    : "text-muted-foreground"
                }`}>
                  {overallAnnualReturn !== undefined ? `${overallAnnualReturn >= 0 ? "+" : ""}${overallAnnualReturn.toFixed(2)}%` : "—"}
                </td>
              )}
              {showActions && <td className="p-4"></td>}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvestmentTable;
