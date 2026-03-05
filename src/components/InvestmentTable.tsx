import { formatBRL, CHART_COLORS, type MonthlySnapshot } from "@/data/investments";

interface InvestmentTableProps {
  snapshot: MonthlySnapshot;
}

const InvestmentTable = ({ snapshot }: InvestmentTableProps) => {
  const hasApplied = snapshot.investments.some(i => i.applied !== undefined);

  return (
    <div className="gradient-card rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Detalhamento dos Investimentos</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-4 font-medium">Investimento</th>
              <th className="text-right p-4 font-medium">Valor</th>
              <th className="text-right p-4 font-medium">%</th>
              {hasApplied && (
                <>
                  <th className="text-right p-4 font-medium">Aplicado</th>
                  <th className="text-right p-4 font-medium">Rent. Total</th>
                </>
              )}
              {snapshot.investments.some(i => i.annualReturn !== undefined) && (
                <th className="text-right p-4 font-medium">Rent. Anual</th>
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
                {snapshot.investments.some(i => i.annualReturn !== undefined) && (
                  <td className={`text-right p-4 font-mono ${
                    inv.annualReturn !== undefined
                      ? inv.annualReturn >= 0 ? "text-positive" : "text-negative"
                      : "text-muted-foreground"
                  }`}>
                    {inv.annualReturn !== undefined ? `${inv.annualReturn >= 0 ? "+" : ""}${inv.annualReturn.toFixed(2)}%` : "—"}
                  </td>
                )}
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-secondary/20 font-semibold">
              <td className="p-4 text-foreground">Total</td>
              <td className="text-right p-4 text-foreground font-mono">{formatBRL(snapshot.total)}</td>
              <td className="text-right p-4 text-muted-foreground">100%</td>
              {hasApplied && <td colSpan={2} />}
              {snapshot.investments.some(i => i.annualReturn !== undefined) && <td />}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvestmentTable;
