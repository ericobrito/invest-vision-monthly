import { useState, useMemo } from "react";
import type { CapitalChainTrail, CapitalChainStep } from "@/features/intelligentPlan/capitalChainTypes";
import { capitalChainService } from "@/features/intelligentPlan/capitalChainService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GitMerge,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Layers,
  Sparkles,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  DollarSign,
  Repeat,
} from "lucide-react";

export default function CapitalChainTracker() {
  const [trails, setTrails] = useState<CapitalChainTrail[]>(() => capitalChainService.getTrails());

  // Modal State for New Trail
  const [showNewTrailModal, setShowNewTrailModal] = useState(false);
  const [newTrailTitle, setNewTrailTitle] = useState("");
  const [newTrailCategory, setNewTrailCategory] = useState<"Ação EUA" | "Ação Brasil" | "Criptoativo" | "Mista">("Criptoativo");
  const [newTrailSeed, setNewTrailSeed] = useState("1000");
  const [firstStepSymbol, setFirstStepSymbol] = useState("ETH");
  const [firstStepCurrentVal, setFirstStepCurrentVal] = useState("3000");

  // Modal State for Adding Step (Reinvestment)
  const [activeTrailForStep, setActiveTrailForStep] = useState<CapitalChainTrail | null>(null);
  const [nextStepSymbol, setNextStepSymbol] = useState("BTC");
  const [nextStepName, setNextStepName] = useState("Bitcoin (Recompra)");
  const [nextStepReinvested, setNextStepReinvested] = useState("3000");
  const [nextStepCurrentVal, setNextStepCurrentVal] = useState("6000");

  const refreshTrails = () => {
    setTrails(capitalChainService.getTrails());
  };

  const totals = useMemo(() => {
    let seedSum = 0;
    let currentSum = 0;
    let profitSum = 0;

    trails.forEach((t) => {
      seedSum += t.initialSeedBRL;
      currentSum += t.currentValueBRL;
      profitSum += t.totalProfitBRL;
    });

    const overallReturnPct = seedSum > 0 ? ((currentSum - seedSum) / seedSum) * 100 : 0;
    const overallMultiplier = seedSum > 0 ? currentSum / seedSum : 1.0;

    return { seedSum, currentSum, profitSum, overallReturnPct, overallMultiplier };
  }, [trails]);

  const handleCreateTrail = () => {
    if (!newTrailTitle.trim()) return;

    const seed = Number(newTrailSeed) || 1000;
    const firstVal = Number(firstStepCurrentVal) || 3000;
    const now = new Date().toISOString().split("T")[0];

    const newStep: Omit<CapitalChainStep, "id" | "stepIndex"> = {
      symbol: firstStepSymbol.toUpperCase().trim() || "ATIVO",
      name: `${firstStepSymbol.toUpperCase().trim()} (Etapa 1)`,
      startDate: now,
      initialAmountBRL: seed,
      finalAmountBRL: firstVal,
      profitBRL: firstVal - seed,
      returnPct: seed > 0 ? ((firstVal - seed) / seed) * 100 : 0,
      status: "COMPLETED",
      notes: "Aporte semente original.",
    };

    capitalChainService.createTrail({
      title: newTrailTitle,
      category: newTrailCategory,
      initialSeedBRL: seed,
      currentValueBRL: firstVal,
      totalProfitBRL: firstVal - seed,
      status: "ACTIVE",
      steps: [
        {
          ...newStep,
          id: `step-1-${Date.now()}`,
          stepIndex: 1,
        },
      ],
    });

    setShowNewTrailModal(false);
    setNewTrailTitle("");
    refreshTrails();
  };

  const handleAddStep = () => {
    if (!activeTrailForStep) return;

    const reinvested = Number(nextStepReinvested) || 3000;
    const currentVal = Number(nextStepCurrentVal) || 6000;
    const now = new Date().toISOString().split("T")[0];

    capitalChainService.addStepToTrail(activeTrailForStep.id, {
      symbol: nextStepSymbol.toUpperCase().trim() || "RECOMPRA",
      name: nextStepName || `${nextStepSymbol} (Recompra)`,
      startDate: now,
      initialAmountBRL: reinvested,
      finalAmountBRL: currentVal,
      profitBRL: currentVal - reinvested,
      returnPct: reinvested > 0 ? ((currentVal - reinvested) / reinvested) * 100 : 0,
      status: "ACTIVE",
      notes: `Reinvestimento gerado pelo encadear de lucros.`,
    });

    setActiveTrailForStep(null);
    refreshTrails();
  };

  const handleDeleteTrail = (id: string) => {
    if (confirm("Deseja realmente remover esta trilha de reinvestimento?")) {
      capitalChainService.deleteTrail(id);
      refreshTrails();
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER BANNER WITH COMPOUND RETURN METRICS */}
      <Card className="bg-gradient-to-r from-card via-card/90 to-primary/10 border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-primary animate-pulse" />
                <h3 className="text-base font-bold text-foreground font-mono tracking-tight">
                  Controlador de Trilhas de Reinvestimento (Rentabilidade Composta)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Acompanhe o ganho acumulado do seu capital semente ao longo de vendas parciais e recompras sucessivas. Exemplo: R$ 1.000 no ETH ➔ R$ 3.000 (+200%) reinvestidos no BTC ➔ R$ 6.000 (+100%), totalizando <strong className="text-emerald-500 font-mono">+500,0% (6.0x)</strong> de rentabilidade composta histórica.
              </p>
            </div>

            <Button
              onClick={() => setShowNewTrailModal(true)}
              size="sm"
              className="gap-2 bg-primary text-primary-foreground font-bold shrink-0 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Nova Trilha de Recompra
            </Button>
          </div>

          {/* METRICS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
              <span className="text-[11px] text-muted-foreground">Aporte Semente Total:</span>
              <div className="text-sm font-bold text-foreground font-mono mt-0.5">
                R$ {totals.seedSum.toLocaleString()}
              </div>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
              <span className="text-[11px] text-muted-foreground">Saldo Atual nas Trilhas:</span>
              <div className="text-sm font-bold text-foreground font-mono mt-0.5">
                R$ {totals.currentSum.toLocaleString()}
              </div>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
              <span className="text-[11px] text-muted-foreground">Lucro Total Acumulado:</span>
              <div className="text-sm font-bold text-emerald-500 font-mono mt-0.5">
                +R$ {totals.profitSum.toLocaleString()}
              </div>
            </div>
            <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/30">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Rentabilidade Composta:</span>
              <div className="text-base font-extrabold text-emerald-500 font-mono mt-0.5 flex items-center gap-1">
                +{totals.overallReturnPct.toFixed(1)}% <span className="text-xs text-muted-foreground font-normal">({totals.overallMultiplier.toFixed(1)}x)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TRAILS LIST */}
      <div className="space-y-4">
        {trails.length === 0 ? (
          <Card className="bg-card border-border p-8 text-center text-muted-foreground text-xs">
            Nenhuma trilha de reinvestimento registrada. Clique em "Nova Trilha de Recompra" para cadastrar seu primeiro ciclo.
          </Card>
        ) : (
          trails.map((trail) => (
            <Card key={trail.id} className="bg-card border-border hover:border-border/80 transition-all shadow-sm">
              <CardHeader className="p-4 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      {trail.title}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] bg-muted border-border">
                      {trail.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Criado em {trail.createdAt} • {trail.steps.length} {trail.steps.length === 1 ? "etapa registrada" : "etapas encadeadas"}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs px-2.5 py-1 font-mono font-bold">
                    {trail.multiplier.toFixed(1)}x ({trail.compoundReturnPct >= 0 ? "+" : ""}{trail.compoundReturnPct.toFixed(1)}%)
                  </Badge>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      const lastStep = trail.steps[trail.steps.length - 1];
                      setActiveTrailForStep(trail);
                      setNextStepReinvested(String(lastStep.finalAmountBRL));
                      setNextStepCurrentVal(String(lastStep.finalAmountBRL * 1.5));
                    }}
                    className="h-7 text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/10 font-bold"
                  >
                    <Repeat className="w-3.5 h-3.5" /> Vincular Recompra
                  </Button>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleDeleteTrail(trail.id)}
                    className="h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* TIMELINE / CHAIN FLOW DIAGRAM */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Trilha Visual do Capital:
                  </span>

                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 overflow-x-auto pb-1">
                    {/* SEED NODE */}
                    <div className="bg-muted/60 p-3 rounded-lg border border-border shrink-0 text-xs flex flex-col justify-between min-w-[140px]">
                      <span className="text-[10px] text-muted-foreground font-semibold">1. Aporte Semente</span>
                      <div className="font-bold text-foreground font-mono text-xs mt-1">
                        R$ {trail.initialSeedBRL.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">Capital Original</span>
                    </div>

                    {/* STEPS NODES */}
                    {trail.steps.map((step, idx) => (
                      <div key={step.id} className="contents">
                        <div className="hidden md:flex items-center text-muted-foreground shrink-0 px-1">
                          <ArrowRight className="w-4 h-4 text-primary" />
                        </div>

                        <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between min-w-[200px] shrink-0 ${
                          step.status === "ACTIVE"
                            ? "bg-primary/5 border-primary/40 text-foreground"
                            : "bg-muted/30 border-border text-foreground"
                        }`}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-foreground font-mono">{step.symbol}</span>
                            <Badge variant="outline" className={`text-[9px] ${step.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                              {step.status === "ACTIVE" ? "Posição Ativa" : `Etapa ${step.stepIndex}`}
                            </Badge>
                          </div>

                          <div className="my-1.5 space-y-0.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">Entrada:</span>
                              <span className="font-mono text-foreground">R$ {step.initialAmountBRL.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">Saída / Atual:</span>
                              <span className="font-mono font-bold text-foreground">R$ {step.finalAmountBRL.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border text-[11px]">
                            <span className="text-muted-foreground">Ganho da Etapa:</span>
                            <span className={`font-bold font-mono ${step.returnPct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {step.returnPct >= 0 ? "+" : ""}{step.returnPct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SUMMARY FOOTER */}
                <div className="bg-muted/20 p-3 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="text-muted-foreground">
                      Resultado Composto: <strong className="text-foreground">R$ {trail.initialSeedBRL.toLocaleString()}</strong> multiplicados por <strong className="text-emerald-500">{trail.multiplier.toFixed(1)}x</strong> atingindo <strong className="text-foreground">R$ {trail.currentValueBRL.toLocaleString()}</strong>.
                    </span>
                  </div>
                  <div className="font-mono font-bold text-emerald-500 text-xs shrink-0 self-end sm:self-auto">
                    Lucro Absoluto: +R$ {trail.totalProfitBRL.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MODAL: NOVA TRILHA */}
      <Dialog open={showNewTrailModal} onOpenChange={setShowNewTrailModal}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <PlusCircle className="w-5 h-5 text-primary" />
              Nova Trilha de Recompra
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre o aporte semente original e o primeiro ativo da cadeia para acompanhar o retorno composto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Título da Trilha:</Label>
              <Input
                placeholder="Ex: Ciclo Cripto 2024: ETH ➔ BTC"
                value={newTrailTitle}
                onChange={(e) => setNewTrailTitle(e.target.value)}
                className="h-8 bg-background border-border text-xs text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Aporte Semente (R$):</Label>
                <Input
                  type="number"
                  value={newTrailSeed}
                  onChange={(e) => setNewTrailSeed(e.target.value)}
                  className="h-8 bg-background border-border text-xs text-foreground font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Categoria:</Label>
                <select
                  value={newTrailCategory}
                  onChange={(e) => setNewTrailCategory(e.target.value as any)}
                  className="w-full h-8 bg-background border border-border rounded-md px-2 text-xs text-foreground"
                >
                  <option value="Criptoativo">Criptoativo</option>
                  <option value="Ação EUA">Ação EUA</option>
                  <option value="Ação Brasil">Ação Brasil</option>
                  <option value="Mista">Mista</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
              <span className="font-bold text-foreground text-xs uppercase tracking-wider block">
                Primeira Etapa (Ativo Inicial)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ticker / Ativo:</Label>
                  <Input
                    placeholder="Ex: ETH"
                    value={firstStepSymbol}
                    onChange={(e) => setFirstStepSymbol(e.target.value)}
                    className="h-8 bg-background border-border text-xs text-foreground font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Valor de Venda/Atual (R$):</Label>
                  <Input
                    type="number"
                    value={firstStepCurrentVal}
                    onChange={(e) => setFirstStepCurrentVal(e.target.value)}
                    className="h-8 bg-background border-border text-xs text-foreground font-mono text-emerald-500 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewTrailModal(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateTrail} className="text-xs bg-primary text-primary-foreground font-bold">
              Criar Trilha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: VINCULAR RECOMPRA (NOVA ETAPA) */}
      <Dialog open={!!activeTrailForStep} onOpenChange={(open) => !open && setActiveTrailForStep(null)}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Repeat className="w-5 h-5 text-primary" />
              Vincular Recompra / Nova Etapa
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Adicione a nova etapa de reinvestimento vinculando o capital gerado pela etapa anterior.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
              <span className="text-muted-foreground">Trilha Selecionada:</span>
              <div className="font-bold text-foreground font-mono">{activeTrailForStep?.title}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ticker Novo Ativo:</Label>
                <Input
                  placeholder="Ex: BTC"
                  value={nextStepSymbol}
                  onChange={(e) => setNextStepSymbol(e.target.value)}
                  className="h-8 bg-background border-border text-xs text-foreground font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome do Ativo:</Label>
                <Input
                  placeholder="Ex: Bitcoin (Recompra)"
                  value={nextStepName}
                  onChange={(e) => setNextStepName(e.target.value)}
                  className="h-8 bg-background border-border text-xs text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Capital Reinvestido (R$):</Label>
                <Input
                  type="number"
                  value={nextStepReinvested}
                  onChange={(e) => setNextStepReinvested(e.target.value)}
                  className="h-8 bg-background border-border text-xs text-foreground font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor Atualizado (R$):</Label>
                <Input
                  type="number"
                  value={nextStepCurrentVal}
                  onChange={(e) => setNextStepCurrentVal(e.target.value)}
                  className="h-8 bg-background border-border text-xs text-foreground font-mono text-emerald-500 font-bold"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveTrailForStep(null)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAddStep} className="text-xs bg-primary text-primary-foreground font-bold">
              Salvar Recompra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
