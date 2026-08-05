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
  DollarSign
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ChartTooltip, Legend } from "recharts";

const PassiveIncomeSimulator = () => {
  const { data: monthlyData = [], isLoading } = useSnapshots();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [capitalMode, setCapitalMode] = useState<"actual" | "custom">("actual");
  const [customCapital, setCustomCapital] = useState<number>(100000);
  const [simulatedYields, setSimulatedYields] = useState<Record<string, number>>({});

  // Select latest month as default
  useEffect(() => {
    if (monthlyData.length > 0 && !selectedMonth) {
      setSelectedMonth(monthlyData[monthlyData.length - 1].month);
    }
  }, [monthlyData, selectedMonth]);

  const snapshot = monthlyData.find((s) => s.month === selectedMonth) || monthlyData[monthlyData.length - 1];

  // Initialize simulated yields when snapshot changes
  useEffect(() => {
    if (!snapshot) return;
    const initialYields: Record<string, number> = {};
    snapshot.investments.forEach((inv) => {
      if (inv.annualReturn && inv.annualReturn > 0) {
        initialYields[inv.name] = inv.annualReturn;
      } else {
        // Defaults based on asset naming or type
        const nameLower = inv.name.toLowerCase();
        if (
          inv.incomeType === "fixed" || 
          nameLower.includes("prev") || 
          nameLower.includes("reserva") || 
          nameLower.includes("nubank") ||
          nameLower.includes("ipca") ||
          nameLower.includes("allu")
        ) {
          initialYields[inv.name] = 12.0; // CDI/Selic reference
        } else {
          initialYields[inv.name] = 18.0; // Variable income reference
        }
      }
    });
    setSimulatedYields(initialYields);
  }, [snapshot]);

  if (isLoading || !snapshot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse text-sm">Carregando simulador...</div>
      </div>
    );
  }

  const simulatedCapital = capitalMode === "actual" ? (snapshot.total || 0) : customCapital;
  const totalRealWealth = snapshot.total || 1;

  // Process investments with simulated calculations
  const simulatedInvestments = snapshot.investments.map((inv) => {
    const realValue = inv.valueBRL ?? inv.value;
    const allocationRatio = realValue / totalRealWealth;
    const allocatedCapital = simulatedCapital * allocationRatio;
    const annualYield = simulatedYields[inv.name] ?? (inv.incomeType === "fixed" ? 12 : 18);
    const monthlyYield = annualYield / 12;
    const monthlyPassiveIncome = allocatedCapital * (monthlyYield / 100);

    return {
      ...inv,
      realValue,
      allocationRatio,
      allocatedCapital,
      annualYield,
      monthlyYield,
      monthlyPassiveIncome,
    };
  });

  const totalMonthlyPassiveIncome = simulatedInvestments.reduce((sum, inv) => sum + inv.monthlyPassiveIncome, 0);
  const weightedAverageMonthlyYield = simulatedCapital > 0 ? (totalMonthlyPassiveIncome / simulatedCapital) * 100 : 0;
  const weightedAverageAnnualYield = weightedAverageMonthlyYield * 12;

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

  const handleYieldChange = (name: string, val: number) => {
    setSimulatedYields((prev) => ({
      ...prev,
      [name]: Math.min(100, Math.max(0, val)),
    }));
  };

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
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

        {/* Assets table & Visual chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List & Edit */}
          <Card className="lg:col-span-2 border-border overflow-hidden">
            <CardHeader className="border-b border-border bg-card/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-primary" />
                Ativos de Portfólio e Ajuste de Rentabilidade
              </CardTitle>
              <CardDescription className="text-xs">
                Ajuste a taxa de rentabilidade anual (%) simulada para cada ativo. A alocação em R$ e a renda gerada refletirão proporcionalmente.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Alocação</TableHead>
                      <TableHead className="text-center w-[120px]">Classe/Região</TableHead>
                      <TableHead className="w-[180px]">Rentabilidade Anual (Simulada)</TableHead>
                      <TableHead className="text-right">Renda Mensal</TableHead>
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
                        <TableCell className="py-2">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center gap-1">
                              <Slider
                                min={0}
                                max={50}
                                step={0.5}
                                value={[inv.annualYield]}
                                onValueChange={([val]) => handleYieldChange(inv.name, val)}
                                className="w-full flex-grow cursor-pointer"
                              />
                              <div className="relative w-16 shrink-0">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.5}
                                  value={inv.annualYield}
                                  onChange={(e) => handleYieldChange(inv.name, Number(e.target.value))}
                                  className="h-7 text-xs text-right pr-4 font-semibold"
                                />
                                <span className="absolute right-1 top-1.5 text-[9px] font-semibold text-muted-foreground">%</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-500">
                          {formatBRL(inv.monthlyPassiveIncome)}
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
                  Ajuste a rentabilidade dos ativos acima de 0% para gerar renda passiva.
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
                            Meta: {formatBRL(ms.value)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                          {ms.desc}
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className={isMet ? "text-emerald-500" : "text-muted-foreground"}>
                              {isMet ? "Alcançada! 🎉" : "Progresso"}
                            </span>
                            <span>{percentMet.toFixed(0)}%</span>
                          </div>
                          <Progress 
                            value={percentMet} 
                            className={`h-1.5 ${isMet ? "bg-emerald-950" : ""}`}
                            // Note: Tailwind style for progress-bar color injection if supported
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
