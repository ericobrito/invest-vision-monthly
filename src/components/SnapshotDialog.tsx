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
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MonthlySnapshot, IncomeType, Region } from "@/data/investments";
import { computeDerivedFields } from "@/hooks/useSnapshots";
import type { SnapshotFormData } from "@/hooks/useSnapshots";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InvestmentRow {
  name: string;
  value: string;
  applied: string;
  totalReturn: string;
  annualReturn: string;
  yearStarted: string;
  incomeType: IncomeType;
  region: Region;
}

interface SnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SnapshotFormData, existingMonth?: string) => void;
  snapshot?: MonthlySnapshot;
  allSnapshots?: MonthlySnapshot[];
  isSaving?: boolean;
}

const SnapshotDialog = ({ open, onOpenChange, onSave, snapshot, allSnapshots = [], isSaving }: SnapshotDialogProps) => {
  const isEdit = !!snapshot;

  const [month, setMonth] = useState("");
  const [label, setLabel] = useState("");
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);

  useEffect(() => {
    if (snapshot) {
      setMonth(snapshot.month);
      setLabel(snapshot.label);
      setInvestments(
        snapshot.investments.map((inv) => ({
          name: inv.name,
          value: String(inv.value),
          applied: inv.applied != null ? String(inv.applied) : "",
          totalReturn: inv.totalReturn != null ? String(inv.totalReturn) : "",
          annualReturn: inv.annualReturn != null ? String(inv.annualReturn) : "",
          yearStarted: inv.yearStarted ?? "",
          incomeType: inv.incomeType || 'fixed',
          region: inv.region || 'brazil',
        }))
      );
    } else {
      setMonth("");
      setLabel("");
      setInvestments([]);
    }
  }, [snapshot, open]);

  // Auto-calculated values
  const computed = useMemo(() => {
    const invData = investments
      .filter((inv) => inv.name && inv.value)
      .map((inv) => {
        const value = Number(inv.value) || 0;
        const applied = Number(inv.applied) || 0;
        const totalReturn = applied > 0 ? Number((((value - applied) / applied) * 100).toFixed(2)) : undefined;
        let annualReturn: number | undefined;
        if (totalReturn != null && inv.yearStarted) {
          const startDate = new Date(inv.yearStarted);
          const now = new Date();
          const years = (now.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (years > 0 && applied > 0) {
            annualReturn = Number(((Math.pow(value / applied, 1 / years) - 1) * 100).toFixed(2));
          }
        }
        return {
          name: inv.name,
          value,
          percentage: 0,
          applied,
          totalReturn,
          annualReturn,
          yearStarted: inv.yearStarted || undefined,
          incomeType: inv.incomeType,
          region: inv.region,
        };
      });
    const total = invData.reduce((s, i) => s + i.value, 0);
    invData.forEach(i => { i.percentage = total > 0 ? Number(((i.value / total) * 100).toFixed(2)) : 0; });

    return { derived: computeDerivedFields(invData, allSnapshots, month), invData };
  }, [investments, allSnapshots, month]);

  const addInvestment = () => {
    setInvestments([...investments, { name: "", value: "", applied: "", totalReturn: "", annualReturn: "", yearStarted: "", incomeType: "fixed", region: "brazil" }]);
  };

  const removeInvestment = (index: number) => {
    setInvestments(investments.filter((_, i) => i !== index));
  };

  const updateInvestment = (index: number, field: string, value: string) => {
    setInvestments(investments.map((inv, i) => (i === index ? { ...inv, [field]: value } : inv)));
  };

  const handleSubmit = () => {
    const data: SnapshotFormData = {
      month,
      label,
      total: computed.derived.total,
      changeValue: computed.derived.changeValue,
      changePercentage: computed.derived.changePercentage,
      fixedIncome: computed.derived.fixedIncome,
      variableIncome: computed.derived.variableIncome,
      brazil: computed.derived.brazil,
      exterior: computed.derived.exterior,
      growth2025: computed.derived.growth2025,
      investments: computed.invData,
    };
    onSave(data, isEdit ? snapshot.month : undefined);
  };

  const fmt = (v?: number) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
  const pct = (v?: number) => v != null ? `${v.toFixed(2)}%` : "—";
  const d = computed.derived;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Mês" : "Adicionar Novo Mês"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mês (ex: 2025-04)</Label>
                <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="2025-04" />
              </div>
              <div>
                <Label>Label (ex: Abr 2025)</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Abr 2025" />
              </div>
            </div>

            {/* Auto-calculated summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Valores calculados automaticamente</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-semibold">{fmt(d.total)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Variação:</span>
                  <p className="font-semibold">{fmt(d.changeValue)} ({pct(d.changePercentage)})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Renda Fixa:</span>
                  <p className="font-semibold">{pct(d.fixedIncome)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Renda Variável:</span>
                  <p className="font-semibold">{pct(d.variableIncome)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Brasil:</span>
                  <p className="font-semibold">{pct(d.brazil)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Exterior:</span>
                  <p className="font-semibold">{pct(d.exterior)}</p>
                </div>
                {d.growth2025 != null && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Cresc. 2025:</span>
                    <p className="font-semibold">{fmt(d.growth2025)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Investments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Investimentos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInvestment}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>

              <div className="space-y-3">
                {investments.map((inv, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">#{i + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeInvestment(i)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Input placeholder="Nome" value={inv.name} onChange={(e) => updateInvestment(i, "name", e.target.value)} />
                      </div>
                      <Input type="number" step="0.01" placeholder="Valor (R$)" value={inv.value} onChange={(e) => updateInvestment(i, "value", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={inv.incomeType} onValueChange={(v) => updateInvestment(i, "incomeType", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Renda Fixa</SelectItem>
                          <SelectItem value="variable">Renda Variável</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={inv.region} onValueChange={(v) => updateInvestment(i, "region", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Região" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brazil">Brasil</SelectItem>
                          <SelectItem value="exterior">Exterior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" step="0.01" placeholder="Valor Aplicado (R$)" value={inv.applied} onChange={(e) => updateInvestment(i, "applied", e.target.value)} />
                      <Input type="date" placeholder="Data do aporte" value={inv.yearStarted} onChange={(e) => updateInvestment(i, "yearStarted", e.target.value)} />
                    </div>
                    {(() => {
                      const value = Number(inv.value) || 0;
                      const applied = Number(inv.applied) || 0;
                      const totalRet = applied > 0 ? (((value - applied) / applied) * 100).toFixed(2) : null;
                      let annualRet: string | null = null;
                      if (inv.yearStarted && applied > 0 && value > 0) {
                        const years = (new Date().getTime() - new Date(inv.yearStarted).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                        if (years > 0) annualRet = ((Math.pow(value / applied, 1 / years) - 1) * 100).toFixed(2);
                      }
                      return (totalRet || annualRet) ? (
                        <div className="flex gap-4 text-xs text-muted-foreground px-1">
                          {totalRet && <span>Rent. Total: <strong>{totalRet}%</strong></span>}
                          {annualRet && <span>Rent. Anual: <strong>{annualRet}%</strong></span>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}

                {investments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum investimento adicionado. Clique em "Adicionar" acima.
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!month || !label || investments.length === 0 || isSaving}>
            {isSaving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Mês"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SnapshotDialog;
