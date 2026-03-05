import { useState, useEffect } from "react";
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
import type { MonthlySnapshot } from "@/data/investments";
import type { SnapshotFormData } from "@/hooks/useSnapshots";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SnapshotFormData, existingMonth?: string) => void;
  snapshot?: MonthlySnapshot;
  isSaving?: boolean;
}

const SnapshotDialog = ({ open, onOpenChange, onSave, snapshot, isSaving }: SnapshotDialogProps) => {
  const isEdit = !!snapshot;

  const [month, setMonth] = useState("");
  const [label, setLabel] = useState("");
  const [total, setTotal] = useState("");
  const [changeValue, setChangeValue] = useState("");
  const [changePercentage, setChangePercentage] = useState("");
  const [fixedIncome, setFixedIncome] = useState("");
  const [variableIncome, setVariableIncome] = useState("");
  const [brazil, setBrazil] = useState("");
  const [exterior, setExterior] = useState("");
  const [growth2025, setGrowth2025] = useState("");
  const [investments, setInvestments] = useState<
    { name: string; value: string; percentage: string; applied: string; totalReturn: string; annualReturn: string; yearStarted: string }[]
  >([]);

  useEffect(() => {
    if (snapshot) {
      setMonth(snapshot.month);
      setLabel(snapshot.label);
      setTotal(String(snapshot.total));
      setChangeValue(snapshot.change?.value != null ? String(snapshot.change.value) : "");
      setChangePercentage(snapshot.change?.percentage != null ? String(snapshot.change.percentage) : "");
      setFixedIncome(snapshot.fixedIncome != null ? String(snapshot.fixedIncome) : "");
      setVariableIncome(snapshot.variableIncome != null ? String(snapshot.variableIncome) : "");
      setBrazil(snapshot.brazil != null ? String(snapshot.brazil) : "");
      setExterior(snapshot.exterior != null ? String(snapshot.exterior) : "");
      setGrowth2025(snapshot.growth2025 != null ? String(snapshot.growth2025) : "");
      setInvestments(
        snapshot.investments.map((inv) => ({
          name: inv.name,
          value: String(inv.value),
          percentage: String(inv.percentage),
          applied: inv.applied != null ? String(inv.applied) : "",
          totalReturn: inv.totalReturn != null ? String(inv.totalReturn) : "",
          annualReturn: inv.annualReturn != null ? String(inv.annualReturn) : "",
          yearStarted: inv.yearStarted ?? "",
        }))
      );
    } else {
      setMonth("");
      setLabel("");
      setTotal("");
      setChangeValue("");
      setChangePercentage("");
      setFixedIncome("");
      setVariableIncome("");
      setBrazil("");
      setExterior("");
      setGrowth2025("");
      setInvestments([]);
    }
  }, [snapshot, open]);

  const addInvestment = () => {
    setInvestments([...investments, { name: "", value: "", percentage: "", applied: "", totalReturn: "", annualReturn: "", yearStarted: "" }]);
  };

  const removeInvestment = (index: number) => {
    setInvestments(investments.filter((_, i) => i !== index));
  };

  const updateInvestment = (index: number, field: string, value: string) => {
    setInvestments(investments.map((inv, i) => (i === index ? { ...inv, [field]: value } : inv)));
  };

  const handleSubmit = () => {
    const num = (v: string) => (v ? Number(v) : undefined);
    const data: SnapshotFormData = {
      month,
      label,
      total: Number(total),
      changeValue: num(changeValue),
      changePercentage: num(changePercentage),
      fixedIncome: num(fixedIncome),
      variableIncome: num(variableIncome),
      brazil: num(brazil),
      exterior: num(exterior),
      growth2025: num(growth2025),
      investments: investments
        .filter((inv) => inv.name && inv.value)
        .map((inv) => ({
          name: inv.name,
          value: Number(inv.value),
          percentage: Number(inv.percentage) || 0,
          applied: inv.applied ? Number(inv.applied) : undefined,
          totalReturn: inv.totalReturn ? Number(inv.totalReturn) : undefined,
          annualReturn: inv.annualReturn ? Number(inv.annualReturn) : undefined,
          yearStarted: inv.yearStarted || undefined,
        })),
    };
    onSave(data, isEdit ? snapshot.month : undefined);
  };

  // Auto-calculate total from investments
  const recalcTotal = () => {
    const sum = investments.reduce((acc, inv) => acc + (Number(inv.value) || 0), 0);
    setTotal(sum.toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Mês" : "Adicionar Novo Mês"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Total (R$)</Label>
                <Input type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>
              <div>
                <Label>Variação (R$)</Label>
                <Input type="number" step="0.01" value={changeValue} onChange={(e) => setChangeValue(e.target.value)} />
              </div>
              <div>
                <Label>Variação (%)</Label>
                <Input type="number" step="0.01" value={changePercentage} onChange={(e) => setChangePercentage(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Renda Fixa (%)</Label>
                <Input type="number" step="0.01" value={fixedIncome} onChange={(e) => setFixedIncome(e.target.value)} />
              </div>
              <div>
                <Label>Renda Variável (%)</Label>
                <Input type="number" step="0.01" value={variableIncome} onChange={(e) => setVariableIncome(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Brasil (%)</Label>
                <Input type="number" step="0.01" value={brazil} onChange={(e) => setBrazil(e.target.value)} />
              </div>
              <div>
                <Label>Exterior (%)</Label>
                <Input type="number" step="0.01" value={exterior} onChange={(e) => setExterior(e.target.value)} />
              </div>
              <div>
                <Label>Crescimento 2025 (R$)</Label>
                <Input type="number" step="0.01" value={growth2025} onChange={(e) => setGrowth2025(e.target.value)} />
              </div>
            </div>

            {/* Investments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Investimentos</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={recalcTotal}>
                    Recalcular Total
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addInvestment}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </div>
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
                      <Input type="number" step="0.01" placeholder="Valor" value={inv.value} onChange={(e) => updateInvestment(i, "value", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Input type="number" step="0.01" placeholder="%" value={inv.percentage} onChange={(e) => updateInvestment(i, "percentage", e.target.value)} />
                      <Input type="number" step="0.01" placeholder="Aplicado" value={inv.applied} onChange={(e) => updateInvestment(i, "applied", e.target.value)} />
                      <Input type="number" step="0.01" placeholder="Rent. Total %" value={inv.totalReturn} onChange={(e) => updateInvestment(i, "totalReturn", e.target.value)} />
                      <Input type="number" step="0.01" placeholder="Rent. Anual %" value={inv.annualReturn} onChange={(e) => updateInvestment(i, "annualReturn", e.target.value)} />
                    </div>
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
          <Button onClick={handleSubmit} disabled={!month || !label || !total || isSaving}>
            {isSaving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Mês"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SnapshotDialog;
