import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plug, RefreshCw, Trash2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useVariableAssetsStore } from "@/features/variableAssets/store";
import { aggregatePositions, validateAgainstMonthly } from "@/features/variableAssets/aggregation";
import type { ValidationStatus, AggregatedPosition, Broker } from "@/features/variableAssets/types";
import { toast } from "@/hooks/use-toast";

const brokerLabels: Record<Broker, string> = {
  binance: "Binance",
  coinbase: "Coinbase",
  xp: "XP",
  mercado_bitcoin: "Mercado Bitcoin",
  bybit: "Bybit",
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StatusBadge({ status }: { status: ValidationStatus }) {
  if (status === "matched")
    return (
      <Badge className="bg-primary/20 text-primary border-primary/40">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Sincronizado
      </Badge>
    );
  if (status === "warning")
    return (
      <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/40">
        <AlertTriangle className="w-3 h-3 mr-1" /> Parcial
      </Badge>
    );
  return (
    <Badge className="bg-destructive/20 text-destructive border-destructive/40">
      <XCircle className="w-3 h-3 mr-1" /> Não sincronizado
    </Badge>
  );
}

/** Derive equities/crypto totals from latest monthly snapshot (read-only, heuristic). */
function deriveMonthlyVariableTotals(
  snapshot: { investments: { name: string; value: number }[] } | undefined
) {
  if (!snapshot) return { equities: 0, crypto: 0 };
  let equities = 0;
  let crypto = 0;
  for (const inv of snapshot.investments) {
    const n = inv.name.toLowerCase();
    if (
      n.includes("bitcoin") ||
      n.includes("crypto") ||
      n.includes("btc") ||
      n.includes("eth")
    ) {
      crypto += inv.value;
    } else if (n.includes("ações") || n.includes("acoes") || n.includes("equit")) {
      equities += inv.value;
    }
  }
  return { equities, crypto };
}

export default function PosicoesVariaveis() {
  const { data: monthlyData = [] } = useSnapshots();
  const latest = monthlyData[monthlyData.length - 1];

  const {
    positions,
    connections,
    syncEnabled,
    setSyncEnabled,
    connectSnapTrade,
    removeConnection,
    clearAll,
  } = useVariableAssetsStore();

  const aggregated: AggregatedPosition[] = useMemo(
    () => aggregatePositions(positions),
    [positions]
  );

  const monthlyVariable = useMemo(
    () => deriveMonthlyVariableTotals(latest),
    [latest]
  );

  const validation = useMemo(
    () => validateAgainstMonthly(monthlyVariable, aggregated),
    [monthlyVariable, aggregated]
  );

  const handleConnect = () => {
    connectSnapTrade();
    toast({ title: "Corretora conectada", description: "Posições mock importadas via SnapTrade." });
  };

  const handleToggleSync = (v: boolean) => {
    if (v && validation.overall !== "matched") {
      toast({
        title: "Sincronização bloqueada",
        description: "A validação precisa estar 'Sincronizado' para ativar a sync automática.",
        variant: "destructive",
      });
      return;
    }
    setSyncEnabled(v);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Posições Variáveis</h1>
              <p className="text-xs text-muted-foreground">
                Renda variável detalhada — ações e cripto agregadas por ticker
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleConnect} size="sm">
              <Plug className="w-4 h-4 mr-1" /> Conectar Corretora
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Validation */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Validação cruzada com Mensal</h2>
            <StatusBadge status={validation.overall} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {(["equities", "crypto"] as const).map((cat) => {
              const v = validation[cat];
              return (
                <div key={cat} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {cat === "equities" ? "Ações" : "Cripto"}
                    </span>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Mensal:</span>
                      <span className="text-foreground">{brl(v.monthlyTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agregado:</span>
                      <span className="text-foreground">{brl(v.aggregatedTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delta:</span>
                      <span
                        className={
                          v.status === "matched"
                            ? "text-primary"
                            : v.status === "warning"
                              ? "text-yellow-500"
                              : "text-destructive"
                        }
                      >
                        {v.delta >= 0 ? "+" : ""}
                        {v.delta.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Sincronização automática</p>
              <p className="text-sm text-muted-foreground">
                Só pode ser ativada quando a validação estiver "Sincronizado".
              </p>
            </div>
            <Switch checked={syncEnabled} onCheckedChange={handleToggleSync} />
          </div>
        </section>

        {/* Aggregated assets */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Ativos agregados por ticker</h2>
          {aggregated.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma posição. Conecte uma corretora para começar.
            </p>
          ) : (
            <div className="space-y-2">
              {aggregated.map((a) => (
                <div
                  key={a.ticker}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{a.ticker}</span>
                      <Badge variant="outline" className="text-xs">
                        {a.assetType === "crypto" ? "Cripto" : "Ação"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Origens: {a.sources.map((s) => brokerLabels[s]).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{brl(a.totalValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.totalQuantity.toLocaleString("pt-BR", { maximumFractionDigits: 8 })} un.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Connections */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conexões</h2>
            {connections.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 className="w-4 h-4 mr-1" /> Limpar tudo
              </Button>
            )}
          </div>
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma conexão ativa.
            </p>
          ) : (
            <div className="space-y-2">
              {connections.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium uppercase">{c.provider}</span>
                      <Badge
                        className={
                          c.status === "active"
                            ? "bg-primary/20 text-primary border-primary/40"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {c.status === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Corretoras: {c.brokers.map((b) => brokerLabels[b]).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Última sync: {new Date(c.lastSync).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConnection(c.id)}
                    title="Remover conexão"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
