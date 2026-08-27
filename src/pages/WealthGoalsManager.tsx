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
  Calendar,
  Wallet,
  Coins,
  ChevronRight,
  Info
} from "lucide-react";
import { useWealthGoals, type WealthGoalRecord, type WealthBudgetItem, type WealthGoals as GoalsType } from "@/hooks/useWealthGoals";
import { useSnapshots } from "@/hooks/useSnapshots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  CartesianGrid 
} from "recharts";

const getErrorMessage = (err: any): string => {
  if (!err) return "Erro desconhecido";
  if (typeof err === "string") return err;
  const msg = err.message || (typeof err === "object" && err.error_description) || JSON.stringify(err);
  if (msg.includes("relation") && msg.includes("does not exist")) {
    return "As tabelas de metas não foram encontradas no seu banco de dados Supabase. Por favor, execute o script SQL de migração no painel do Supabase SQL Editor para criá-las.";
  }
  return msg;
};

const WealthGoalsManager = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: snapshots, isLoading: isLoadingSnapshots } = useSnapshots();
  
  const {
    goals,
    records,
    budgetItems,
    isLoadingGoals,
    isLoadingRecords,
    isLoadingBudgetItems,
    updateGoals,
    saveRecord,
    deleteRecord,
    saveBudgetItem,
    deleteBudgetItem
  } = useWealthGoals();

  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [goalsForm, setGoalsForm] = useState<GoalsType>(goals);

  // Selector controls
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"reserve" | "item">("item");

  // Form for emergency reserve balance
  const [reserveForm, setReserveForm] = useState({
    month: new Date().toISOString().substring(0, 7),
    actual_emergency_reserve: "",
  });

  // Form for budget items (Aporte, Custo Fixo, Lazer)
  const [itemForm, setItemForm] = useState({
    month: new Date().toISOString().substring(0, 7),
    category: "fixed_cost",
    description: "",
    value: "",
  });

  const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const currentWealth = latestSnapshot ? latestSnapshot.total : 593034.15; // default fallback

  // Get all unique months present in either records or budget items to populate selectors
  const uniqueMonths = Array.from(
    new Set([
      ...records.map(r => r.month),
      ...budgetItems.map(i => i.month),
      new Date().toISOString().substring(0, 7)
    ])
  ).sort();

  // Selected month for detail tracking
  const [selectedMonth, setSelectedMonth] = useState<string>(
    uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : new Date().toISOString().substring(0, 7)
  );

  // Sum calculations for the selected month
  const activeMonthItems = budgetItems.filter(item => item.month === selectedMonth);
  
  const selectedAporteItems = activeMonthItems.filter(i => i.category === "aporte");
  const selectedFixedCostItems = activeMonthItems.filter(i => i.category === "fixed_cost");
  const selectedLeisureItems = activeMonthItems.filter(i => i.category === "leisure");

  const totalAporte = selectedAporteItems.reduce((acc, i) => acc + i.value, 0);
  const totalFixedCost = selectedFixedCostItems.reduce((acc, i) => acc + i.value, 0);
  const totalLeisure = selectedLeisureItems.reduce((acc, i) => acc + i.value, 0);

  const activeRecord = records.find(r => r.month === selectedMonth);
  const currentEmergencyReserve = activeRecord?.actual_emergency_reserve ?? 0;

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
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  const handleOpenAddRecord = (tab: "reserve" | "item") => {
    setActiveTab(tab);
    
    // Set default month to currently selected month
    setReserveForm({
      month: selectedMonth,
      actual_emergency_reserve: activeRecord?.actual_emergency_reserve?.toString() || "",
    });

    setItemForm({
      month: selectedMonth,
      category: "fixed_cost",
      description: "",
      value: "",
    });

    setIsRecordDialogOpen(true);
  };

  const handleSaveReserve = async () => {
    if (!reserveForm.month || !reserveForm.actual_emergency_reserve) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o mês e o saldo da reserva.",
        variant: "destructive",
      });
      return;
    }

    try {
      const existing = records.find(r => r.month === reserveForm.month);
      await saveRecord({
        id: existing?.id,
        month: reserveForm.month,
        actual_emergency_reserve: Number(reserveForm.actual_emergency_reserve),
      });

      toast({
        title: "Reserva de Emergência salva!",
        description: `Saldo do mês ${reserveForm.month} atualizado no Supabase.`,
      });
      setIsRecordDialogOpen(false);
      setSelectedMonth(reserveForm.month);
    } catch (err) {
      toast({
        title: "Erro ao salvar reserva",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.month || !itemForm.description || !itemForm.value) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha a descrição, valor e mês do item.",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveBudgetItem({
        month: itemForm.month,
        category: itemForm.category as any,
        description: itemForm.description,
        value: Number(itemForm.value),
      });

      toast({
        title: "Item de orçamento salvo!",
        description: `Lançamento de "${itemForm.description}" adicionado com sucesso.`,
      });
      setIsRecordDialogOpen(false);
      setSelectedMonth(itemForm.month);
    } catch (err) {
      toast({
        title: "Erro ao salvar item",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (id: string, desc: string) => {
    if (confirm(`Tem certeza que deseja excluir o item "${desc}"?`)) {
      try {
        await deleteBudgetItem(id);
        toast({
          title: "Item excluído",
          description: `O item "${desc}" foi removido do seu orçamento.`,
        });
      } catch (err) {
        toast({
          title: "Erro ao excluir",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      }
    }
  };

  // Compile monthly statistics dynamically for the historical table
  const allHistoryMonths = Array.from(
    new Set([
      ...records.map(r => r.month),
      ...budgetItems.map(i => i.month)
    ])
  ).sort();

  const monthlyHistoryMetrics = allHistoryMonths.map(month => {
    const rec = records.find(r => r.month === month);
    const items = budgetItems.filter(i => i.month === month);
    
    return {
      month,
      actual_emergency_reserve: rec?.actual_emergency_reserve ?? null,
      actual_aporte: items.filter(i => i.category === "aporte").reduce((sum, i) => sum + i.value, 0),
      actual_fixed_cost: items.filter(i => i.category === "fixed_cost").reduce((sum, i) => sum + i.value, 0),
      actual_leisure: items.filter(i => i.category === "leisure").reduce((sum, i) => sum + i.value, 0),
    };
  });

  // Compounding math projection
  const annualYield = 0.085; // 8.5% a.a. conservative return rate
  const monthlyRate = Math.pow(1 + annualYield, 1 / 12) - 1;
  const monthsHorizon = goals.years_horizon * 12; // 192 months
  
  // Projection list for Chart
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
                Lançamentos detalhados de orçamento e projeção anualizada de metas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => handleOpenAddRecord("reserve")} size="sm" variant="outline">
              <Wallet className="w-4 h-4 mr-1" /> Saldo da Reserva
            </Button>
            <Button onClick={() => handleOpenAddRecord("item")} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Novo Item
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

        {/* MIDDLE SECTION: MONTHLY BUDGET TRACKER & DETAILED BREAKDOWN ITEMS */}
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
                    {uniqueMonths.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Progress Tracker Bars */}
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
                        {formatBRL(totalAporte)}
                      </span>
                      {totalAporte >= goals.target_aporte ? (
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
                    value={getProgressPercent(totalAporte, goals.target_aporte)} 
                    className={`h-2.5 bg-secondary ${
                      totalAporte >= goals.target_aporte ? "bg-emerald-500/20 [&>div]:bg-emerald-400" : "bg-amber-500/20 [&>div]:bg-amber-400"
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
                        {formatBRL(totalFixedCost)}
                      </span>
                      {totalFixedCost <= goals.target_fixed_cost ? (
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
                    value={getProgressPercent(totalFixedCost, goals.target_fixed_cost)} 
                    className={`h-2.5 bg-secondary ${
                      totalFixedCost <= goals.target_fixed_cost ? "bg-emerald-500/20 [&>div]:bg-emerald-400" : "bg-destructive/20 [&>div]:bg-destructive"
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
                        {formatBRL(totalLeisure)}
                      </span>
                      {totalLeisure <= goals.target_leisure ? (
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
                    value={getProgressPercent(totalLeisure, goals.target_leisure)} 
                    className={`h-2.5 bg-secondary ${
                      totalLeisure <= goals.target_leisure ? "bg-emerald-500/20 [&>div]:bg-emerald-400" : "bg-destructive/20 [&>div]:bg-destructive"
                    }`} 
                  />
                </div>
              </div>

              {/* DETAILED ITEMS BREAKDOWN FOR THE MONTH ("aporte onde... custo fixo somar... lazer tbm") */}
              <div className="pt-4 border-t border-border/65 space-y-4">
                <h3 className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5 mb-3">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  Detalhamento de Lançamentos de {selectedMonth}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category 1: Aportes */}
                  <div className="bg-background/25 border border-border/60 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex justify-between items-center border-b border-border/50 pb-1.5">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-primary" /> Aportes
                      </span>
                      <span className="text-xs font-mono font-bold text-primary">{formatBRL(totalAporte)}</span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {selectedAporteItems.length > 0 ? (
                        selectedAporteItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center text-[11px] hover:bg-secondary/15 p-1 rounded">
                            <span className="text-muted-foreground truncate max-w-[100px]" title={item.description}>
                              {item.description}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{formatBRL(item.value)}</span>
                              <button 
                                onClick={() => handleDeleteItem(item.id!, item.description)} 
                                className="text-muted-foreground/60 hover:text-destructive transition-colors shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground/70 italic text-center py-2">Sem aportes detalhados</p>
                      )}
                    </div>
                  </div>

                  {/* Category 2: Custos Fixos */}
                  <div className="bg-background/25 border border-border/60 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex justify-between items-center border-b border-border/50 pb-1.5">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5 text-primary" /> Custos Fixos
                      </span>
                      <span className="text-xs font-mono font-bold text-primary">{formatBRL(totalFixedCost)}</span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {selectedFixedCostItems.length > 0 ? (
                        selectedFixedCostItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center text-[11px] hover:bg-secondary/15 p-1 rounded">
                            <span className="text-muted-foreground truncate max-w-[100px]" title={item.description}>
                              {item.description}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{formatBRL(item.value)}</span>
                              <button 
                                onClick={() => handleDeleteItem(item.id!, item.description)} 
                                className="text-muted-foreground/60 hover:text-destructive transition-colors shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground/70 italic text-center py-2">Sem custos fixos detalhados</p>
                      )}
                    </div>
                  </div>

                  {/* Category 3: Lazer */}
                  <div className="bg-background/25 border border-border/60 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex justify-between items-center border-b border-border/50 pb-1.5">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-primary" /> Lazer/Compras
                      </span>
                      <span className="text-xs font-mono font-bold text-primary">{formatBRL(totalLeisure)}</span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {selectedLeisureItems.length > 0 ? (
                        selectedLeisureItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center text-[11px] hover:bg-secondary/15 p-1 rounded">
                            <span className="text-muted-foreground truncate max-w-[100px]" title={item.description}>
                              {item.description}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{formatBRL(item.value)}</span>
                              <button 
                                onClick={() => handleDeleteItem(item.id!, item.description)} 
                                className="text-muted-foreground/60 hover:text-destructive transition-colors shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground/70 italic text-center py-2">Sem lazer detalhado</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

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
              Histórico de Lançamentos Registrados (Consolidado Mensal)
            </CardTitle>
            <CardDescription className="text-xs">
              Histórico consolidado calculado a partir dos saldos da reserva e da soma dos itens detalhados de cada mês
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t border-border">
            {monthlyHistoryMetrics.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Aportes (Alvo: {formatBRL(goals.target_aporte)})</TableHead>
                      <TableHead className="text-right">Custo Fixo (Teto: {formatBRL(goals.target_fixed_cost)})</TableHead>
                      <TableHead className="text-right">Lazer (Teto: {formatBRL(goals.target_leisure)})</TableHead>
                      <TableHead className="text-right">Reserva de Emergência (Alvo: {formatBRL(goals.target_emergency_reserve)})</TableHead>
                      <TableHead className="text-center w-[120px]">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyHistoryMetrics.map((r) => {
                      const isAporteOk = r.actual_aporte >= goals.target_aporte;
                      const isFixoOk = r.actual_fixed_cost <= goals.target_fixed_cost;
                      const isLazerOk = r.actual_leisure <= goals.target_leisure;
                      const isReservaOk = r.actual_emergency_reserve != null && r.actual_emergency_reserve >= goals.target_emergency_reserve;

                      return (
                        <TableRow key={r.month} className="hover:bg-secondary/15 cursor-pointer" onClick={() => setSelectedMonth(r.month)}>
                          <TableCell className="font-semibold py-3 flex items-center gap-1">
                            {r.month} {r.month === selectedMonth && <ChevronRight className="w-3.5 h-3.5 text-primary" />}
                          </TableCell>
                          
                          {/* Aporte Cell */}
                          <TableCell className={`text-right font-medium ${isAporteOk ? "text-emerald-400" : "text-amber-400"}`}>
                            {formatBRL(r.actual_aporte)}
                          </TableCell>

                          {/* Custo Fixo Cell */}
                          <TableCell className={`text-right font-medium ${isFixoOk ? "text-emerald-400" : "text-destructive"}`}>
                            {formatBRL(r.actual_fixed_cost)}
                          </TableCell>

                          {/* Lazer Cell */}
                          <TableCell className={`text-right font-medium ${isLazerOk ? "text-emerald-400" : "text-destructive"}`}>
                            {formatBRL(r.actual_leisure)}
                          </TableCell>

                          {/* Reserva Cell */}
                          <TableCell className={`text-right font-medium ${isReservaOk ? "text-emerald-400" : "text-muted-foreground"}`}>
                            {r.actual_emergency_reserve != null ? formatBRL(r.actual_emergency_reserve) : "—"}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center items-center gap-2">
                              {r.actual_emergency_reserve != null && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRecord(r.month)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
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

      {/* DIALOG 2: RECORD DIALOG WITH TABS FOR EMERGENCY RESERVE AND BUDGET ITEMS */}
      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background border-border">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="reserve" className="text-xs">Saldo da Reserva</TabsTrigger>
              <TabsTrigger value="item" className="text-xs">Novo Item de Gasto/Aporte</TabsTrigger>
            </TabsList>
            
            {/* Tab 1: Emergency Reserve Balance */}
            <TabsContent value="reserve" className="space-y-4 pt-2">
              <DialogHeader>
                <DialogTitle>Saldo da Reserva de Emergência</DialogTitle>
                <DialogDescription>
                  Informe o saldo final estático da sua reserva de emergência para o mês.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-4 items-center gap-4 text-xs">
                  <label className="text-right font-semibold text-muted-foreground">Mês:</label>
                  <Input
                    type="month"
                    className="col-span-3 text-right"
                    value={reserveForm.month}
                    onChange={(e) => setReserveForm({ ...reserveForm, month: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4 text-xs">
                  <label className="text-right font-semibold text-muted-foreground">Saldo Total:</label>
                  <Input
                    type="number"
                    placeholder="R$ 66.000"
                    className="col-span-3 text-right font-mono"
                    value={reserveForm.actual_emergency_reserve}
                    onChange={(e) => setReserveForm({ ...reserveForm, actual_emergency_reserve: e.target.value })}
                  />
                </div>
              </div>
              
              <DialogFooter className="pt-2">
                <Button variant="ghost" onClick={() => setIsRecordDialogOpen(false)} size="sm">
                  Cancelar
                </Button>
                <Button onClick={handleSaveReserve} size="sm">
                  <Save className="w-4 h-4 mr-1" /> Salvar Saldo
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Tab 2: Itemized Budget Records */}
            <TabsContent value="item" className="space-y-4 pt-2">
              <DialogHeader>
                <DialogTitle>Lançar Item de Gasto ou Aporte</DialogTitle>
                <DialogDescription>
                  Adicione uma despesa ou investimento detalhado para somar na categoria.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-4 items-center gap-4 text-xs">
                  <label className="text-right font-semibold text-muted-foreground">Mês:</label>
                  <Input
                    type="month"
                    className="col-span-3 text-right"
                    value={itemForm.month}
                    onChange={(e) => setItemForm({ ...itemForm, month: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4 text-xs">
                  <label className="text-right font-semibold text-muted-foreground">Categoria:</label>
                  <select
                    className="col-span-3 bg-background border border-border rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                  >
                    <option value="fixed_cost">Custo Fixo (Teto: {formatBRL(goals.target_fixed_cost)})</option>
                    <option value="leisure">Lazer/Compras (Teto: {formatBRL(goals.target_leisure)})</option>
                    <option value="aporte">Aporte/Investimento (Alvo: {formatBRL(goals.target_aporte)})</option>
                  </select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4 text-xs">
                  <label className="text-right font-semibold text-muted-foreground">Descrição:</label>
                  <Input
                    type="text"
                    placeholder="Ex: Aluguel, Supermercado, Aporte BTC"
                    className="col-span-3"
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4 text-xs">
                  <label className="text-right font-semibold text-muted-foreground">Valor (R$):</label>
                  <Input
                    type="number"
                    placeholder="R$ 1.500"
                    className="col-span-3 text-right font-mono"
                    value={itemForm.value}
                    onChange={(e) => setItemForm({ ...itemForm, value: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="ghost" onClick={() => setIsRecordDialogOpen(false)} size="sm">
                  Cancelar
                </Button>
                <Button onClick={handleSaveItem} size="sm">
                  <Save className="w-4 h-4 mr-1" /> Adicionar Item
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default WealthGoalsManager;
