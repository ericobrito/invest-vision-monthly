import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, 
  Trophy, 
  Target, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Calendar,
  Wallet,
  Coins,
  ChevronRight
} from "lucide-react";
import { useWealthGoals, type WealthGoalRecord, type WealthGoals as GoalsType } from "@/hooks/useWealthGoals";
import { useSnapshots } from "@/hooks/useSnapshots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";

const WealthGoalsManager = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: snapshots, isLoading: isLoadingSnapshots } = useSnapshots();
  
  const {
    goals,
    records,
    isLoadingGoals,
    isLoadingRecords,
    updateGoals,
    saveRecord,
    deleteRecord
  } = useWealthGoals();

  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [goalsForm, setGoalsForm] = useState<GoalsType>(goals);

  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<WealthGoalRecord> | null>(null);
  const [recordForm, setRecordForm] = useState({
    month: new Date().toISOString().substring(0, 7), // YYYY-MM
    actual_aporte: "",
    actual_fixed_cost: "",
    actual_leisure: "",
    actual_emergency_reserve: "",
  });

  const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const currentWealth = latestSnapshot ? latestSnapshot.total : 593034.15; // default fallback

  // Selected month for detail tracking
  const [selectedMonth, setSelectedMonth] = useState<string>(
    records.length > 0 ? records[records.length - 1].month : new Date().toISOString().substring(0, 7)
  );

  const activeRecord = records.find(r => r.month === selectedMonth);
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  const currentEmergencyReserve = latestRecord?.actual_emergency_reserve ?? 0;

  const handleOpenGoalsEdit = () => {
    setGoalsForm(goals);
    setIsEditingGoals(true);
  };

  const handleSaveGoals = async () => {
    try {
      await updateGoals(goalsForm);
      toast({
        title: "Metas atualizadas!",
        description: "Suas configurações gerais de metas foram salvas no Supabase.",
      });
      setIsEditingGoals(false);
    } catch (err) {
      toast({
        title: "Erro ao atualizar metas",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleOpenAddRecord = () => {
    setEditingRecord(null);
    setRecordForm({
      month: new Date().toISOString().substring(0, 7),
      actual_aporte: "",
      actual_fixed_cost: "",
      actual_leisure: "",
      actual_emergency_reserve: "",
    });
    setIsRecordDialogOpen(true);
  };

  const handleOpenEditRecord = (record: WealthGoalRecord) => {
    setEditingRecord(record);
    setRecordForm({
      month: record.month,
      actual_aporte: record.actual_aporte?.toString() || "",
      actual_fixed_cost: record.actual_fixed_cost?.toString() || "",
      actual_leisure: record.actual_leisure?.toString() || "",
      actual_emergency_reserve: record.actual_emergency_reserve?.toString() || "",
    });
    setIsRecordDialogOpen(true);
  };

  const handleSaveRecord = async () => {
    if (!recordForm.month) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um mês de referência.",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveRecord({
        id: editingRecord?.id,
        month: recordForm.month,
        actual_aporte: recordForm.actual_aporte ? Number(recordForm.actual_aporte) : null,
        actual_fixed_cost: recordForm.actual_fixed_cost ? Number(recordForm.actual_fixed_cost) : null,
        actual_leisure: recordForm.actual_leisure ? Number(recordForm.actual_leisure) : null,
        actual_emergency_reserve: recordForm.actual_emergency_reserve ? Number(recordForm.actual_emergency_reserve) : null,
      });

      toast({
        title: editingRecord ? "Lançamento editado!" : "Lançamento adicionado!",
        description: `Dados de acompanhamento para o mês ${recordForm.month} salvos.`,
      });
      setIsRecordDialogOpen(false);
      setSelectedMonth(recordForm.month);
    } catch (err) {
      toast({
        title: "Erro ao salvar lançamento",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecord = async (month: string) => {
    if (confirm(`Tem certeza que deseja excluir o lançamento do mês ${month}?`)) {
      try {
        await deleteRecord(month);
        toast({
          title: "Lançamento excluído",
          description: "Os dados deste mês foram removidos.",
        });
        if (selectedMonth === month) {
          const remaining = records.filter(r => r.month !== month);
          if (remaining.length > 0) {
            setSelectedMonth(remaining[remaining.length - 1].month);
          }
        }
      } catch (err) {
        toast({
          title: "Erro ao excluir",
          description: String(err),
          variant: "destructive",
        });
      }
    }
  };

  // Compounding math projection
  const annualYield = 0.085; // 8.5% a.a. conservative return rate
  const monthlyRate = Math.pow(1 + annualYield, 1 / 12) - 1;
  const monthsHorizon = goals.years_horizon * 12; // 192 months
  
  // Projection list for Chart (aggregated yearly for readability)
  const projectionData = [];
  let currentAccumulated = currentWealth;
  
  projectionData.push({
    name: "Início",
    "Patrimônio Projetado": Math.round(currentAccumulated),
    "Meta de Patrimônio": goals.target_wealth,
  });

  for (let year = 1; year <= goals.years_horizon; year++) {
    for (let month = 1; month <= 12; month++) {
      currentAccumulated = currentAccumulated * (1 + monthlyRate) + goals.target_aporte;
    }
    projectionData.push({
      name: `Ano ${year}`,
      "Patrimônio Projetado": Math.round(currentAccumulated),
      "Meta de Patrimônio": goals.target_wealth,
    });
  }

  const projectedFinalWealth = currentAccumulated;
  const isGoalAchieved = projectedFinalWealth >= goals.target_wealth;

  // Currency Formatter Helper
  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Percent values helper
  const getProgressPercent = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Gestão de Metas e Orçamento</h1>
              <p className="text-xs text-muted-foreground">
                Acompanhamento e simulação da meta de patrimônio de longo prazo
              </p>
            </div>
          </div>
          <div>
            <Button onClick={handleOpenAddRecord} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Lançar Mês
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* TOP META SUMMARY OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Meta de Patrimonio */}
          <Card className="border-border bg-card/45 gradient-card relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-primary" /> Meta de Patrimônio Geral
                  </CardDescription>
                  <CardTitle className="text-2xl font-black mt-1 text-foreground">
                    {formatBRL(goals.target_wealth)}
                  </CardTitle>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary">
                    {getProgressPercent(currentWealth, goals.target_wealth)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={getProgressPercent(currentWealth, goals.target_wealth)} className="h-2 bg-secondary" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Atual: {formatBRL(currentWealth)}</span>
                <span>Faltam: {formatBRL(Math.max(0, goals.target_wealth - currentWealth))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Reserva de Emergência */}
          <Card className="border-border bg-card/45 gradient-card relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-primary" /> Reserva de Emergência
                  </CardDescription>
                  <CardTitle className="text-2xl font-black mt-1 text-foreground">
                    {formatBRL(goals.target_emergency_reserve)}
                  </CardTitle>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400">
                    {getProgressPercent(currentEmergencyReserve, goals.target_emergency_reserve)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={getProgressPercent(currentEmergencyReserve, goals.target_emergency_reserve)} className="h-2 bg-secondary" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Atual: {formatBRL(currentEmergencyReserve)}</span>
                <span>Faltam: {formatBRL(Math.max(0, goals.target_emergency_reserve - currentEmergencyReserve))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Configurações Atuais */}
          <Card className="border-border bg-card/45 gradient-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Diretrizes de Simulação
              </CardDescription>
              <CardTitle className="text-lg font-bold text-foreground">
                Premissas Mensais (Ref: {formatBRL(goals.monthly_income)})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-border/50 pb-1 text-muted-foreground">
                <span>Aporte Mensal Alvo:</span>
                <span className="font-semibold text-foreground">{formatBRL(goals.target_aporte)}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1 text-muted-foreground">
                <span>Custos Fixos Máximos:</span>
                <span className="font-semibold text-foreground">{formatBRL(goals.target_fixed_cost)}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1 text-muted-foreground">
                <span>Lazer/Compras Máximos:</span>
                <span className="font-semibold text-foreground">{formatBRL(goals.target_leisure)}</span>
              </div>
              <div className="flex justify-between pt-1 text-muted-foreground">
                <span>Horizonte Estimado:</span>
                <span className="font-semibold text-foreground">{goals.years_horizon} anos</span>
              </div>
              <div className="pt-2 text-right">
                <Button variant="outline" size="xs" onClick={handleOpenGoalsEdit}>
                  <Edit2 className="w-3 h-3 mr-1" /> Editar Diretrizes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE SECTION: MONTHLY BUDGET TRACKER & HISTORY */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* BUDGET MONTHLY DETAIL TRACKER (3 cols) */}
          <Card className="lg:col-span-3 border-border bg-card/45 overflow-hidden">
            <CardHeader className="border-b border-border bg-card/25 pb-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-primary" />
                    Acompanhamento Mensal de Orçamento
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comparativo detalhado de saúde financeira para o período selecionado
                  </CardDescription>
                </div>
                
                {/* Selector */}
                <div>
                  <select
                    className="bg-background border border-border rounded px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {records.length === 0 ? (
                      <option value={selectedMonth}>{selectedMonth}</option>
                    ) : (
                      records.map(r => (
                        <option key={r.month} value={r.month}>
                          {r.month}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {activeRecord ? (
                <div className="space-y-6">
                  {/* Goal Item 1: Aporte */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-foreground block">Aportes Mensais em Investimentos</span>
                        <span className="text-muted-foreground text-[10px]">Meta: {formatBRL(goals.target_aporte)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground block">
                          {formatBRL(activeRecord.actual_aporte ?? 0)}
                        </span>
                        {activeRecord.actual_aporte != null && activeRecord.actual_aporte >= goals.target_aporte ? (
                          <span className="text-[10px] text-emerald-400 font-bold inline-flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Meta Mantida
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Abaixo do Alvo
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={getProgressPercent(activeRecord.actual_aporte ?? 0, goals.target_aporte)} 
                      className={`h-2.5 bg-secondary ${
                        (activeRecord.actual_aporte ?? 0) >= goals.target_aporte ? "bg-emerald-500/20 [&>div]:bg-emerald-400" : "bg-amber-500/20 [&>div]:bg-amber-400"
                      }`} 
                    />
                  </div>

                  {/* Goal Item 2: Custos Fixos */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-foreground block">Custos Fixos Máximos</span>
                        <span className="text-muted-foreground text-[10px]">Limite Teto: {formatBRL(goals.target_fixed_cost)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground block">
                          {formatBRL(activeRecord.actual_fixed_cost ?? 0)}
                        </span>
                        {activeRecord.actual_fixed_cost != null && activeRecord.actual_fixed_cost <= goals.target_fixed_cost ? (
                          <span className="text-[10px] text-emerald-400 font-bold inline-flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Dentro do Limite
                          </span>
                        ) : (
                          <span className="text-[10px] text-destructive font-bold inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Estourado
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={getProgressPercent(activeRecord.actual_fixed_cost ?? 0, goals.target_fixed_cost)} 
                      className={`h-2.5 bg-secondary ${
                        (activeRecord.actual_fixed_cost ?? 0) <= goals.target_fixed_cost ? "bg-emerald-500/20 [&>div]:bg-emerald-400" : "bg-destructive/20 [&>div]:bg-destructive"
                      }`} 
                    />
                  </div>

                  {/* Goal Item 3: Lazer / Compras */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-foreground block">Lazer / Compras Discricionárias</span>
                        <span className="text-muted-foreground text-[10px]">Limite Teto: {formatBRL(goals.target_leisure)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground block">
                          {formatBRL(activeRecord.actual_leisure ?? 0)}
                        </span>
                        {activeRecord.actual_leisure != null && activeRecord.actual_leisure <= goals.target_leisure ? (
                          <span className="text-[10px] text-emerald-400 font-bold inline-flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Dentro do Limite
                          </span>
                        ) : (
                          <span className="text-[10px] text-destructive font-bold inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Estourado
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={getProgressPercent(activeRecord.actual_leisure ?? 0, goals.target_leisure)} 
                      className={`h-2.5 bg-secondary ${
                        (activeRecord.actual_leisure ?? 0) <= goals.target_leisure ? "bg-emerald-500/20 [&>div]:bg-emerald-400" : "bg-destructive/20 [&>div]:bg-destructive"
                      }`} 
                    />
                  </div>

                  {/* Summary Health Rating */}
                  <div className="bg-secondary/20 rounded-lg p-4 border border-border flex items-start gap-3 mt-4">
                    {activeRecord.actual_fixed_cost != null && activeRecord.actual_fixed_cost <= goals.target_fixed_cost && 
                     activeRecord.actual_leisure != null && activeRecord.actual_leisure <= goals.target_leisure && 
                     activeRecord.actual_aporte != null && activeRecord.actual_aporte >= goals.target_aporte ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-bold text-foreground">Orçamento Perfeito!</p>
                          <p className="text-muted-foreground mt-0.5 leading-relaxed">
                            Neste mês, você manteve as despesas sob controle e realizou o aporte total planejado. Excelente consistência rumo ao topo de {formatBRL(goals.target_wealth)}!
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-bold text-foreground">Atenção no Planejamento</p>
                          <p className="text-muted-foreground mt-0.5 leading-relaxed">
                            Algum item desviou do planejado neste mês. 
                            {activeRecord.actual_aporte != null && activeRecord.actual_aporte < goals.target_aporte && " O seu aporte ficou abaixo dos R$ 2.200."}
                            {activeRecord.actual_fixed_cost != null && activeRecord.actual_fixed_cost > goals.target_fixed_cost && " Os custos fixos excederam os R$ 5.500."}
                            {activeRecord.actual_leisure != null && activeRecord.actual_leisure > goals.target_leisure && " As compras e lazer superaram o limite de R$ 3.300."}
                             Ajuste as despesas do próximo mês para manter o ritmo acumulado saudável.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
                  <Calendar className="w-10 h-10 text-muted-foreground/45" />
                  <div>
                    <p className="font-bold text-foreground text-sm">Nenhum registro para este mês</p>
                    <p className="max-w-md mx-auto mt-1 leading-relaxed">
                      Clique no botão "Lançar Mês" no canto superior direito para cadastrar os dados reais de orçamento e aporte de cada período.
                    </p>
                  </div>
                  <Button onClick={handleOpenAddRecord} size="xs" variant="outline" className="mt-2">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Criar Lançamento Inicial
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SIMULATOR COMPREHENSIVE PROJECTION VIEW (2 cols) */}
          <Card className="lg:col-span-2 border-border bg-card/45 flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                Projeção Futura e Horizonte (CDI/Rentável)
              </CardTitle>
              <CardDescription className="text-xs font-normal">
                Projeção matemática com aportes de {formatBRL(goals.target_aporte)}/mês por {goals.years_horizon} anos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background/40 border border-border/80 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Capital Inicial:</span>
                  <span className="font-bold text-foreground">{formatBRL(currentWealth)}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Aportes Totais (16a):</span>
                  <span className="font-bold text-foreground">
                    {formatBRL(goals.target_aporte * monthsHorizon)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Patrimônio Final Estimado:</span>
                  <span className="font-black text-primary text-sm">
                    {formatBRL(projectedFinalWealth)}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Resultado da Simulação:</span>
                  {isGoalAchieved ? (
                    <span className="font-bold text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Meta Atingida!
                    </span>
                  ) : (
                    <span className="font-bold text-amber-400 flex items-center gap-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Abaixo da Meta
                    </span>
                  )}
                </div>
              </div>

              {/* Message block */}
              <div className="text-[11px] leading-relaxed text-muted-foreground">
                {isGoalAchieved ? (
                  <p>
                    🎉 <strong>Excelente notícia!</strong> Mantendo a regularidade do aporte planejado de{" "}
                    <strong>{formatBRL(goals.target_aporte)}</strong> e assumindo uma taxa ponderada conservadora de{" "}
                    { (annualYield * 100).toFixed(1) }% a.a., seu patrimônio projetado atingirá{" "}
                    <strong className="text-foreground">{formatBRL(projectedFinalWealth)}</strong>, superando com folga a meta estabelecida de {formatBRL(goals.target_wealth)}.
                  </p>
                ) : (
                  <p>
                    ⚠️ <strong>Alerta de Defasagem:</strong> No ritmo atual, seu patrimônio projetado alcançará{" "}
                    <strong>{formatBRL(projectedFinalWealth)}</strong> em {goals.years_horizon} anos, ficando um pouco abaixo da meta de {formatBRL(goals.target_wealth)}. Considere elevar o aporte mensal para{" "}
                    <strong className="text-foreground">{formatBRL(goals.target_aporte + 350)}</strong> ou buscar retornos médios mais altos para fechar essa lacuna.
                  </p>
                )}
              </div>
            </CardContent>
            
            {/* Compounding Sparkline Chart */}
            <div className="p-4 border-t border-border bg-card/10 h-44 overflow-hidden flex flex-col justify-end">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={9} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} />
                  <ChartTooltip 
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "10px" }} 
                    formatter={(val: number) => [formatBRL(val), ""]}
                  />
                  <Line type="monotone" dataKey="Patrimônio Projetado" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Meta de Patrimônio" stroke="#d97706" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* BOTTOM SECTION: HISTORICAL RECORDS TABLE */}
        <Card className="border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              Histórico de Lançamentos Registrados
            </CardTitle>
            <CardDescription className="text-xs">
              Histórico de aportes, custos fixos, gastos de lazer e saldo da reserva cadastrados no banco de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t border-border">
            {records.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Aporte (Alvo: {formatBRL(goals.target_aporte)})</TableHead>
                      <TableHead className="text-right">Custo Fixo (Teto: {formatBRL(goals.target_fixed_cost)})</TableHead>
                      <TableHead className="text-right">Lazer (Teto: {formatBRL(goals.target_leisure)})</TableHead>
                      <TableHead className="text-right">Reserva de Emergência (Alvo: {formatBRL(goals.target_emergency_reserve)})</TableHead>
                      <TableHead className="text-center w-[120px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => {
                      const isAporteOk = r.actual_aporte != null && r.actual_aporte >= goals.target_aporte;
                      const isFixoOk = r.actual_fixed_cost != null && r.actual_fixed_cost <= goals.target_fixed_cost;
                      const isLazerOk = r.actual_leisure != null && r.actual_leisure <= goals.target_leisure;
                      const isReservaOk = r.actual_emergency_reserve != null && r.actual_emergency_reserve >= goals.target_emergency_reserve;

                      return (
                        <TableRow key={r.month} className="hover:bg-secondary/15">
                          <TableCell className="font-semibold py-3">{r.month}</TableCell>
                          
                          {/* Aporte Cell */}
                          <TableCell className={`text-right font-medium ${isAporteOk ? "text-emerald-400" : "text-amber-400"}`}>
                            {r.actual_aporte != null ? formatBRL(r.actual_aporte) : "—"}
                          </TableCell>

                          {/* Custo Fixo Cell */}
                          <TableCell className={`text-right font-medium ${isFixoOk ? "text-emerald-400" : "text-destructive"}`}>
                            {r.actual_fixed_cost != null ? formatBRL(r.actual_fixed_cost) : "—"}
                          </TableCell>

                          {/* Lazer Cell */}
                          <TableCell className={`text-right font-medium ${isLazerOk ? "text-emerald-400" : "text-destructive"}`}>
                            {r.actual_leisure != null ? formatBRL(r.actual_leisure) : "—"}
                          </TableCell>

                          {/* Reserva Cell */}
                          <TableCell className={`text-right font-medium ${isReservaOk ? "text-emerald-400" : "text-muted-foreground"}`}>
                            {r.actual_emergency_reserve != null ? formatBRL(r.actual_emergency_reserve) : "—"}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-center">
                            <div className="flex justify-center items-center gap-2">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEditRecord(r)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRecord(r.month)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground leading-normal">
                Nenhum lançamento mensal cadastrado ainda no banco de dados.
              </div>
            )}
          </CardContent>
        </Card>

      </main>

      {/* DIALOG 1: GOALS CONFIGURATION EDIT */}
      <Dialog open={isEditingGoals} onOpenChange={setIsEditingGoals}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border">
          <DialogHeader>
            <DialogTitle>Premissas e Diretrizes de Metas</DialogTitle>
            <DialogDescription>
              Ajuste as metas de simulação geral. Elas são salvas e persistidas no banco de dados.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            {/* Meta de Patrimonio */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground col-span-2">Meta de Patrimônio Geral:</label>
              <Input
                type="number"
                className="col-span-2 text-right font-mono"
                value={goalsForm.target_wealth}
                onChange={(e) => setGoalsForm({ ...goalsForm, target_wealth: Number(e.target.value) })}
              />
            </div>

            {/* Aporte Alvo */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground col-span-2">Aporte Mensal Planejado:</label>
              <Input
                type="number"
                className="col-span-2 text-right font-mono"
                value={goalsForm.target_aporte}
                onChange={(e) => setGoalsForm({ ...goalsForm, target_aporte: Number(e.target.value) })}
              />
            </div>

            {/* Reserva Teto */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground col-span-2">Reserva de Emergência Alvo:</label>
              <Input
                type="number"
                className="col-span-2 text-right font-mono"
                value={goalsForm.target_emergency_reserve}
                onChange={(e) => setGoalsForm({ ...goalsForm, target_emergency_reserve: Number(e.target.value) })}
              />
            </div>

            {/* Custo Fixo */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground col-span-2">Custos Fixos Máximos:</label>
              <Input
                type="number"
                className="col-span-2 text-right font-mono"
                value={goalsForm.target_fixed_cost}
                onChange={(e) => setGoalsForm({ ...goalsForm, target_fixed_cost: Number(e.target.value) })}
              />
            </div>

            {/* Lazer */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground col-span-2">Lazer/Compras Máximos:</label>
              <Input
                type="number"
                className="col-span-2 text-right font-mono"
                value={goalsForm.target_leisure}
                onChange={(e) => setGoalsForm({ ...goalsForm, target_leisure: Number(e.target.value) })}
              />
            </div>

            {/* Renda de Referência */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground col-span-2">Renda Mensal de Referência:</label>
              <Input
                type="number"
                className="col-span-2 text-right font-mono"
                value={goalsForm.monthly_income}
                onChange={(e) => setGoalsForm({ ...goalsForm, monthly_income: Number(e.target.value) })}
              />
            </div>

            {/* Horizonte */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground col-span-2">Horizonte Temporal (Anos):</label>
              <Input
                type="number"
                className="col-span-2 text-right font-mono"
                value={goalsForm.years_horizon}
                onChange={(e) => setGoalsForm({ ...goalsForm, years_horizon: Number(e.target.value) })}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditingGoals(false)} size="sm">
              Cancelar
            </Button>
            <Button onClick={handleSaveGoals} size="sm">
              <Save className="w-4 h-4 mr-1" /> Salvar Diretrizes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: ADD/EDIT MONTHLY BUDGET RECORD */}
      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background border-border">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Editar Lançamento" : "Lançar Mês"}</DialogTitle>
            <DialogDescription>
              Insira os dados reais de orçamento e investimentos do mês de referência.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            {/* Month */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground">Mês:</label>
              <Input
                type="month"
                className="col-span-3 text-right"
                disabled={!!editingRecord}
                value={recordForm.month}
                onChange={(e) => setRecordForm({ ...recordForm, month: e.target.value })}
              />
            </div>

            {/* Aporte Realizado */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground">Aporte Realizado:</label>
              <Input
                type="number"
                placeholder="R$ 2.200"
                className="col-span-3 text-right font-mono"
                value={recordForm.actual_aporte}
                onChange={(e) => setRecordForm({ ...recordForm, actual_aporte: e.target.value })}
              />
            </div>

            {/* Custo Fixo Realizado */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground">Custos Fixos:</label>
              <Input
                type="number"
                placeholder="R$ 5.500"
                className="col-span-3 text-right font-mono"
                value={recordForm.actual_fixed_cost}
                onChange={(e) => setRecordForm({ ...recordForm, actual_fixed_cost: e.target.value })}
              />
            </div>

            {/* Lazer Realizado */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground">Lazer / Compras:</label>
              <Input
                type="number"
                placeholder="R$ 3.300"
                className="col-span-3 text-right font-mono"
                value={recordForm.actual_leisure}
                onChange={(e) => setRecordForm({ ...recordForm, actual_leisure: e.target.value })}
              />
            </div>

            {/* Reserva Realizado */}
            <div className="grid grid-cols-4 items-center gap-4 text-xs">
              <label className="text-right font-semibold text-muted-foreground">Saldo da Reserva:</label>
              <Input
                type="number"
                placeholder="R$ 66.000"
                className="col-span-3 text-right font-mono"
                value={recordForm.actual_emergency_reserve}
                onChange={(e) => setRecordForm({ ...recordForm, actual_emergency_reserve: e.target.value })}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRecordDialogOpen(false)} size="sm">
              Cancelar
            </Button>
            <Button onClick={handleSaveRecord} size="sm">
              <Save className="w-4 h-4 mr-1" /> Salvar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default WealthGoalsManager;
