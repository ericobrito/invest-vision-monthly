import { TrendingUp, TrendingDown, Wallet, PieChart, Globe, ArrowUpRight, ArrowDownRight, Home, Sparkles } from "lucide-react";
import { formatBRL, formatPercent, type MonthlySnapshot } from "@/data/investments";

interface SummaryCardsProps {
  snapshot: MonthlySnapshot;
}

const SummaryCards = ({ snapshot }: SummaryCardsProps) => {
  const isPositive = snapshot.change ? snapshot.change.value >= 0 : true;

  const fixedIncomePct = snapshot.fixedIncome ?? 0;
  const variableIncomePct = snapshot.variableIncome ?? 0;
  const brazilPct = snapshot.brazil ?? 0;
  const exteriorPct = snapshot.exterior ?? 0;

  // Active Portfolio CAGR calculation (Jan 2024 base)
  const totalApplied = snapshot.investments.reduce((s, i) => s + (i.appliedBRL ?? i.applied ?? 0), 0);
  let cagrActive = 11.29;
  if (totalApplied > 0 && snapshot.total > 0) {
    const startDate = new Date("2024-01-01");
    const years = Math.max(0.5, (new Date().getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    cagrActive = (Math.pow(snapshot.total / totalApplied, 1 / years) - 1) * 100;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 w-full min-w-0">
      {/* Card 1: Valor Total */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-primary/50 group">
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium min-w-0 truncate">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="truncate">Patrimônio Total</span>
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

      {/* Card 2: Retorno Anualizado (CAGR) */}
      <div className="gradient-card rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-primary/60 group">
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium min-w-0 truncate">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="truncate text-foreground font-semibold">Ret. Anualizado (CAGR)</span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/20">
            Jan/24 Base
          </span>
        </div>
        <div className="mt-1">
          <p className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight font-mono break-all leading-none">
            {cagrActive.toFixed(2)}% <span className="text-sm font-normal text-muted-foreground">a.a.</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            Taxa composta no tempo ativo
          </p>
        </div>
      </div>

      {/* Card 3: Variação Mensal */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:border-border">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium mb-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"} shrink-0`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <span className="truncate">Variação Mensal</span>
        </div>
        <div className="mt-1">
          {snapshot.change ? (
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
          ) : (
            <p className="text-lg text-muted-foreground font-mono">—</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            Em relação ao mês anterior
          </p>
        </div>
      </div>

      {/* Card 4: Fixa vs Variável */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:border-border">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium mb-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <span className="truncate">Fixa vs Variável</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-foreground">Renda Fixa</span>
              <span className="text-emerald-400 font-mono font-bold">{fixedIncomePct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                style={{ width: `${fixedIncomePct}%` }} 
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-foreground">Renda Variável</span>
              <span className="text-cyan-400 font-mono font-bold">{variableIncomePct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-500" 
                style={{ width: `${variableIncomePct}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 5: Brasil vs Exterior */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:border-border">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium mb-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <span className="truncate">Brasil vs Exterior</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-foreground flex items-center gap-1"><Home className="w-3 h-3 text-muted-foreground" /> Brasil</span>
              <span className="text-emerald-400 font-mono font-bold">{brazilPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" 
                style={{ width: `${brazilPct}%` }} 
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-foreground flex items-center gap-1"><Globe className="w-3 h-3 text-muted-foreground" /> Exterior</span>
              <span className="text-purple-400 font-mono font-bold">{exteriorPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-500" 
                style={{ width: `${exteriorPct}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
