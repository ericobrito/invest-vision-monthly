import { TrendingUp, TrendingDown, Wallet, PieChart, Globe, Home, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBRL, formatPercent, type MonthlySnapshot } from "@/data/investments";

interface SummaryCardsProps {
  snapshot: MonthlySnapshot;
}

const SummaryCards = ({ snapshot }: SummaryCardsProps) => {
  const { t } = useTranslation();
  const isPositive = snapshot.change && snapshot.change.value >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
      {/* Total Patrimônio */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-primary/50 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all" />
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium min-w-0 truncate">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="truncate">{t("summary.totalWealth")}</span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0 border border-primary/20">
            BRL
          </span>
        </div>
        <div className="mt-1">
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono break-all leading-none">
            {formatBRL(snapshot.total)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            Consolidado da carteira
          </p>
        </div>
      </div>

      {/* Variação Mensal */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-border group">
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium min-w-0 truncate">
            <div className={`p-1.5 rounded-lg ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"} shrink-0`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <span className="truncate">{t("summary.monthlyChange")}</span>
          </div>
        </div>
        {snapshot.change ? (
          <div className="mt-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono leading-none ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                {formatPercent(snapshot.change.percentage)}
              </p>
              <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
                isPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}>
                {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {formatBRL(snapshot.change.value)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Em relação ao mês anterior
            </p>
          </div>
        ) : (
          <p className="text-lg text-muted-foreground mt-2">—</p>
        )}
      </div>

      {/* Renda Fixa vs Variável */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:border-border">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium mb-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <span className="truncate">{t("summary.fixedVsVariable")}</span>
        </div>
        {snapshot.fixedIncome != null ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-foreground">{t("summary.fixed")}</span>
                <span className="text-emerald-400 font-mono font-bold">{snapshot.fixedIncome.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                  style={{ width: `${Math.min(snapshot.fixedIncome, 100)}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-foreground">{t("summary.variable")}</span>
                <span className="text-cyan-400 font-mono font-bold">{(snapshot.variableIncome ?? 0).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-500" 
                  style={{ width: `${Math.min(snapshot.variableIncome ?? 0, 100)}%` }} 
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-lg text-muted-foreground">—</p>
        )}
      </div>

      {/* Brasil vs Exterior */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:border-border">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium mb-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <span className="truncate">{t("summary.brazilVsExterior")}</span>
        </div>
        {snapshot.brazil != null ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-foreground flex items-center gap-1.5">
                  <Home className="w-3 h-3 text-emerald-400 shrink-0" /> {t("summary.brazil")}
                </span>
                <span className="text-emerald-400 font-mono font-bold">{snapshot.brazil.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" 
                  style={{ width: `${Math.min(snapshot.brazil, 100)}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-foreground flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-purple-400 shrink-0" /> {t("summary.exterior")}
                </span>
                <span className="text-purple-400 font-mono font-bold">{(snapshot.exterior ?? 0).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500" 
                  style={{ width: `${Math.min(snapshot.exterior ?? 0, 100)}%` }} 
                />
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
