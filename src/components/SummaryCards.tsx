import { TrendingUp, TrendingDown, Wallet, PieChart, Globe, Home } from "lucide-react";
import { formatBRL, formatPercent, type MonthlySnapshot } from "@/data/investments";

interface SummaryCardsProps {
  snapshot: MonthlySnapshot;
}

const SummaryCards = ({ snapshot }: SummaryCardsProps) => {
  const isPositive = snapshot.change && snapshot.change.value >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total */}
      <div className="gradient-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <Wallet className="w-4 h-4" />
          Patrimônio Total
        </div>
        <p className="text-2xl font-bold text-foreground">{formatBRL(snapshot.total)}</p>
      </div>

      {/* Change */}
      <div className="gradient-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          Variação Mensal
        </div>
        {snapshot.change ? (
          <>
            <p className={`text-2xl font-bold ${isPositive ? "text-positive" : "text-negative"}`}>
              {formatPercent(snapshot.change.percentage)}
            </p>
            <p className={`text-sm mt-1 ${isPositive ? "text-positive" : "text-negative"}`}>
              {formatBRL(snapshot.change.value)}
            </p>
          </>
        ) : (
          <p className="text-lg text-muted-foreground">—</p>
        )}
      </div>

      {/* Fixed vs Variable */}
      <div className="gradient-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <PieChart className="w-4 h-4" />
          Renda Fixa / Variável
        </div>
        {snapshot.fixedIncome ? (
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground">Fixa</span>
                <span className="text-primary font-medium">{snapshot.fixedIncome.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary mt-1">
                <div className="h-full rounded-full bg-primary" style={{ width: `${snapshot.fixedIncome}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground">Variável</span>
                <span className="text-accent-foreground font-medium">{snapshot.variableIncome?.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary mt-1">
                <div className="h-full rounded-full bg-accent" style={{ width: `${snapshot.variableIncome}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-lg text-muted-foreground">—</p>
        )}
      </div>

      {/* Brazil vs Exterior */}
      <div className="gradient-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <Globe className="w-4 h-4" />
          Brasil / Exterior
        </div>
        {snapshot.brazil ? (
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground flex items-center gap-1"><Home className="w-3 h-3" /> Brasil</span>
                <span className="text-primary font-medium">{snapshot.brazil.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary mt-1">
                <div className="h-full rounded-full bg-primary" style={{ width: `${snapshot.brazil}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> Exterior</span>
                <span className="text-accent-foreground font-medium">{snapshot.exterior?.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary mt-1">
                <div className="h-full rounded-full bg-accent" style={{ width: `${snapshot.exterior}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-lg text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
};

export default SummaryCards;
