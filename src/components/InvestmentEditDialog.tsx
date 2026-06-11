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
import type { Investment, IncomeType, Region, ValueMode } from "@/data/investments";

interface InvestmentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
  onSave: (updated: Investment) => void;
  isSaving?: boolean;
}

const InvestmentEditDialog = ({
  open,
  onOpenChange,
  investment,
  onSave,
  isSaving,
}: InvestmentEditDialogProps) => {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [applied, setApplied] = useState("");
  const [yearStarted, setYearStarted] = useState("");
  const [incomeType, setIncomeType] = useState<IncomeType>("fixed");
  const [region, setRegion] = useState<Region>("brazil");
  const [includeInVariable, setIncludeInVariable] = useState(false);

  // Dynamic valuation
  const [valueMode, setValueMode] = useState<ValueMode>("MANUAL");
  const [provider, setProvider] = useState("");
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  useEffect(() => {
    if (investment) {
      setName(investment.name);
      setValue(String(investment.value));
      setApplied(investment.applied != null ? String(investment.applied) : "");
      setYearStarted(investment.yearStarted ?? "");
      setIncomeType(investment.incomeType || "fixed");
      setRegion(investment.region || "brazil");
      setIncludeInVariable(investment.flags?.includeInVariablePositions === true);
      setValueMode(investment.valueMode || "MANUAL");
      setProvider(investment.linkedAsset?.provider ?? "");
      setSymbol(investment.linkedAsset?.symbol ?? "");
      setQuantity(investment.quantity != null ? String(investment.quantity) : "");
      setAveragePrice(investment.averagePrice != null ? String(investment.averagePrice) : "");
      setCurrentPrice(investment.currentPrice != null ? String(investment.currentPrice) : "");
    }
  }, [investment, open]);

  // For AUTO/HYBRID, derive value from quantity * currentPrice when possible
  const effectiveValue = useMemo(() => {
    const qty = Number(quantity) || 0;
    const cp = Number(currentPrice) || 0;
    if ((valueMode === "AUTO" || valueMode === "HYBRID") && qty > 0 && cp > 0) {
      return qty * cp;
    }
    return Number(value) || 0;
  }, [valueMode, quantity, currentPrice, value]);

  const effectiveApplied = useMemo(() => {
    const qty = Number(quantity) || 0;
    const ap = Number(averagePrice) || 0;
    if (qty > 0 && ap > 0) return qty * ap;
    return Number(applied) || 0;
  }, [quantity, averagePrice, applied]);

  const computed = useMemo(() => {
    const v = effectiveValue;
    const a = effectiveApplied;
    const totalReturn = a > 0 ? ((v - a) / a) * 100 : undefined;
    let annualReturn: number | undefined;
    if (yearStarted && a > 0 && v > 0) {
      const start = new Date(yearStarted.length === 4 ? `${yearStarted}-01-01` : yearStarted);
      const years = (new Date().getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (years > 0) {
        annualReturn = (Math.pow(v / a, 1 / years) - 1) * 100;
      }
    }
    return { totalReturn, annualReturn };
  }, [effectiveValue, effectiveApplied, yearStarted]);

  const handleSave = () => {
    if (!investment) return;
    const qty = quantity ? Number(quantity) : undefined;
    const ap = averagePrice ? Number(averagePrice) : undefined;
    const cp = currentPrice ? Number(currentPrice) : undefined;

    const linkedAsset =
      valueMode !== "MANUAL" && provider.trim() && symbol.trim()
        ? { provider: provider.trim(), symbol: symbol.trim().toUpperCase() }
        : undefined;

    const finalValue =
      (valueMode === "AUTO" || valueMode === "HYBRID") && qty && cp ? qty * cp : Number(value) || 0;
    const finalApplied =
      qty && ap ? qty * ap : applied ? Number(applied) : undefined;

    onSave({
      ...investment,
      name,
      value: finalValue,
      applied: finalApplied,
      yearStarted: yearStarted || undefined,
      totalReturn: computed.totalReturn != null ? Number(computed.totalReturn.toFixed(2)) : undefined,
      annualReturn: computed.annualReturn != null ? Number(computed.annualReturn.toFixed(2)) : undefined,
      incomeType,
      region,
      flags: {
        ...(investment.flags || {}),
        includeInVariablePositions: includeInVariable,
      },
      valueMode,
      linkedAsset,
      quantity: qty,
      averagePrice: ap,
      currentPrice: cp,
      investedAmount: finalApplied,
      lastPriceAt: cp ? new Date().toISOString() : investment.lastPriceAt,
    });
  };

  const showLinkFields = valueMode === "HYBRID" || valueMode === "AUTO";
  const valueIsAuto = valueMode === "AUTO" || (valueMode === "HYBRID" && Number(quantity) > 0 && Number(currentPrice) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Investimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label>Modo de valoração</Label>
            <Select value={valueMode} onValueChange={(v) => setValueMode(v as ValueMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual — valor inserido manualmente</SelectItem>
                <SelectItem value="HYBRID">Híbrido — quantidade × preço (editável)</SelectItem>
                <SelectItem value="AUTO">Automático — vinculado a ativo via API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showLinkFields && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 bg-muted/30">
              <div>
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bybit">Bybit</SelectItem>
                    <SelectItem value="coinbase">Coinbase</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="brapi">B3 (BRAPI)</SelectItem>
                    <SelectItem value="yahoo">Yahoo Finance</SelectItem>
                    <SelectItem value="coingecko">CoinGecko</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Símbolo</Label>
                <Input
                  placeholder="BTC, PETR4..."
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label>Preço médio (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={averagePrice}
                  onChange={(e) => setAveragePrice(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label>Preço atual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>
                Valor Atual (R$)
                {valueIsAuto && <span className="text-xs text-muted-foreground ml-1">(auto)</span>}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={valueIsAuto ? effectiveValue.toFixed(2) : value}
                onChange={(e) => setValue(e.target.value)}
                disabled={valueIsAuto}
              />
            </div>
            <div>
              <Label>
                Valor Aplicado (R$)
                {Number(quantity) > 0 && Number(averagePrice) > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">(auto)</span>
                )}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={
                  Number(quantity) > 0 && Number(averagePrice) > 0
                    ? effectiveApplied.toFixed(2)
                    : applied
                }
                onChange={(e) => setApplied(e.target.value)}
                disabled={Number(quantity) > 0 && Number(averagePrice) > 0}
              />
            </div>
          </div>

          <div>
            <Label>Data do Aporte</Label>
            <Input type="date" value={yearStarted} onChange={(e) => setYearStarted(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de Renda</Label>
              <Select value={incomeType} onValueChange={(v) => setIncomeType(v as IncomeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Renda Fixa</SelectItem>
                  <SelectItem value="variable">Renda Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Região</Label>
              <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brazil">Brasil</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
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

          {/* Auto-calculated preview */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Calculado automaticamente</p>
            <div className="flex gap-6 text-sm">
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
