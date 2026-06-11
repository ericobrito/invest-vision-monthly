import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatBRL, type Investment } from "@/data/investments";
import { TrendingUp, TrendingDown, Link2, Zap, PencilLine } from "lucide-react";

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
  MANUAL: { label: "Manual", icon: PencilLine, color: "bg-secondary text-secondary-foreground" },
  HYBRID: { label: "Híbrido", icon: Link2, color: "bg-accent text-accent-foreground" },
  AUTO: { label: "Automático", icon: Zap, color: "bg-primary/15 text-primary" },
} as const;

const InvestmentDetailDialog = ({ open, onOpenChange, investment }: Props) => {
  if (!investment) return null;

  const mode = investment.valueMode || "MANUAL";
  const Meta = modeMeta[mode];
  const Icon = Meta.icon;

  const invested = investment.investedAmount ?? investment.applied;
  const pnl = invested != null ? investment.value - invested : undefined;
  const pnlPct = invested && invested > 0 ? ((investment.value - invested) / invested) * 100 : undefined;
  const pnlPositive = (pnl ?? 0) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {investment.name}
            <Badge className={`gap-1 ${Meta.color}`} variant="secondary">
              <Icon className="w-3 h-3" /> {Meta.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {investment.linkedAsset && (
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Ativo vinculado</p>
              <p className="font-mono text-sm">
                <span className="uppercase">{investment.linkedAsset.provider}</span>
                {" · "}
                <span className="font-semibold">{investment.linkedAsset.symbol}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Valor atual" value={formatBRL(investment.value)} mono strong />
            <Stat
              label="Valor investido"
              value={invested != null ? formatBRL(invested) : "—"}
              mono
            />
            <Stat label="Quantidade" value={fmtNum(investment.quantity, 8)} mono />
            <Stat
              label="Preço médio"
              value={investment.averagePrice != null ? formatBRL(investment.averagePrice) : "—"}
              mono
            />
            <Stat
              label="Preço atual"
              value={investment.currentPrice != null ? formatBRL(investment.currentPrice) : "—"}
              mono
            />
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
