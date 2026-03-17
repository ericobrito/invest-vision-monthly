import { formatBRL, CHART_COLORS, type MonthlySnapshot, type Investment } from "@/data/investments";
import { useState, useMemo } from "react";
import { Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortKey = "percentage" | "value" | "name" | "applied" | "totalReturn" | "annualReturn";
type SortDir = "asc" | "desc";

interface InvestmentTableProps {
  snapshot: MonthlySnapshot;
  onEditInvestment?: (investment: Investment) => void;
}

const InvestmentTable = ({ snapshot, onEditInvestment }: InvestmentTableProps) => {
  const hasApplied = snapshot.investments.some(i => i.applied !== undefined);
  const hasAnnualReturn = snapshot.investments.some(i => i.annualReturn !== undefined);
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
        case "value": va = a.value; vb = b.value; break;
        case "percentage": va = a.percentage; vb = b.percentage; break;
        case "applied": va = a.applied ?? 0; vb = b.applied ?? 0; break;
        case "totalReturn": va = a.totalReturn ?? -Infinity; vb = b.totalReturn ?? -Infinity; break;
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

  // Totals
  const totalApplied = snapshot.investments.reduce((s, i) => s + (i.applied ?? 0), 0);
  const totalValue = snapshot.total;

  // Overall total return using oldest yearStarted
  const oldestYear = snapshot.investments
    .filter(i => i.yearStarted)
    .map(i => i.yearStarted!)
    .sort()[0];

  const overallTotalReturn = totalApplied > 0
    ? ((totalValue - totalApplied) / totalApplied) * 100
    : undefined;

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
                  <th className="text-right p-4 font-medium">Aplicado</th>
                  <th className="text-right p-4 font-medium">Rent. Total</th>
                </>
              )}
              {hasAnnualReturn && (
                <th className="text-right p-4 font-medium">Rent. Anual</th>
              )}
              {onEditInvestment && (
                <th className="w-10 p-4"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {snapshot.investments.map((inv, index) => (
              <tr key={inv.name} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-foreground font-medium">{inv.name}</span>
                  </div>
                </td>
                <td className="text-right p-4 text-foreground font-mono">{formatBRL(inv.value)}</td>
                <td className="text-right p-4 text-muted-foreground font-mono">{inv.percentage.toFixed(2)}%</td>
                {hasApplied && (
                  <>
                    <td className="text-right p-4 text-muted-foreground font-mono">
                      {inv.applied !== undefined ? formatBRL(inv.applied) : "—"}
                    </td>
                    <td className={`text-right p-4 font-mono ${
                      inv.totalReturn !== undefined
                        ? inv.totalReturn >= 0 ? "text-positive" : "text-negative"
                        : "text-muted-foreground"
                    }`}>
                      {inv.totalReturn !== undefined ? `${inv.totalReturn >= 0 ? "+" : ""}${inv.totalReturn.toFixed(2)}%` : "—"}
                    </td>
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
                {onEditInvestment && (
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEditInvestment(inv)}
                      title="Editar investimento"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-secondary/20 font-semibold">
              <td className="p-4 text-foreground">Total</td>
              <td className="text-right p-4 text-foreground font-mono">{formatBRL(snapshot.total)}</td>
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
              {onEditInvestment && <td className="p-4"></td>}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvestmentTable;
