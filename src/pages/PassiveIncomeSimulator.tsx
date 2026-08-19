import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSnapshots } from "@/hooks/useSnapshots";
import { formatBRL, formatPercent, CHART_COLORS } from "@/data/investments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Coins, 
  TrendingUp, 
  PiggyBank, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles,
  Info,
  DollarSign,
  Scale
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ChartTooltip, Legend } from "recharts";

const PassiveIncomeSimulator = () => {
  const { data: monthlyData = [], isLoading } = useSnapshots();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [capitalMode, setCapitalMode] = useState<"actual" | "custom">("actual");
  const [customCapital, setCustomCapital] = useState<number>(100000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(2000);

  // Select latest month as default
  useEffect(() => {
    if (monthlyData.length > 0 && !selectedMonth) {
      setSelectedMonth(monthlyData[monthlyData.length - 1].month);
    }
  }, [monthlyData, selectedMonth]);

  const snapshot = monthlyData.find((s) => s.month === selectedMonth) || monthlyData[monthlyData.length - 1];

  if (isLoading || !snapshot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse text-sm">Carregando simulador...</div>
      </div>
    );
  }

  const simulatedCapital = capitalMode === "actual" ? (snapshot.total || 0) : customCapital;
  const totalRealWealth = snapshot.total || 1;
  const CDI_RATE = 10.65; // 100% CDI Nubank

  // Process investments with explicit separation of Realized Income vs Projected Income
  const simulatedInvestments = snapshot.investments.map((inv) => {
    const realValue = inv.valueBRL ?? inv.value;
    const allocationRatio = realValue / totalRealWealth;
    const allocatedCapital = simulatedCapital * allocationRatio;
    
    // Projection rate MUST only be explicit annualRate (ignore multi-year return since 2024)
    const registeredRate = inv.annualRate;
    const hasProjectionRate = registeredRate != null && Number.isFinite(Number(registeredRate)) && Number(registeredRate) > 0;
    
    let rawYield = hasProjectionRate ? Number(registeredRate) : 0;
    let annualYield = 0;
    let isCapped = false;
    let isNegative = false;
    let projectedMonthlyIncome: number | undefined = undefined;

    if (hasProjectionRate) {
      const maxYield = inv.incomeType === "fixed" ? 15.0 : 20.0;
      isCapped = rawYield > maxYield;
      isNegative = rawYield < 0;
      annualYield = isCapped ? maxYield : (isNegative ? 0.0 : rawYield);
      const monthlyYield = annualYield / 12;
      projectedMonthlyIncome = allocatedCapital * (monthlyYield / 100);
    }

    // Realized income: historical actual income registered for the asset
    const realizedIncome = inv.realizedIncome != null && Number.isFinite(Number(inv.realizedIncome))
      ? Number(inv.realizedIncome)
      : undefined;

    return {
      ...inv,
      realValue,
      allocationRatio,
      allocatedCapital,
      rawYield,
      isCapped,
      isNegative,
      annualYield,
      hasProjectionRate,
      projectedMonthlyIncome,
      realizedIncome,
      monthlyPassiveIncome: projectedMonthlyIncome ?? 0,
    };
  });

  const totalProjectedMonthlyIncome = simulatedInvestments.reduce(
    (sum, inv) => sum + (inv.projectedMonthlyIncome ?? 0),
    0
  );
  
  const hasAnyRealizedIncome = simulatedInvestments.some((inv) => inv.realizedIncome != null);
  const totalRealizedMonthlyIncome = hasAnyRealizedIncome
    ? simulatedInvestments.reduce((sum, inv) => sum + (inv.realizedIncome ?? 0), 0)
    : undefined;

  const totalMonthlyPassiveIncome = totalProjectedMonthlyIncome;
  const weightedAverageMonthlyYield = simulatedCapital > 0 ? (totalProjectedMonthlyIncome / simulatedCapital) * 100 : 0;
  const weightedAverageAnnualYield = weightedAverageMonthlyYield * 12;

  // Pre-calculate passive incomes for all months to find the record holder
  const monthlyIncomes = monthlyData.map((snap) => {
    const totalRealWealth = snap.total || 1;
    const income = snap.investments.reduce((sum, inv) => {
      const realValue = inv.valueBRL ?? inv.value;
      const registeredRate = inv.annualRate;
      if (!registeredRate || registeredRate <= 0) return sum;
      const maxYield = inv.incomeType === "fixed" ? 15.0 : 20.0;
      const annualYield = registeredRate > maxYield ? maxYield : registeredRate;
      const monthlyYield = annualYield / 12;
      return sum + realValue * (monthlyYield / 100);
    }, 0);
    return {
      month: snap.month,
      label: snap.label,
      income,
    };
  });

  // Default baseline historical record (Jul/2026)
  let maxIncomeValue = 6167.08;
  let maxIncomeLabel = "Jul/2026";
  let maxIncomeMonth = "2026-07";

  if (monthlyIncomes.length > 0) {
    const sortedIncomes = [...monthlyIncomes].sort((a, b) => b.income - a.income);
    const highestCalculated = sortedIncomes[0];
    if (highestCalculated.income > maxIncomeValue) {
      maxIncomeValue = highestCalculated.income;
      maxIncomeLabel = highestCalculated.label;
      maxIncomeMonth = highestCalculated.month;
    }
  }

  // CDI Risco Zero calculations
  const riskFreeMonthlyIncome = simulatedCapital * ((CDI_RATE / 12) / 100);
  const effectivePortfolioIncome = capitalMode === "actual" && totalRealizedMonthlyIncome != null
    ? totalRealizedMonthlyIncome
    : totalProjectedMonthlyIncome;
  const diffMonthlyIncome = effectivePortfolioIncome - riskFreeMonthlyIncome;

  // Pie chart data
  const chartData = simulatedInvestments
    .map((inv, idx) => ({
      name: inv.name,
      value: Number(inv.monthlyPassiveIncome.toFixed(2)),
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }))
    .filter((d) => d.value > 0);

  // Financial milestones
  const milestones = [
    { id: 1, label: "Cafés e Lanches", value: 150, desc: "Paga pequenos mimos diários como café expresso, lanches e doces.", icon: "☕" },
    { id: 2, label: "Assinaturas Digitais", value: 500, desc: "Cobre Netflix, Spotify, plano de celular, internet rápida e contas básicas.", icon: "🌐" },
    { id: 3, label: "Supermercado e Feira", value: 1500, desc: "Cobre compras essenciais de alimentos, higiene e mercado mensal.", icon: "🛒" },
    { id: 4, label: "Aluguel e Condomínio", value: 3500, desc: "Garante moradia em local confortável com taxas inclusas.", icon: "🏠" },
    { id: 5, label: "Liberdade Classe Média", value: 7000, desc: "Garante independência financeira completa para um estilo de vida de classe média confortável.", icon: "💼" },
    { id: 6, label: "Liberdade Plena / Aposentadoria", value: 15000, desc: "Parabéns! Estilo de vida premium garantido por investimentos. O trabalho agora é 100% opcional.", icon: "✈️" }
  ];


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Simulador de Renda Passiva</h1>
              <p className="text-xs text-muted-foreground">
                Projete o retorno mensal simulado se você realizasse a performance anual do seu patrimônio
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Top Control Panel */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-end">
              {/* Select Active Month */}
              <div className="space-y-2">
                <Label htmlFor="month-select" className="text-sm font-semibold flex items-center gap-1">
                  Mês de Referência do Portfólio
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-60 text-xs">Os ativos e as proporções de alocação serão importados diretamente do mês escolhido.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month-select">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthlyData.map((m) => (
                      <SelectItem key={m.month} value={m.month}>
                        {m.label} ({formatBRL(m.total)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Simulation Mode Toggle */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Base de Capital para Simulação</Label>
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <Button 
                    type="button"
                    variant={capitalMode === "actual" ? "secondary" : "ghost"}
                    className="flex-1 text-xs h-8"
                    onClick={() => setCapitalMode("actual")}
                  >
                    Patrimônio Atual
                  </Button>
                  <Button 
                    type="button"
                    variant={capitalMode === "custom" ? "secondary" : "ghost"}
                    className="flex-1 text-xs h-8"
                    onClick={() => setCapitalMode("custom")}
                  >
                    Capital Personalizado
                  </Button>
                </div>
              </div>

              {/* Custom Capital Input */}
              <div className="space-y-2">
                <Label htmlFor="custom-capital" className="text-sm font-semibold">
                  Capital Simulado (R$)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">R$</span>
                  <Input
                    id="custom-capital"
                    type="number"
                    disabled={capitalMode === "actual"}
                    value={capitalMode === "actual" ? Math.round(snapshot.total) : customCapital}
                    onChange={(e) => setCustomCapital(Math.max(0, Number(e.target.value)))}
                    className="pl-9 font-medium"
                    placeholder="Digite o capital..."
                  />
                </div>
              </div>

              {/* Planned Monthly Contribution Input */}
              <div className="space-y-2">
                <Label htmlFor="monthly-contribution" className="text-sm font-semibold flex items-center gap-1">
                  Aporte Mensal Planejado
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-60 text-xs">
                          A quantia em dinheiro que você planeja economizar e aportar todos os meses para atingir as metas.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">R$</span>
                  <Input
                    id="monthly-contribution"
                    type="number"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value)))}
                    className="pl-9 font-medium"
                    placeholder="Ex: 2000"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium">Capital Projetado</CardDescription>
              <CardTitle className="text-xl md:text-2xl font-black text-foreground">
                {formatBRL(simulatedCapital)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-muted-foreground">
                {capitalMode === "actual" ? `Espelhado de ${snapshot.label}` : "Capital customizado para projeção"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-primary">Renda Passiva Mensal Projetada</CardDescription>
              <CardTitle className="text-xl md:text-3xl font-black text-primary flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                {formatBRL(totalMonthlyPassiveIncome)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-muted-foreground">
                Equivalente a <span className="font-bold text-foreground">{formatBRL(totalMonthlyPassiveIncome * 12)}</span> por ano livre
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium">Taxa de Rendimento Mensal (Ponderada)</CardDescription>
              <CardTitle className="text-xl md:text-2xl font-black text-foreground flex items-center gap-1">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                {weightedAverageMonthlyYield.toFixed(3)}% <span className="text-xs font-normal text-muted-foreground">/mês</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-muted-foreground">
                Rentabilidade Anual Ponderada: <span className="font-bold">{weightedAverageAnnualYield.toFixed(2)}% a.a.</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Risk-Free & Performance Comparison Panel */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Comparativo de Risco e Rentabilidade</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Risco Zero */}
            <Card className="border-border bg-card/45 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-semibold text-muted-foreground uppercase">Risco Zero (100% CDI)</CardDescription>
                <CardTitle className="text-xl font-black text-foreground mt-1">
                  {formatBRL(riskFreeMonthlyIncome)} <span className="text-[10px] font-normal text-muted-foreground">/mês</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Rendimento estável em conta com liquidez diária a <span className="font-semibold text-foreground">{CDI_RATE}% a.a.</span>
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Seu Portfólio */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-semibold text-primary uppercase">
                  Seu Portfólio ({snapshot.label})
                </CardDescription>
                <CardTitle className="text-xl font-black text-primary mt-1">
                  {totalRealizedMonthlyIncome != null ? (
                    <>
                      {formatBRL(totalRealizedMonthlyIncome)}{" "}
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1 uppercase">
                        Realizada
                      </span>
                    </>
                  ) : (
                    <>
                      {formatBRL(totalProjectedMonthlyIncome)}{" "}
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1 uppercase">
                        Projetada
                      </span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  {totalRealizedMonthlyIncome != null ? (
                    <>
                      Renda passiva real registrada no histórico. Projeção anual cadastrada:{" "}
                      <span className="font-semibold text-foreground">{formatBRL(totalProjectedMonthlyIncome)}/mês</span> ({weightedAverageAnnualYield.toFixed(2)}% a.a.).
                    </>
                  ) : (
                    <>
                      Renda projetada baseada nas taxas cadastradas ({weightedAverageAnnualYield.toFixed(2)}% a.a.). Renda realizada: <span className="font-semibold text-muted-foreground">Dados históricos insuficientes</span>.
                    </>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Recorde Histórico */}
            <Card className="border-amber-500/25 bg-amber-500/5">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardDescription className="text-[10px] font-semibold text-amber-500 uppercase">Recorde ({maxIncomeLabel})</CardDescription>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold text-[8px] border border-amber-500/20">🏆 Recorde</span>
                </div>
                <CardTitle className="text-xl font-black text-amber-500 mt-1">
                  {formatBRL(maxIncomeValue)} <span className="text-[10px] font-normal text-muted-foreground">/mês</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Maior geração de renda passiva mensal real registrada no seu histórico de portfólios (atingida em <span className="font-semibold text-foreground">{maxIncomeLabel}</span>).
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Banner */}
          <Card className={`border-border p-4 ${diffMonthlyIncome >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Prêmio de Risco e Liquidez Mensal {capitalMode === "actual" && totalRealizedMonthlyIncome != null ? "(Renda Realizada vs CDI)" : "(Renda Projetada vs CDI)"}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Diferença líquida de fluxo de caixa ({capitalMode === "actual" && totalRealizedMonthlyIncome != null ? "Renda Realizada" : "Renda Projetada"}) em relação ao CDI.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className={`text-2xl font-black ${diffMonthlyIncome >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                  {diffMonthlyIncome >= 0 ? "+" : ""}{formatBRL(diffMonthlyIncome)}
                </p>
                <div className="text-left max-w-sm">
                  <p className="text-[10px] font-medium leading-relaxed">
                    {diffMonthlyIncome >= 0 
                      ? "Compensa! Sua carteira está gerando um retorno adicional em relação ao CDI de liquidez diária. Isso compensa o risco e a falta de liquidez dos ativos travados." 
                      : "Não compensa! Sua carteira está rendendo menos do que o CDI de liquidez diária. Você está assumindo risco e travando liquidez sem receber um prêmio de retorno que justifique."}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Assets table & Visual chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List & Edit */}
          <Card className="lg:col-span-2 border-border overflow-hidden">
            <CardHeader className="border-b border-border bg-card/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-primary" />
                Ativos de Portfólio e Rentabilidades Cadastradas
              </CardTitle>
              <CardDescription className="text-xs">
                Renda Projetada baseada na taxa anual cadastrada de cada ativo. Ativos sem taxa cadastrada usam o CDI ({CDI_RATE}% a.a.) como referência de projeção.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Alocação</TableHead>
                      <TableHead className="text-center w-[90px]">Classe/Região</TableHead>
                      <TableHead className="text-center w-[120px]">Taxa Projetada</TableHead>
                      <TableHead className="text-right">Renda Projetada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulatedInvestments.map((inv) => (
                      <TableRow key={inv.name}>
                        <TableCell className="font-semibold py-3">
                          <div>
                            <p className="text-sm text-foreground">{inv.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Part.: {formatPercent(inv.allocationRatio * 100)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatBRL(inv.allocatedCapital)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            inv.incomeType === "fixed" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                          }`}>
                            {inv.incomeType === "fixed" ? "F.I." : "Var."}
                          </span>
                          <span className="text-[10px] ml-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full font-medium">
                            {inv.region === "brazil" ? "BR" : "Int"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs text-foreground">
                          {inv.hasProjectionRate ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className={inv.isNegative ? "text-muted-foreground line-through font-normal" : ""}>
                                {inv.annualYield.toFixed(2)}% a.a.
                              </span>
                              {inv.isNegative && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="w-3.5 h-3.5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center cursor-help text-[9px] font-bold">?</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="w-56 text-xs leading-normal font-normal text-left">
                                        A rentabilidade anual calculada foi negativa (<strong>{inv.rawYield.toFixed(2)}% a.a.</strong>). Em simulações de fluxo de caixa (renda passiva), a taxa é zerada para refletir que ativos em desvalorização não drenam caixa da sua conta.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {inv.isCapped && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="w-3.5 h-3.5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center cursor-help text-[9px] font-bold">!</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="w-56 text-xs leading-normal font-normal text-left">
                                        A taxa anualizada calculada de <strong>{inv.rawYield.toFixed(2)}% a.a.</strong> foi limitada a {inv.annualYield}% a.a. para simulação conservadora de renda passiva de longo prazo.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-normal text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary text-sm">
                          {inv.projectedMonthlyIncome != null ? (
                            formatBRL(inv.projectedMonthlyIncome)
                          ) : (
                            <span className="text-xs font-normal text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2 bg-card/20 border-b border-border">
              <CardTitle className="text-sm font-semibold">
                Divisão da Renda Passiva
              </CardTitle>
              <CardDescription className="text-xs">
                Distribuição percentual da geração de caixa mensal por ativo.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col items-center justify-center min-h-[300px]">
              {chartData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  Sem ativos gerando renda passiva no portfólio deste mês.
                </div>
              ) : (
                <>
                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          formatter={(value: any) => [formatBRL(Number(value)), "Renda Mensal"]}
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend list */}
                  <div className="w-full space-y-1 mt-2 text-xs">
                    {chartData.slice(0, 5).map((d) => {
                      const share = (d.value / totalMonthlyPassiveIncome) * 100;
                      return (
                        <div key={d.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground truncate">{d.name}</span>
                          </div>
                          <span className="font-semibold text-foreground shrink-0">{share.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                    {chartData.length > 5 && (
                      <p className="text-[10px] text-muted-foreground text-center pt-2">
                        + {chartData.length - 5} outros ativos gerando caixa
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Milestone Goals - WOW Factor */}
        <Card className="border-border bg-gradient-to-r from-card/50 via-card/80 to-card/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Metas de Estilo de Vida e Independência Financeira
            </CardTitle>
            <CardDescription className="text-xs">
              Acompanhe o que a sua renda passiva mensal projetada de <span className="font-bold text-foreground">{formatBRL(totalMonthlyPassiveIncome)}</span> seria capaz de financiar hoje.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestones.map((ms) => {
                const percentMet = Math.min(100, (totalMonthlyPassiveIncome / ms.value) * 100);
                const isMet = percentMet === 100;

                // Target capital calculation based on current portfolio's weighted annual yield
                const r = (weightedAverageAnnualYield / 12) / 100;
                const A = monthlyContribution;
                const C0 = simulatedCapital;
                const annualYieldRate = weightedAverageAnnualYield > 0 ? weightedAverageAnnualYield : CDI_RATE;
                const targetCapital = ms.value / ((annualYieldRate / 12) / 100);

                let yearsNeeded: number | null = null;
                if (C0 >= targetCapital) {
                  yearsNeeded = 0;
                } else if (r > 0 || A > 0) {
                  if (r > 0) {
                    // n = ln( (C + A/r) / (C0 + A/r) ) / ln(1 + r)
                    const nom = targetCapital + A / r;
                    const den = C0 + A / r;
                    const months = Math.log(nom / den) / Math.log(1 + r);
                    yearsNeeded = months / 12;
                  } else {
                    // No yield, linear growth
                    const months = (targetCapital - C0) / A;
                    yearsNeeded = months / 12;
                  }
                }

                let yearsText = "";
                if (isMet) {
                  yearsText = "Meta Atingida";
                } else if (yearsNeeded === null) {
                  yearsText = "Aporte/Rentabilidade zero";
                } else if (yearsNeeded < 0.083) {
                  yearsText = "menos de 1 mês";
                } else if (yearsNeeded < 1) {
                  const months = Math.round(yearsNeeded * 12);
                  yearsText = `${months} ${months === 1 ? "mês" : "meses"}`;
                } else {
                  yearsText = `${yearsNeeded.toFixed(1)} ${yearsNeeded >= 2.0 ? "anos" : "ano"}`;
                }

                return (
                  <div 
                    key={ms.id} 
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      isMet 
                        ? "bg-emerald-500/5 border-emerald-500/30 shadow-sm" 
                        : "bg-background/40 border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl mt-0.5">{ms.icon}</div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className={`text-xs font-bold truncate ${isMet ? "text-emerald-500" : "text-foreground"}`}>
                            {ms.label}
                          </h4>
                          <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                            Meta: {formatBRL(ms.value)}/mês
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                          {ms.desc}
                        </p>
                        
                        {/* Target capital badge */}
                        <div className="flex justify-between items-center text-[9px] text-muted-foreground mb-3 bg-muted/40 p-1.5 rounded border border-border/30">
                          <span>Patrimônio Alvo: <strong className="text-foreground">{formatBRL(targetCapital)}</strong></span>
                          {!isMet && (
                            <span>Aporte: <strong className="text-foreground">{formatBRL(monthlyContribution)}/mês</strong></span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className={isMet ? "text-emerald-500" : "text-muted-foreground"}>
                              {isMet ? "Alcançada! 🎉" : `Tempo Estimado: ${yearsText}`}
                            </span>
                            <span>{percentMet.toFixed(0)}%</span>
                          </div>
                          <Progress 
                            value={percentMet} 
                            className={`h-1.5 ${isMet ? "bg-emerald-950" : ""}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
};

export default PassiveIncomeSimulator;
