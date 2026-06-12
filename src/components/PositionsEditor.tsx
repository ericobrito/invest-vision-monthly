import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { formatBRL, type Position } from "@/data/investments";
import { toast } from "sonner";

interface Props {
  positions: Position[];
  onChange: (positions: Position[]) => void;
}

const emptyPosition = (): Position => ({
  symbol: "",
  name: "",
  quantity: 0,
  averagePrice: 0,
  currentPrice: 0,
  appliedAmount: 0,
  currentValue: 0,
  currency: "BRL",
});

const PositionsEditor = ({ positions, onChange }: Props) => {
  const [fetching, setFetching] = useState<number | null>(null);

  const updatePosition = (idx: number, patch: Partial<Position>) => {
    const next = positions.map((p, i) => {
      if (i !== idx) return p;
      const merged: Position = { ...p, ...patch };
      const qty = Number(merged.quantity) || 0;
      const ap = Number(merged.averagePrice) || 0;
      const cp = Number(merged.currentPrice) || 0;
      merged.appliedAmount = qty * ap;
      merged.currentValue = qty * cp;
      return merged;
    });
    onChange(next);
  };

  const addPosition = () => onChange([...positions, emptyPosition()]);

  const removePosition = (idx: number) => onChange(positions.filter((_, i) => i !== idx));

  const fetchQuote = async (idx: number) => {
    const p = positions[idx];
    if (!p.symbol) {
      toast.error("Informe o símbolo");
      return;
    }
    setFetching(idx);
    try {
      const { data, error } = await supabase.functions.invoke("asset-quote", {
        body: { action: "quote", symbol: p.symbol, provider: p.provider || "auto" },
      });
      if (error) throw error;
      const r = data?.result;
      if (!r) {
        toast.error("Cotação não encontrada");
        return;
      }
      updatePosition(idx, {
        currentPrice: Number(r.price),
        name: p.name || r.name,
        currency: r.currency || p.currency,
        provider: r.provider,
        lastPriceAt: new Date().toISOString(),
      });
      toast.success(`${r.symbol}: ${r.price} ${r.currency}`);
    } catch (e: any) {
      toast.error("Falha ao buscar cotação: " + (e?.message ?? e));
    } finally {
      setFetching(null);
    }
  };

  const totalApplied = positions.reduce((s, p) => s + (Number(p.appliedAmount) || 0), 0);
  const totalValue = positions.reduce((s, p) => s + (Number(p.currentValue) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Posições</Label>
        <Button type="button" variant="outline" size="sm" onClick={addPosition}>
          <Plus className="w-3 h-3 mr-1" /> Adicionar posição
        </Button>
      </div>

      {positions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
          Nenhuma posição. Adicione ativos para calcular automaticamente.
        </p>
      )}

      <div className="space-y-3">
        {positions.map((p, idx) => (
          <div key={idx} className="rounded-lg border border-border p-3 bg-muted/20 space-y-2">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <Label className="text-xs">Símbolo</Label>
                <Input
                  value={p.symbol}
                  placeholder="BTC, PETR4, GOOGL"
                  onChange={(e) => updatePosition(idx, { symbol: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="col-span-5">
                <Label className="text-xs">Nome</Label>
                <Input
                  value={p.name ?? ""}
                  placeholder="Auto"
                  onChange={(e) => updatePosition(idx, { name: e.target.value })}
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Provedor</Label>
                <Select value={p.provider || "auto"} onValueChange={(v) => updatePosition(idx, { provider: v === "auto" ? undefined : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="brapi">B3 (BRAPI)</SelectItem>
                    <SelectItem value="yahoo">Yahoo</SelectItem>
                    <SelectItem value="coingecko">CoinGecko</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <Label className="text-xs">Quantidade</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={p.quantity || ""}
                  onChange={(e) => updatePosition(idx, { quantity: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Preço médio</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={p.averagePrice || ""}
                  onChange={(e) => updatePosition(idx, { averagePrice: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Preço atual</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={p.currentPrice || ""}
                  onChange={(e) => updatePosition(idx, { currentPrice: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Moeda</Label>
                <Select value={p.currency} onValueChange={(v) => updatePosition(idx, { currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex items-end gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => fetchQuote(idx)} disabled={fetching === idx} title="Buscar cotação">
                  {fetching === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removePosition(idx)} title="Remover">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
              <span>Aplicado: <span className="font-mono text-foreground">{formatBRL(p.appliedAmount)}</span></span>
              <span>Valor atual: <span className="font-mono text-foreground">{formatBRL(p.currentValue)}</span></span>
              <span className={p.currentValue >= p.appliedAmount ? "text-positive" : "text-negative"}>
                {p.appliedAmount > 0 ? `${(((p.currentValue - p.appliedAmount) / p.appliedAmount) * 100).toFixed(2)}%` : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {positions.length > 0 && (
        <div className="rounded-lg bg-secondary/40 p-3 flex justify-between text-sm">
          <span className="text-muted-foreground">Totais</span>
          <div className="flex gap-6 font-mono">
            <span>Aplicado: <strong>{formatBRL(totalApplied)}</strong></span>
            <span>Atual: <strong>{formatBRL(totalValue)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionsEditor;
