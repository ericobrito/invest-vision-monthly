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
import type { Investment, IncomeType, Region } from "@/data/investments";

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

  useEffect(() => {
    if (investment) {
      setName(investment.name);
      setValue(String(investment.value));
      setApplied(investment.applied != null ? String(investment.applied) : "");
      setYearStarted(investment.yearStarted ?? "");
      setIncomeType(investment.incomeType || "fixed");
      setRegion(investment.region || "brazil");
    }
  }, [investment, open]);

  const computed = useMemo(() => {
    const v = Number(value) || 0;
    const a = Number(applied) || 0;
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
  }, [value, applied, yearStarted]);

  const handleSave = () => {
    if (!investment) return;
    onSave({
      ...investment,
      name,
      value: Number(value) || 0,
      applied: applied ? Number(applied) : undefined,
      yearStarted: yearStarted || undefined,
      totalReturn: computed.totalReturn != null ? Number(computed.totalReturn.toFixed(2)) : undefined,
      annualReturn: computed.annualReturn != null ? Number(computed.annualReturn.toFixed(2)) : undefined,
      incomeType,
      region,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Investimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

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
          <Button onClick={handleSave} disabled={!name || !value || isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentEditDialog;
