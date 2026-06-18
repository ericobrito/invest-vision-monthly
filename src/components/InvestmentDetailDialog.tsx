import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatBRL, type Investment } from "@/data/investments";
import { TrendingUp, TrendingDown, Wallet, Layers, Zap } from "lucide-react";
import { portfolioCalculationService } from "@/services/PortfolioCalculationService";

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

const InvestmentDetailDialog = ({ open, onOpenChange, investment }: Props) => {
  if (!investment) return null;

  const mode = investment.mode || "CONSOLIDATED";
  const Meta = modeMeta[mode];
  const Icon = Meta.icon;

  const invested = investment.applied;
  const pnl = invested != null ? investment.value - invested : undefined;
  const pnlPct = invested && invested > 0 ? ((investment.value - invested) / invested) * 100 : undefined;
  const pnlPositive = (pnl ?? 0) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Valor atual" value={formatBRL(investment.value)} mono strong />
            <Stat label="Valor aplicado" value={invested != null ? formatBRL(invested) : "—"} mono />
            <Stat label="% da carteira" value={`${investment.percentage.toFixed(2)}%`} mono />
          </div>

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

          {/* Mode-specific body */}
          {mode === "DETAILED" && investment.positions && investment.positions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Posições</p>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground bg-muted/30">
                      <th className="text-left p-2 font-medium">Ativo</th>
                      <th className="text-right p-2 font-medium">Qtd</th>
                      <th className="text-right p-2 font-medium">Preço atual</th>
                      <th className="text-right p-2 font-medium">Valor (nativo)</th>
                      <th className="text-right p-2 font-medium">Valor (BRL)</th>
                      <th className="text-right p-2 font-medium">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investment.positions.map((p, i) => {
                      const r = p.appliedAmount > 0 ? ((p.currentValue - p.appliedAmount) / p.appliedAmount) * 100 : undefined;
                      const cur = (p.currency || "BRL").toUpperCase();
                      const nativeLabel =
                        cur === "BRL" ? `R$ ${fmtNum(p.currentValue)}` :
                        cur === "USD" ? `US$ ${fmtNum(p.currentValue)}` :
                        cur === "EUR" ? `€ ${fmtNum(p.currentValue)}` :
                        cur === "GBP" ? `£ ${fmtNum(p.currentValue)}` :
                        `${fmtNum(p.currentValue)} ${cur}`;
                      const valBRL = p.currentValueBRL ?? (p.currentValue * (p.fxRate ?? 1));
                      return (
                        <tr key={i} className="border-b border-border/50">
                          <td className="p-2">
                            <div className="font-medium">{p.symbol}</div>
                            {p.name && <div className="text-xs text-muted-foreground">{p.name}</div>}
                            {cur !== "BRL" && p.fxRate && (
                              <div className="text-[10px] text-muted-foreground font-mono">FX {cur}/BRL {p.fxRate.toFixed(4)}</div>
                            )}
                          </td>
                          <td className="text-right p-2 font-mono">{fmtNum(p.quantity, 6)}</td>
                          <td className="text-right p-2 font-mono">{fmtNum(p.currentPrice)}</td>
                          <td className="text-right p-2 font-mono">{nativeLabel}</td>
                          <td className="text-right p-2 font-mono">{formatBRL(valBRL)}</td>
                          <td className={`text-right p-2 font-mono ${r != null ? (r >= 0 ? "text-positive" : "text-negative") : ""}`}>
                            {r != null ? `${r >= 0 ? "+" : ""}${r.toFixed(2)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

              </div>
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
