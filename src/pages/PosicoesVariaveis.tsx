import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plug,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useVariableAssets } from "@/features/variableAssets/useVariableAssets";
import {
  aggregatePositions,
  validateCrypto,
} from "@/features/variableAssets/aggregation";
import type {
  ValidationStatus,
  AggregatedPosition,
  Provider,
} from "@/features/variableAssets/types";
import { toast } from "@/hooks/use-toast";

const providerLabels: Record<Provider, string> = {
  binance: "Binance",
  bybit: "Bybit",
  coinbase: "Coinbase",
  kraken: "Kraken",
  mercado_bitcoin: "Mercado Bitcoin",
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
  if (status === "no-reference")
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Info className="w-3 h-3 mr-1" /> Sem referência mensal
      </Badge>
    );
  return (
    <Badge className="bg-destructive/20 text-destructive border-destructive/40">
      <XCircle className="w-3 h-3 mr-1" /> Não sincronizado
    </Badge>
  );
}

/** Heuristic: extract crypto total from latest monthly snapshot. */
function deriveMonthlyCrypto(
  snapshot: { investments: { name: string; value: number }[] } | undefined,
): number {
  if (!snapshot) return 0;
  let crypto = 0;
  for (const inv of snapshot.investments) {
    const n = inv.name.toLowerCase();
    if (
      n.includes("bitcoin") ||
      n.includes("crypto") ||
      n.includes("cripto") ||
      n.includes("btc") ||
      n.includes("eth")
    ) {
      crypto += inv.value;
    }
  }
  return crypto;
}

