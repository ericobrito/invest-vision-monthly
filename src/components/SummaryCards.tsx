import { TrendingUp, TrendingDown, Wallet, PieChart, Globe, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBRL, formatPercent, type MonthlySnapshot } from "@/data/investments";

interface SummaryCardsProps {
  snapshot: MonthlySnapshot;
}

const SummaryCards = ({ snapshot }: SummaryCardsProps) => {
  const { t } = useTranslation();
  const isPositive = snapshot.change && snapshot.change.value >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total */}
      <div className="gradient-card rounded-xl border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-2">
          <Wallet className="w-4 h-4 shrink-0" />
          {t("summary.totalWealth")}
        </div>
        <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{formatBRL(snapshot.total)}</p>
      </div>

      {/* Change */}
      <div className="gradient-card rounded-xl border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-2">
          {isPositive ? <TrendingUp className="w-4 h-4 shrink-0" /> : <TrendingDown className="w-4 h-4 shrink-0" />}
          {t("summary.monthlyChange")}
        </div>
        {snapshot.change ? (
          <>
            <p className={`text-xl sm:text-2xl font-bold tracking-tight ${isPositive ? "text-positive" : "text-negative"}`}>
              {formatPercent(snapshot.change.percentage)}
            </p>
            <p className={`text-xs sm:text-sm mt-1 font-medium ${isPositive ? "text-positive" : "text-negative"}`}>
              {formatBRL(snapshot.change.value)}
            </p>
          </>
        ) : (
          <p className="text-lg text-muted-foreground">—</p>
        )}
      </div>

      {/* Fixed vs Variable */}
      <div className="gradient-card rounded-xl border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-2 min-w-0">
          <PieChart className="w-4 h-4 shrink-0" />
          <span className="truncate">{t("summary.fixedVsVariable")}</span>
        </div>
        {snapshot.fixedIncome ? (
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-foreground">{t("summary.fixed")}</span>
                <span className="text-primary font-medium">{snapshot.fixedIncome.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary mt-1">
                <div className="h-full rounded-full bg-primary" style={{ width: `${snapshot.fixedIncome}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-foreground">{t("summary.variable")}</span>
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
      <div className="gradient-card rounded-xl border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-2 min-w-0">
          <Globe className="w-4 h-4 shrink-0" />
          <span className="truncate">{t("summary.brazilVsExterior")}</span>
        </div>
        {snapshot.brazil ? (
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-foreground flex items-center gap-1"><Home className="w-3 h-3 shrink-0" /> {t("summary.brazil")}</span>
                <span className="text-primary font-medium">{snapshot.brazil.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary mt-1">
                <div className="h-full rounded-full bg-primary" style={{ width: `${snapshot.brazil}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-foreground flex items-center gap-1"><Globe className="w-3 h-3 shrink-0" /> {t("summary.exterior")}</span>
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
