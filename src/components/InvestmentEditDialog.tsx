import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Wallet, Layers, Zap } from "lucide-react";
import type { Investment, IncomeType, Region, InvestmentMode, Position } from "@/data/investments";
import { supabase } from "@/integrations/supabase/client";
import PositionsEditor from "@/components/PositionsEditor";
import { useVariableAssets } from "@/features/variableAssets/useVariableAssets";
import type { Provider } from "@/features/variableAssets/types";

interface InvestmentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
  onSave: (updated: Investment) => void;
  isSaving?: boolean;
}

const modeOptions: { value: InvestmentMode; label: string; description: string; Icon: typeof Wallet }[] = [
  { value: "CONSOLIDATED", label: "Consolidado", description: "Valor manual. Ideal para reserva, previdência, imóveis, fundos alternativos.", Icon: Wallet },
  { value: "DETAILED", label: "Detalhado", description: "Posições individuais (ações, ETFs, cripto). Cálculo automático a partir de quantidade × preço.", Icon: Layers },
  { value: "CONNECTED", label: "Conectado", description: "Importado automaticamente de uma corretora ou exchange conectada.", Icon: Zap },
];

const InvestmentEditDialog = ({
  open,
  onOpenChange,
  investment,
  onSave,
  isSaving,
}: InvestmentEditDialogProps) => {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [mode, setMode] = useState<InvestmentMode>("CONSOLIDATED");
  const [value, setValue] = useState("");
  const [applied, setApplied] = useState("");
  const [yearStarted, setYearStarted] = useState("");
  const [incomeType, setIncomeType] = useState<IncomeType>("fixed");
  const [region, setRegion] = useState<Region>("brazil");
  const [includeInVariable, setIncludeInVariable] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [connectionId, setConnectionId] = useState<string>("");
  const { connections, sync } = useVariableAssets();
  const [currency, setCurrency] = useState("BRL");

  const [showConnectForm, setShowConnectForm] = useState(false);
  const [newConnProvider, setNewConnProvider] = useState<Provider>("investment_bloom");
  const [newConnLabel, setNewConnLabel] = useState("");
  const [newConnKey, setNewConnKey] = useState("");
  const [newConnSecret, setNewConnSecret] = useState("");
  const [isConnectingNew, setIsConnectingNew] = useState(false);

  useEffect(() => {
    if (investment) {
      setName(investment.name);
      setInstitution(investment.institution ?? "");
      setMode(investment.mode || "CONSOLIDATED");
      setValue(String(investment.valueBRL ?? investment.value));
      setApplied(investment.appliedBRL != null ? String(investment.appliedBRL) : (investment.applied != null ? String(investment.applied) : ""));
      setYearStarted(investment.yearStarted ?? "");
      setIncomeType(investment.incomeType || "fixed");
      setRegion(investment.region || "brazil");
      setIncludeInVariable(investment.flags?.includeInVariablePositions === true);
      setPositions(investment.positions ?? []);
      setConnectionId(investment.connectionId ?? "");
      setCurrency(investment.currency || "BRL");
    }
  }, [investment, open]);

  const getConnectionDisplayLabel = (c: { provider: string; label?: string }) => {
    const isPluggy = c.provider === "mercado_bitcoin" && (
      String(c.label || "").toLowerCase().includes("open finance") ||
      String(c.label || "").toLowerCase().includes("nubank") ||
      String(c.label || "").toLowerCase().includes("banco") ||
      String(c.label || "").toLowerCase().includes("pluggy")
    );
    const providerLabel = isPluggy ? "Open Finance" : c.provider.toUpperCase();
    return `${providerLabel}${c.label ? ` — ${c.label}` : ""}`;
  };

  const computed = useMemo(() => {
    let v = Number(value) || 0;
    let a = applied ? Number(applied) : undefined;
    if (mode === "DETAILED") {
      v = positions.reduce((s, p) => s + p.currentValue, 0);
      a = positions.reduce((s, p) => s + p.appliedAmount, 0);
    }
    const totalReturn = a && a > 0 ? ((v - a) / a) * 100 : undefined;
    let annualReturn: number | undefined;
    if (yearStarted && a && a > 0 && v > 0) {
      const start = new Date(yearStarted.length === 4 ? `${yearStarted}-01-01` : yearStarted);
      const years = (new Date().getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (years > 0) annualReturn = (Math.pow(v / a, 1 / years) - 1) * 100;
    }
    return { value: v, applied: a, totalReturn, annualReturn };
  }, [mode, value, applied, positions, yearStarted]);

  const handleSave = () => {
    if (!investment) return;
    onSave({
      ...investment,
      name,
      institution: institution || undefined,
      mode,
      value: computed.value,
      applied: computed.applied,
      yearStarted: yearStarted || undefined,
      totalReturn: computed.totalReturn != null ? Number(computed.totalReturn.toFixed(2)) : undefined,
      annualReturn: computed.annualReturn != null ? Number(computed.annualReturn.toFixed(2)) : undefined,
      incomeType,
      region,
      flags: {
        ...(investment.flags || {}),
        includeInVariablePositions: includeInVariable,
      },
      positions: mode === "DETAILED" ? positions : undefined,
      connectionId: mode === "CONNECTED" ? (connectionId || undefined) : undefined,
      currency: currency || "BRL",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Investimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode selector */}
          <div>
            <Label className="text-sm font-semibold">Como deseja acompanhar este investimento?</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {modeOptions.map(({ value: v, label, description, Icon }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMode(v)}
                  className={`text-left rounded-lg border p-3 transition ${
                    mode === v
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Instituição</Label>
              <Input value={institution} placeholder="Avenue, XP, Bybit..." onChange={(e) => setInstitution(e.target.value)} />
            </div>
          </div>

          {/* Mode-specific body */}
          {mode === "CONSOLIDATED" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor Atual (R$)</Label>
                <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div>
                <Label>Valor Aplicado (R$)</Label>
                <Input type="number" step="0.01" value={applied} onChange={(e) => setApplied(e.target.value)} />
              </div>
            </div>
          )}

          {mode === "DETAILED" && (
            <PositionsEditor positions={positions} onChange={setPositions} />
          )}

          {mode === "CONNECTED" && (
            <div className="space-y-3">
              {showConnectForm ? (
                <div className="rounded-lg border border-primary/30 p-3 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">Nova Conexão</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowConnectForm(false)} className="h-7 text-xs">
                      Voltar para seleção
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Provedor</Label>
                      <Select value={newConnProvider} onValueChange={(v) => setNewConnProvider(v as Provider)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investment_bloom">Investment Bloom</SelectItem>
                          <SelectItem value="binance">Binance</SelectItem>
                          <SelectItem value="bybit">Bybit</SelectItem>
                          <SelectItem value="coinbase">Coinbase</SelectItem>
                          <SelectItem value="kraken">Kraken</SelectItem>
                          <SelectItem value="mercado_bitcoin">Mercado Bitcoin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Rótulo / Nome</Label>
                      <Input
                        className="h-8 text-xs"
                        value={newConnLabel}
                        onChange={(e) => setNewConnLabel(e.target.value)}
                        placeholder="Ex: Minha carteira"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">
                        {newConnProvider === "investment_bloom" ? "Supabase URL" : newConnProvider === "coinbase" ? "Key Name" : "API Key"}
                      </Label>
                      <Input
                        className="h-8 text-xs"
                        value={newConnKey}
                        onChange={(e) => setNewConnKey(e.target.value)}
                        placeholder={newConnProvider === "investment_bloom" ? "https://..." : ""}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        {newConnProvider === "investment_bloom" ? "Supabase Anon Key" : newConnProvider === "coinbase" ? "EC Private Key" : "API Secret"}
                      </Label>
                      <Input
                        className="h-8 text-xs"
                        type="password"
                        value={newConnSecret}
                        onChange={(e) => setNewConnSecret(e.target.value)}
                        placeholder={newConnProvider === "investment_bloom" ? "eyJhbGci..." : ""}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="w-full text-xs animate-fade-in"
                    onClick={async () => {
                      if (!newConnKey || !newConnSecret) {
                        alert("URL/Chave e Anon Key/Secret são obrigatórias");
                        return;
                      }
                      setIsConnectingNew(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("variable-assets", {
                          body: {
                            action: "connect",
                            provider: newConnProvider,
                            label: newConnLabel || undefined,
                            api_key: newConnKey,
                            api_secret: newConnSecret
                          }
                        });
                        if (error || !data?.success) throw new Error(error?.message || data?.error || "Falha na conexão");
                        
                        const connId = data.connection_id;
                        
                        // Execute client-side sync immediately
                        await sync(connId);
                        
                        // Select this connection automatically
                        setConnectionId(connId);
                        setShowConnectForm(false);
                        
                        // Reset form fields
                        setNewConnLabel("");
                        setNewConnKey("");
                        setNewConnSecret("");
                      } catch (err) {
                        alert("Falha ao conectar: " + (err instanceof Error ? err.message : String(err)));
                      } finally {
                        setIsConnectingNew(false);
                      }
                    }}
                    disabled={isConnectingNew}
                  >
                    {isConnectingNew ? "Conectando e sincronizando..." : "Conectar e Importar Ativos"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-border p-3 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Conexão</Label>
                    <Button type="button" variant="link" size="sm" onClick={() => setShowConnectForm(true)} className="h-auto p-0 text-xs text-primary">
                      + Conectar nova conta / projeto
                    </Button>
                  </div>
                  <Select value={connectionId} onValueChange={setConnectionId}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma conexão ativa" /></SelectTrigger>
                    <SelectContent>
                      {connections.length === 0 && <SelectItem value="__none" disabled>Nenhuma conexão ativa</SelectItem>}
                      {connections.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {getConnectionDisplayLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Os valores serão atualizados automaticamente a partir da sincronização.
                  </p>
                </div>
              )}
              <div>
                <Label>Valor Aplicado (R$)</Label>
                <Input type="number" step="0.01" value={applied} onChange={(e) => setApplied(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Data do Aporte</Label>
            <Input type="date" value={yearStarted} onChange={(e) => setYearStarted(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tipo de Renda</Label>
              <Select value={incomeType} onValueChange={(v) => setIncomeType(v as IncomeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Renda Fixa</SelectItem>
                  <SelectItem value="variable">Renda Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Região</Label>
              <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brazil">Brasil</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (BRL)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="include-variable"
              checked={includeInVariable}
              onCheckedChange={(c) => setIncludeInVariable(c === true)}
            />
            <Label htmlFor="include-variable" className="cursor-pointer">
              Contabilizar em Posições Variáveis
            </Label>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Calculado automaticamente</p>
            <div className="flex gap-6 text-sm flex-wrap">
              <div>
                <span className="text-muted-foreground">Valor atual: </span>
                <strong className="font-mono">
                  {computed.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Rent. Total: </span>
                <strong className={computed.totalReturn != null ? (computed.totalReturn >= 0 ? "text-positive" : "text-negative") : ""}>
                  {computed.totalReturn != null ? `${computed.totalReturn >= 0 ? "+" : ""}${computed.totalReturn.toFixed(2)}%` : "—"}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Rent. Anual: </span>
                <strong className={computed.annualReturn != null ? (computed.annualReturn >= 0 ? "text-positive" : "text-negative") : ""}>
                  {computed.annualReturn != null ? `${computed.annualReturn >= 0 ? "+" : ""}${computed.annualReturn.toFixed(2)}%` : "—"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name || isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentEditDialog;