export default function PosicoesVariaveis() {
  const { data: monthlyData = [] } = useSnapshots();
  const latest = monthlyData[monthlyData.length - 1];

  const {
    connections,
    positions,
    loading,
    busy,
    connect,
    sync,
    syncAll,
    disconnect,
    addManual,
    removePosition,
  } = useVariableAssets();

  const aggregated: AggregatedPosition[] = useMemo(
    () => aggregatePositions(positions),
    [positions],
  );

  const monthlyCrypto = useMemo(() => deriveMonthlyCrypto(latest), [latest]);
  const validation = useMemo(
    () => validateCrypto(monthlyCrypto, aggregated),
    [monthlyCrypto, aggregated],
  );

  // Connect dialog
  const [connectOpen, setConnectOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("binance");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [label, setLabel] = useState("");

  // Manual dialog
  const [manualOpen, setManualOpen] = useState(false);
  const [mTicker, setMTicker] = useState("");
  const [mQty, setMQty] = useState("");
  const [mBroker, setMBroker] = useState("");

  const handleConnect = async () => {
    if (!apiKey || !apiSecret) {
      toast({ title: "Credenciais obrigatórias", variant: "destructive" });
      return;
    }
    try {
      const res = await connect({
        provider,
        label: label || undefined,
        api_key: apiKey,
        api_secret: apiSecret,
        passphrase: passphrase || undefined,
      });
      if (res.sync_error) {
        toast({
          title: "Conectado, mas a sincronização falhou",
          description: res.sync_error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Corretora conectada", description: providerLabels[provider] });
      }
      setConnectOpen(false);
      setApiKey(""); setApiSecret(""); setPassphrase(""); setLabel("");
    } catch (e) {
      toast({
        title: "Falha na conexão",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleAddManual = async () => {
    const qty = parseFloat(mQty.replace(",", "."));
    if (!mTicker.trim() || !(qty > 0)) {
      toast({ title: "Ticker e quantidade são obrigatórios", variant: "destructive" });
      return;
    }
    try {
      await addManual(mTicker.trim().toUpperCase(), qty, mBroker || undefined);
      toast({ title: "Ativo manual adicionado" });
      setManualOpen(false);
      setMTicker(""); setMQty(""); setMBroker("");
    } catch (e) {
      toast({
        title: "Falha ao adicionar",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleSync = async (id: string) => {
    try {
      await sync(id);
      toast({ title: "Sincronizado" });
    } catch (e) {
      toast({
        title: "Falha ao sincronizar",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const manualPositions = positions.filter((p) => p.source === "manual");

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
                Cripto agregada por ticker — APIs reais + entradas manuais
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connections.length > 0 && (
              <Button
                onClick={syncAll}
                size="sm"
                variant="outline"
                disabled={busy === "sync_all"}
              >
                {busy === "sync_all" ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Sincronizar tudo
              </Button>
            )}
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Manual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar ativo manualmente</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Ticker</Label>
                    <Input
                      value={mTicker}
                      onChange={(e) => setMTicker(e.target.value)}
                      placeholder="BTC, ETH, SOL…"
                    />
                  </div>
                  <div>
                    <Label>Quantidade</Label>
                    <Input
                      value={mQty}
                      onChange={(e) => setMQty(e.target.value)}
                      placeholder="0.5"
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <Label>Corretora (opcional)</Label>
                    <Input
                      value={mBroker}
                      onChange={(e) => setMBroker(e.target.value)}
                      placeholder="cold wallet, ledger, etc."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddManual} disabled={busy === "add_manual"}>
                    {busy === "add_manual" && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plug className="w-4 h-4 mr-1" /> Conectar Corretora
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conectar corretora real</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Provedor</Label>
                    <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(providerLabels) as Provider[]).map((p) => (
                          <SelectItem key={p} value={p}>{providerLabels[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rótulo (opcional)</Label>
                    <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="conta principal" />
                  </div>
                  <div>
                    <Label>
                      {provider === "coinbase" ? "Key Name" : "API Key"}
                    </Label>
                    <Input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      autoComplete="off"
                      placeholder={
                        provider === "coinbase"
                          ? "organizations/{org_id}/apiKeys/{key_id}"
                          : ""
                      }
                    />
                  </div>
                  <div>
                    <Label>
                      {provider === "coinbase"
                        ? "EC Private Key (PEM)"
                        : "API Secret"}
                    </Label>
                    {provider === "coinbase" ? (
                      <textarea
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        autoComplete="off"
                        rows={5}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="-----BEGIN EC PRIVATE KEY-----&#10;...&#10;-----END EC PRIVATE KEY-----"
                      />
                    ) : (
                      <Input
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        autoComplete="off"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use apenas chaves <strong>somente leitura</strong>. As credenciais ficam armazenadas no backend.
                    {provider === "coinbase" && (
                      <> Coinbase usa autenticação JWT (ES256): cole o Key Name como identificador e a EC Private Key em formato PEM.</>
                    )}
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={handleConnect} disabled={busy === "connect"}>
                    {busy === "connect" && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Conectar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Validation */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Validação cruzada — Cripto</h2>
            <StatusBadge status={validation.status} />
          </div>
          {validation.status === "no-reference" ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma referência de cripto encontrada no Mensal mais recente.
              Total agregado atual: <span className="text-foreground font-medium">{brl(validation.aggregatedTotal)}</span>.
            </p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg border border-border p-4">
                <p className="text-muted-foreground mb-1">Mensal (cripto)</p>
                <p className="text-lg font-semibold">{brl(validation.monthlyTotal)}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-muted-foreground mb-1">Agregado real</p>
                <p className="text-lg font-semibold">{brl(validation.aggregatedTotal)}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-muted-foreground mb-1">Delta</p>
                <p
                  className={
                    "text-lg font-semibold " +
                    (validation.status === "matched"
                      ? "text-primary"
                      : validation.status === "warning"
                        ? "text-yellow-500"
                        : "text-destructive")
                  }
                >
                  {validation.delta >= 0 ? "+" : ""}
                  {validation.delta.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Aggregated assets */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Ativos agregados por ticker</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : aggregated.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma posição. Conecte uma corretora ou adicione um ativo manualmente.
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
                      Origens: {a.sources.join(", ")}
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
          <h2 className="text-lg font-semibold mb-4">Conexões</h2>
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
                      <span className="font-medium">{providerLabels[c.provider]}</span>
                      {c.label && <span className="text-xs text-muted-foreground">· {c.label}</span>}
                      <Badge
                        className={
                          c.status === "active"
                            ? "bg-primary/20 text-primary border-primary/40"
                            : c.status === "error"
                              ? "bg-destructive/20 text-destructive border-destructive/40"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {c.status === "active" ? "Ativa" : c.status === "error" ? "Erro" : "Inativa"}
                      </Badge>
                    </div>
                    {c.lastSync && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Última sync: {new Date(c.lastSync).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {c.lastError && (
                      <p className="text-xs text-destructive mt-1">{c.lastError}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSync(c.id)}
                      disabled={busy === "sync"}
                      title="Sincronizar"
                    >
                      <RefreshCw className={"w-4 h-4 " + (busy === "sync" ? "animate-spin" : "")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => disconnect(c.id)}
                      title="Remover conexão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Manual positions */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Ativos manuais</h2>
          {manualPositions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum ativo manual adicionado.
            </p>
          ) : (
            <div className="space-y-2">
              {manualPositions.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{p.ticker}</span>
                      <Badge variant="outline" className="text-xs">{p.broker}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 8 })} un.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{brl(p.currentValue)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePosition(p.id)}
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
