import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { formatBRL, type Position } from "@/data/investments";
import { toast } from "sonner";
import { useFxRates, getFxRate, SUPPORTED_CURRENCIES } from "@/lib/fx";
import { portfolioCalculationService } from "@/services/PortfolioCalculationService";
import { MarketDataService } from "@/services/MarketDataService";

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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestingIdx, setSuggestingIdx] = useState<number | null>(null);
  const { data: fxRates } = useFxRates();

  const recomputeBRL = (p: Position): Position => {
    const rate = getFxRate(p.currency, fxRates);
    const rawValue = (Number(p.currentValue) || 0);
    const currentValueBRL = rawValue * rate;
    // Mandatory audit log per spec.
    console.log({
      symbol: p.symbol,
      quantity: p.quantity,
      currentPrice: p.currentPrice,
      currency: p.currency,
      rawValueUSD: rawValue,
      usdBrlRate: rate,
      currentValueBRL,
    });
    return {
      ...p,
      fxRate: rate,
      currentValueBRL,
      appliedAmountBRL: (Number(p.appliedAmount) || 0) * rate,
    };
  };

  const updatePosition = (idx: number, patch: Partial<Position>) => {
    const next = positions.map((p, i) => {
      if (i !== idx) return p;
      const merged: Position = { ...p, ...patch };
      // Derive native invested/current via the centralized service (single source of truth).
      const m = portfolioCalculationService.calculatePositionMetrics(
        Number(merged.quantity) || 0,
        Number(merged.averagePrice) || 0,
        Number(merged.currentPrice) || 0,
        merged.symbol,
      );
      merged.appliedAmount = m.investedValue;
      merged.currentValue = m.currentValue;
      return recomputeBRL(merged);
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
      const details = await MarketDataService.getQuoteDetails(p.symbol, p.provider || "auto");
      if (!details || !details.price || details.price === 0) {
        toast.error("Cotação não encontrada");
        return;
      }

      const updates: Partial<Position> = {
        currentPrice: details.price,
        lastPriceAt: new Date().toISOString(),
      };

      if (details.name) {
        updates.name = details.name;
      }

      if (details.currency) {
        const upperCur = details.currency.toUpperCase();
        if (SUPPORTED_CURRENCIES.includes(upperCur as any)) {
          updates.currency = upperCur;
        }
      }

      updatePosition(idx, updates);
      toast.success(`${p.symbol}: ${details.price} ${updates.currency || p.currency}`);
    } catch (e: any) {
      toast.error("Falha ao buscar cotação: " + (e?.message ?? e));
    } finally {
      setFetching(null);
    }
  };

  const selectSuggestion = async (idx: number, suggestion: any) => {
    setSuggestions([]);
    setSuggestingIdx(null);

    const targetSymbol = suggestion.symbol.toUpperCase();
    
    // Set temporary values and show loading state
    updatePosition(idx, {
      symbol: targetSymbol,
      name: suggestion.name || "",
      currentPrice: 0,
      currency: "BRL",
    });

    setFetching(idx);
    try {
      const details = await MarketDataService.getQuoteDetails(targetSymbol, "auto");
      if (!details || !details.price || details.price === 0) {
        toast.error("Cotação não encontrada");
        return;
      }
      
      const updates: Partial<Position> = {
        currentPrice: details.price,
        lastPriceAt: new Date().toISOString(),
      };
      
      if (details.name) {
        updates.name = details.name;
      }
      
      if (details.currency) {
        const upperCur = details.currency.toUpperCase();
        if (SUPPORTED_CURRENCIES.includes(upperCur as any)) {
          updates.currency = upperCur;
        }
      }
      
      updatePosition(idx, updates);
      toast.success(`${targetSymbol}: ${details.price} ${updates.currency || "BRL"}`);
    } catch (e: any) {
      toast.error("Falha ao buscar cotação: " + (e?.message ?? e));
    } finally {
      setFetching(null);
    }
  };

  // BRL-normalized totals via the centralized service (single source of truth).
  const totalsMetric = portfolioCalculationService.calculateInvestmentMetrics({
    name: "__editor__",
    mode: "DETAILED",
    positions: positions.map((p) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      averagePrice: p.averagePrice,
      currentPrice: p.currentPrice,
      currency: p.currency,
      fxRate: getFxRate(p.currency, fxRates),
    })),
  });
  const totalAppliedBRL = totalsMetric.investedValue;
  const totalValueBRL = totalsMetric.currentValue;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">Posições</Label>
          {fxRates && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              FX → BRL: USD {fxRates.USD?.toFixed(2)} · EUR {fxRates.EUR?.toFixed(2)} · GBP {fxRates.GBP?.toFixed(2)}
            </p>
          )}
        </div>
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
        {positions.map((p, idx) => {
          const rate = getFxRate(p.currency, fxRates);
          const m = portfolioCalculationService.calculatePositionMetricsBRL({
            symbol: p.symbol,
            quantity: p.quantity,
            averagePrice: p.averagePrice,
            currentPrice: p.currentPrice,
            currency: p.currency,
            fxRate: rate,
          });
          const valueBRL = m.currentValue;
          const appliedBRL = m.investedValue;
          return (
            <div key={idx} className="rounded-lg border border-border p-3 bg-muted/20 space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4 relative">
                  <Label className="text-xs">Símbolo</Label>
                  <Input
                    value={p.symbol}
                    placeholder="BTC, PETR4, GOOGL"
                    onChange={async (e) => {
                      const val = e.target.value.toUpperCase();
                      updatePosition(idx, { 
                        symbol: val,
                        currentPrice: 0,
                        name: "",
                        currency: "BRL"
                      });
                      
                      if (val.length >= 2) {
                        setSuggestingIdx(idx);
                        const results = await MarketDataService.searchSymbols(val);
                        setSuggestions(results);
                      } else {
                        setSuggestions([]);
                        setSuggestingIdx(null);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setSuggestions([]);
                        setSuggestingIdx(null);
                      }, 250);

                      if (p.symbol && (!p.currentPrice || p.currentPrice === 0)) {
                        fetchQuote(idx);
                      }
                    }}
                  />
                  {suggestingIdx === idx && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-md shadow-md p-1 space-y-0.5">
                      {suggestions.map((s) => (
                        <button
                          key={s.symbol}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors flex justify-between items-center gap-2"
                          onClick={() => selectSuggestion(idx, s)}
                        >
                          <span className="font-semibold">{s.symbol}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{s.name}</span>
                          {s.exchange && <span className="text-[9px] bg-secondary px-1 rounded text-secondary-foreground">{s.exchange}</span>}
                        </button>
                      ))}
                    </div>
                  )}
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
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
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

              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                <span>
                  Valor ({p.currency}):{" "}
                  <span className="font-mono text-foreground">
                    {(Number(p.currentValue) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </span>
                {p.currency !== "BRL" && (
                  <span>
                    FX: <span className="font-mono text-foreground">{rate.toFixed(4)}</span>
                  </span>
                )}
                <span>
                  Em BRL: <span className="font-mono text-foreground">{formatBRL(valueBRL)}</span>
                </span>
                <span className={m.profitPercent >= 0 ? "text-positive" : "text-negative"}>
                  {appliedBRL > 0 ? `${m.profitPercent >= 0 ? "+" : ""}${m.profitPercent.toFixed(2)}%` : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {positions.length > 0 && (
        <div className="rounded-lg bg-secondary/40 p-3 flex justify-between text-sm">
          <span className="text-muted-foreground">Totais (BRL)</span>
          <div className="flex gap-6 font-mono">
            <span>Aplicado: <strong>{formatBRL(totalAppliedBRL)}</strong></span>
            <span>Atual: <strong>{formatBRL(totalValueBRL)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionsEditor;

