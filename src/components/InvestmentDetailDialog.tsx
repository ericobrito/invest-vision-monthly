import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatBRL, type Investment } from "@/data/investments";
import { TrendingUp, TrendingDown, Wallet, Layers, Zap, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { portfolioCalculationService } from "@/services/PortfolioCalculationService";
import { findCanonicalRule } from "@/config/investmentRegistry";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
}

function fmtNum(n?: number, digits = 2) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const modeMeta = {
  CONSOLIDATED: { label: "Consolidado", icon: Wallet, color: "bg-secondary text-secondary-foreground" },
  DETAILED: { label: "Detalhado", icon: Layers, color: "bg-accent text-accent-foreground" },
  CONNECTED: { label: "Conectado", icon: Zap, color: "bg-primary/15 text-primary" },
} as const;

type SortField = "symbol" | "quantity" | "averagePrice" | "currentPrice" | "valBRL" | "weightPct" | "pnlPct" | "annualReturnPos";

const InvestmentDetailDialog = ({ open, onOpenChange, investment }: Props) => {
  const [sortField, setSortField] = useState<SortField>("valBRL");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  if (!investment) return null;

  const mode = investment.mode || "CONSOLIDATED";
  const Meta = modeMeta[mode];
  const Icon = Meta.icon;
  const nameLower = investment.name.toLowerCase();

  let effectivePositions = investment.positions || [];

  // Fallback positions ONLY if snapshot/investment didn't populate positions array
  if (effectivePositions.length === 0) {
    const rule = findCanonicalRule(investment.name);
    if (rule) {
      const storedBRL = Number(investment.valueBRL ?? investment.value);
      const fx = investment.valueBRL && investment.value ? (Number(investment.valueBRL) / Number(investment.value)) : 5.5085;
      effectivePositions = rule.getCanonicalPositions({ USD: fx }, storedBRL > 0 ? storedBRL : undefined);
    }
  }

  // All performance metrics flow through PortfolioCalculationService using effectivePositions.
  const invMetrics = portfolioCalculationService.calculateInvestmentMetrics({
    name: investment.name,
    mode,
    positions: effectivePositions.map((p) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      averagePrice: p.averagePrice,
      currentPrice: p.currentPrice,
      currency: p.currency,
      fxRate: p.fxRate ?? 1,
      currentValueBRL: p.currentValueBRL,
      appliedAmountBRL: p.appliedAmountBRL,
    })),
    appliedBRL: effectivePositions.length > 0 ? undefined : (investment.appliedBRL ?? investment.applied),
    currentValueBRL: investment.valueBRL ?? investment.value,
  });
  const invested = invMetrics.investedValue > 0 ? invMetrics.investedValue : undefined;
  const pnl = invested != null ? invMetrics.profit : undefined;
  const pnlPct = invested != null ? invMetrics.profitPercent : undefined;
  const pnlPositive = (pnl ?? 0) >= 0;

  // Total BRL value for weight calculation
  const totalInvValueBRL = effectivePositions.reduce((sum, p) => {
    const posMetrics = portfolioCalculationService.calculatePositionMetrics(
      p.quantity,
      p.averagePrice,
      p.currentPrice,
      p.symbol
    );
    return sum + (posMetrics.currentValue * (p.fxRate ?? 1));
  }, 0);

  // Processed positions with weightPct and annualReturnPos
  const processedPositions = effectivePositions.map((p) => {
    const cur = (p.currency || "BRL").toUpperCase();
    const posMetrics = portfolioCalculationService.calculatePositionMetrics(
      p.quantity,
      p.averagePrice,
      p.currentPrice,
      p.symbol
    );
    const valBRL = posMetrics.currentValue * (p.fxRate ?? 1);
    const weightPct = totalInvValueBRL > 0 ? (valBRL / totalInvValueBRL) * 100 : 0;
    const pnlPctPos = posMetrics.investedValue > 0 ? posMetrics.profitPercent : undefined;

    let annualReturnPos: number | undefined = undefined;
    const refDate = p.purchaseDate || investment.yearStarted;
    if (refDate && posMetrics.investedValue > 0 && posMetrics.currentValue > 0) {
      try {
        const start = new Date(refDate.length === 4 ? `${refDate}-01-01` : refDate);
        const years = (new Date().getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (years >= 1) {
          annualReturnPos = (Math.pow(posMetrics.currentValue / posMetrics.investedValue, 1 / years) - 1) * 100;
        } else if (years > 0 && pnlPctPos !== undefined) {
          annualReturnPos = pnlPctPos;
        }
      } catch (e) {
        console.error("Error calculating position annual return:", e);
      }
    }

    return {
      rawPosition: p,
      symbol: p.symbol,
      name: p.name,
      quantity: p.quantity,
      averagePrice: p.averagePrice,
      currentPrice: p.currentPrice,
      currency: cur,
      fxRate: p.fxRate ?? 1,
      currentValueNative: posMetrics.currentValue,
      valBRL,
      weightPct,
      pnlPct: pnlPctPos,
      annualReturnPos,
    };
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedPositions = [...processedPositions].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (aVal === undefined || aVal === null) aVal = -Infinity;
    if (bVal === undefined || bVal === null) bVal = -Infinity;

    if (typeof aVal === "string") {
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? cmp : -cmp;
    }

    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-40 hover:opacity-100" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 inline-block ml-1 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 inline-block ml-1 text-primary" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {investment.name}
            <Badge className={`gap-1 ${Meta.color}`} variant="secondary">
              <Icon className="w-3 h-3" /> {Meta.label}
            </Badge>
            {investment.institution && (
              <span className="text-sm text-muted-foreground font-normal">· {investment.institution}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {(() => {
            const displayValueBRL = effectivePositions.length > 0 && invMetrics.currentValue > 0
              ? invMetrics.currentValue
              : (investment.valueBRL ?? investment.value);

            return (
              <div className="grid grid-cols-3 gap-3">
                <Stat 
                  label="Valor atual" 
                  value={`${formatBRL(displayValueBRL)}${
                    investment.currency && investment.currency !== "BRL" && investment.value !== displayValueBRL
                      ? ` (${investment.currency === "USD" ? "US$" : investment.currency} ${fmtNum(investment.value)})`
                      : ""
                  }`} 
                  mono 
                  strong 
                />
                <Stat 
                  label="Valor aplicado" 
                  value={invested != null ? `${formatBRL(invested)}${
                    investment.currency && investment.currency !== "BRL" && investment.applied && investment.applied !== invested
                      ? ` (${investment.currency === "USD" ? "US$" : investment.currency} ${fmtNum(investment.applied)})`
                      : ""
                  }` : "—"} 
                  mono 
                />
                <Stat label="% da carteira" value={`${investment.percentage.toFixed(2)}%`} mono />
              </div>
            );
          })()}

          {pnl != null && (
            <div className={`rounded-lg p-3 flex items-center justify-between ${pnlPositive ? "bg-primary/10" : "bg-destructive/10"}`}>
              <div className="flex items-center gap-2">
                {pnlPositive ? <TrendingUp className="w-4 h-4 text-positive" /> : <TrendingDown className="w-4 h-4 text-negative" />}
                <span className="text-sm text-muted-foreground">Resultado</span>
              </div>
              <div className="text-right">
                <p className={`font-mono font-semibold ${pnlPositive ? "text-positive" : "text-negative"}`}>
                  {pnlPositive ? "+" : ""}{formatBRL(pnl)}
                </p>
                {pnlPct != null && (
                  <p className={`text-xs font-mono ${pnlPositive ? "text-positive" : "text-negative"}`}>
                    {pnlPositive ? "+" : ""}{pnlPct.toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          )}

          {effectivePositions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Detalhamento dos Ativos Conectados ({effectivePositions.length})
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Clique nos cabeçalhos para ordenar
                </span>
              </div>
              <div className="rounded-lg border border-border overflow-x-auto bg-card/60">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground bg-muted/40 font-medium whitespace-nowrap select-none">
                      <th onClick={() => handleSort("symbol")} className="text-left p-2.5 cursor-pointer hover:text-foreground">
                        Ativo {renderSortIcon("symbol")}
                      </th>
                      <th onClick={() => handleSort("quantity")} className="text-right p-2.5 cursor-pointer hover:text-foreground">
                        Qtd {renderSortIcon("quantity")}
                      </th>
                      <th onClick={() => handleSort("averagePrice")} className="text-right p-2.5 cursor-pointer hover:text-foreground">
                        Preço Médio {renderSortIcon("averagePrice")}
                      </th>
                      <th onClick={() => handleSort("currentPrice")} className="text-right p-2.5 cursor-pointer hover:text-foreground">
                        Preço Atual {renderSortIcon("currentPrice")}
                      </th>
                      <th className="text-right p-2.5">Valor Nativo</th>
                      <th onClick={() => handleSort("valBRL")} className="text-right p-2.5 cursor-pointer hover:text-foreground">
                        Valor (BRL) {renderSortIcon("valBRL")}
                      </th>
                      <th onClick={() => handleSort("weightPct")} className="text-right p-2.5 cursor-pointer hover:text-foreground font-bold text-primary">
                        Peso na Carteira {renderSortIcon("weightPct")}
                      </th>
                      <th onClick={() => handleSort("pnlPct")} className="text-right p-2.5 cursor-pointer hover:text-foreground">
                        Resultado {renderSortIcon("pnlPct")}
                      </th>
                      <th onClick={() => handleSort("annualReturnPos")} className="text-right p-2.5 cursor-pointer hover:text-foreground">
                        Rent. Anual {renderSortIcon("annualReturnPos")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPositions.map((p, i) => {
                      const nativeLabel =
                        p.currency === "BRL" ? `R$ ${fmtNum(p.currentValueNative)}` :
                        p.currency === "USD" ? `US$ ${fmtNum(p.currentValueNative)}` :
                        p.currency === "EUR" ? `€ ${fmtNum(p.currentValueNative)}` :
                        p.currency === "GBP" ? `£ ${fmtNum(p.currentValueNative)}` :
                        `${fmtNum(p.currentValueNative)} ${p.currency}`;

                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors whitespace-nowrap font-mono">
                          <td className="p-2.5 font-sans">
                            <div className="font-bold text-foreground">{p.symbol}</div>
                            {p.name && <div className="text-[11px] text-muted-foreground truncate max-w-[140px]">{p.name}</div>}
                            {p.currency !== "BRL" && p.fxRate && (
                              <div className="text-[10px] text-muted-foreground font-mono">FX {p.currency}/BRL {p.fxRate.toFixed(4)}</div>
                            )}
                          </td>
                          <td className="text-right p-2.5 font-mono">{fmtNum(p.quantity, 6)}</td>
                          <td className="text-right p-2.5 font-mono">
                            {p.currency === "USD" ? `US$ ` : ""}{fmtNum(p.averagePrice)}
                          </td>
                          <td className="text-right p-2.5 font-mono">
                            {p.currency === "USD" ? `US$ ` : ""}{fmtNum(p.currentPrice)}
                          </td>
                          <td className="text-right p-2.5 font-mono font-medium">{nativeLabel}</td>
                          <td className="text-right p-2.5 font-mono font-semibold">{formatBRL(p.valBRL)}</td>
                          <td className="text-right p-2.5 font-mono font-bold text-primary">
                            {p.weightPct.toFixed(2)}%
                          </td>
                          <td className="text-right p-2.5">
                            <div className={`font-mono font-bold ${p.pnlPct != null ? (p.pnlPct >= 0 ? "text-positive" : "text-negative") : ""}`}>
                              {p.pnlPct != null ? `${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toFixed(2)}%` : "—"}
                            </div>
                          </td>
                          <td className={`text-right p-2.5 font-mono text-xs ${p.annualReturnPos != null ? (p.annualReturnPos >= 0 ? "text-positive" : "text-negative") : ""}`}>
                            {p.annualReturnPos != null ? `${p.annualReturnPos >= 0 ? "+" : ""}${p.annualReturnPos.toFixed(2)}% a.a.` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {(nameLower.includes("binance") || nameLower.includes("bybit") || nameLower.includes("coinbase") || nameLower.includes("cripto")) && (
                <div className="mt-2.5 p-2.5 rounded-md bg-secondary/40 border border-border/50 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    ℹ️ Transferência de Custódia (Bybit → Binance / Coinbase):
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Como as compras originais via PIX e ordens executadas foram realizadas na Bybit, o histórico de Preço Médio original (BTC US$ 29.882,78 / ETH US$ 2.160,00 [R$ 10.974,38] / USDT US$ 0,46) é propagado automaticamente para Binance e Coinbase, preservando o valor aplicado real acumulado.
                  </p>
                </div>
              )}
            </div>
          )}

          {mode === "CONNECTED" && (
            <div className="rounded-lg border border-border p-3 bg-muted/30 text-sm">
              <p className="text-muted-foreground">
                Este investimento é sincronizado automaticamente. Veja a página de Posições Variáveis para detalhes da conexão.
              </p>
              {investment.connectionId && (
                <p className="font-mono text-xs mt-2 text-muted-foreground">Conexão: {investment.connectionId}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Tipo de renda" value={investment.incomeType === "variable" ? "Variável" : "Fixa"} />
            <Stat label="Região" value={investment.region === "exterior" ? "Exterior" : "Brasil"} />
            <Stat label="Data do aporte" value={investment.yearStarted || "—"} />
            <Stat
              label="Renda Realizada"
              value={investment.realizedIncome != null ? formatBRL(investment.realizedIncome) : "Dados históricos insuficientes"}
              mono
            />
            <Stat
              label="Renda Mensal Projetada"
              value={
                (investment.annualRate || investment.annualReturn) && investment.value > 0
                  ? `${formatBRL((investment.value * ((investment.annualRate || investment.annualReturn || 0) / 100)) / 12)}/mês`
                  : "—"
              }
              mono
            />
            <Stat
              label="Taxa Anual Projetada"
              value={
                investment.annualRate || investment.annualReturn
                  ? `${(investment.annualRate || investment.annualReturn)?.toFixed(2)}% a.a.`
                  : "—"
              }
              mono
            />
            <Stat
              label="Última atualização"
              value={investment.lastPriceAt ? new Date(investment.lastPriceAt).toLocaleString("pt-BR") : "—"}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function Stat({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`${mono ? "font-mono" : ""} ${strong ? "font-semibold text-foreground" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

export default InvestmentDetailDialog;
