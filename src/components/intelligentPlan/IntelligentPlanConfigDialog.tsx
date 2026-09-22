import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntelligentPlanConfig } from "@/features/intelligentPlan/types";
import { Settings, Save, RefreshCw } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: IntelligentPlanConfig;
  onSaveConfig: (newConfig: IntelligentPlanConfig) => void;
}

export default function IntelligentPlanConfigDialog({
  open,
  onOpenChange,
  config,
  onSaveConfig,
}: Props) {
  const [formData, setFormData] = useState<IntelligentPlanConfig>(config);

  const handleSave = () => {
    onSaveConfig(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Settings className="w-5 h-5 text-primary" />
            Configurações do Plano Inteligente
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ajuste os parâmetros de metas de caixa de oportunidade, limites fiscais e regras de concentração da sua estratégia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Opportunity Cash Config */}
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Caixa de Oportunidade (Separação da Reserva de Emergência)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Meta de Caixa (R$):</Label>
                <Input
                  type="number"
                  value={formData.opportunityCashTargetBRL}
                  onChange={(e) =>
                    setFormData({ ...formData, opportunityCashTargetBRL: Number(e.target.value) || 0 })
                  }
                  className="h-8 bg-background border-border text-xs text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Caixa Atual (R$):</Label>
                <Input
                  type="number"
                  value={formData.currentOpportunityCashBRL}
                  onChange={(e) =>
                    setFormData({ ...formData, currentOpportunityCashBRL: Number(e.target.value) || 0 })
                  }
                  className="h-8 bg-background border-border text-xs text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Min Profit Realization Threshold & Fixed Income Floor */}
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Piso de Rentabilidade & Renda Fixa (Hurdle Rate)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Piso Renda Fixa / CDI (% a.a.):</Label>
                <Input
                  type="number"
                  value={formData.fixedIncomeHurdleRatePct ?? 12}
                  onChange={(e) =>
                    setFormData({ ...formData, fixedIncomeHurdleRatePct: Number(e.target.value) || 12 })
                  }
                  className="h-8 bg-background border-border text-xs text-foreground font-bold text-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Rentabilidade Mínima (%):</Label>
                <Input
                  type="number"
                  value={formData.minProfitRealizationPct ?? 20}
                  onChange={(e) =>
                    setFormData({ ...formData, minProfitRealizationPct: Number(e.target.value) || 20 })
                  }
                  className="h-8 bg-background border-border text-xs text-foreground"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Nenhuma venda parcial de Renda Variável será recomendada se a rentabilidade do ativo estiver abaixo do piso da Renda Fixa ({formData.fixedIncomeHurdleRatePct ?? 12}% a.a.), garantindo retenção para buscar prêmio de risco.
            </p>
          </div>

          {/* Crypto Tax Threshold */}
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Otimização Tributária Cripto
            </h4>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Limite Mensal de Isenção Consolidado (R$):</Label>
              <Input
                type="number"
                value={formData.cryptoMonthlyThresholdBRL}
                onChange={(e) =>
                  setFormData({ ...formData, cryptoMonthlyThresholdBRL: Number(e.target.value) || 35000 })
                }
                className="h-8 bg-background border-border text-xs text-foreground"
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Limite consolidado somando todas as exchanges (Binance, Coinbase, Bybit, Mercado Bitcoin, etc).
              </p>
            </div>
          </div>

          {/* Re-entry benchmark */}
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Plano de Reentrada — Benchmark
            </h4>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Benchmark de Referência:</Label>
              <select
                value={formData.reEntryBenchmark}
                onChange={(e) => setFormData({ ...formData, reEntryBenchmark: e.target.value })}
                className="w-full h-8 bg-background border border-border rounded-md px-2 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="S&P 500">S&P 500 (Ações EUA)</option>
                <option value="Nasdaq 100">Nasdaq 100 (Tecnologia)</option>
                <option value="Bitcoin">Bitcoin (Cripto Principal)</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs bg-primary text-primary-foreground font-bold">
            <Save className="w-4 h-4" />
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
