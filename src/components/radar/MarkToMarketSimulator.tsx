import { useState, useMemo, useEffect } from "react";
import type { TesouroBond } from "@/hooks/useTesouroData";
import {
  simulateMarkToMarket,
  SimulationResult,
} from "@/calculations/fixedIncome/markToMarket";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Percent,
  Calculator,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceDot,
} from "recharts";

interface MarkToMarketSimulatorProps {
  bonds: TesouroBond[];
  selectedBondName?: string;
  onSelectBondName?: (name: string) => void;
}

function formatBRL(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(val: number) {
  const p = val * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
}

export const MarkToMarketSimulator = ({
  bonds,
  selectedBondName,
  onSelectBondName,
}: MarkToMarketSimulatorProps) => {
  // Default to Tesouro IPCA+ 2029 or first bond
  const defaultBond = useMemo(() => {
    if (bonds.length === 0) return null;
    const ipca2029 = bonds.find(
      (b) => b.type === "IPCA" && b.name.includes("2029")
    );
    if (ipca2029) return ipca2029;
    const firstIpca = bonds.find((b) => b.type === "IPCA");
    return firstIpca || bonds[0];
  }, [bonds]);

  const [activeBondName, setActiveBondName] = useState<string>(
    selectedBondName || defaultBond?.name || ""
  );

  useEffect(() => {
    if (selectedBondName) {
      setActiveBondName(selectedBondName);
    } else if (defaultBond && !activeBondName) {
      setActiveBondName(defaultBond.name);
    }
  }, [selectedBondName, defaultBond]);

  const currentBond = useMemo(() => {
    return bonds.find((b) => b.name === activeBondName) || defaultBond;
  }, [bonds, activeBondName, defaultBond]);

  // Form states
  const [investedAmount, setInvestedAmount] = useState<number>(40000);
  const [customCurrentRate, setCustomCurrentRate] = useState<string>("");
  const [targetRate, setTargetRate] = useState<number>(5.0);
  const [expectedIpca, setExpectedIpca] = useState<number>(5.0);
  const [includeCosts, setIncludeCosts] = useState<boolean>(false);
  const [showCostsSection, setShowCostsSection] = useState<boolean>(false);

  // Sync customCurrentRate when currentBond changes
  useEffect(() => {
    if (currentBond) {
      setCustomCurrentRate(currentBond.buyRate.toFixed(2));
      // Adjust target rate preset based on bond type
      if (currentBond.type === "PREFIXADO") {
        setTargetRate(10.0);
      } else {
        setTargetRate(5.0);
      }
    }
  }, [currentBond]);

  const effectiveCurrentRate = useMemo(() => {
    const parsed = parseFloat(customCurrentRate.replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) return parsed;
    return currentBond?.buyRate || 7.7;
  }, [customCurrentRate, currentBond]);

  // Execute central simulation calculation engine
  const result: SimulationResult | null = useMemo(() => {
    if (!currentBond) return null;

    return simulateMarkToMarket({
      bond: {
        name: currentBond.name,
        type: currentBond.type,
        buyRate: currentBond.buyRate,
        price: currentBond.price,
        maturityDate: currentBond.maturityDate,
        maturityYears: currentBond.maturityYears,
      },
      investmentAmount: investedAmount,
      currentRate: effectiveCurrentRate,
      targetRate: targetRate,
      expectedIpca: expectedIpca,
      includeCosts: includeCosts,
    });
  }, [currentBond, investedAmount, effectiveCurrentRate, targetRate, expectedIpca, includeCosts]);

  // Quick scenario buttons (e.g. 7.00%, 6.00%, 5.50%, 5.00%, 4.50%)
  const scenarioButtons = useMemo(() => {
    if (!currentBond) return [];
    if (currentBond.type === "PREFIXADO") {
      return [11.0, 10.5, 10.0, 9.5, 9.0];
    }
    return [7.0, 6.0, 5.5, 5.0, 4.5];
  }, [currentBond]);

  // Sensitivity Chart Points
  const chartData = useMemo(() => {
    if (!currentBond) return [];
    const points = [];
    const baseRate = effectiveCurrentRate;

    // Generate rate range around base rate
    const minRate = Math.max(1.0, Math.floor(baseRate - 3.5));
    const maxRate = Math.ceil(baseRate + 3.5);
    const step = 0.5;

    for (let r = minRate; r <= maxRate; r += step) {
      const roundedRate = Math.round(r * 10) / 10;
      const sim = simulateMarkToMarket({
        bond: {
          name: currentBond.name,
          type: currentBond.type,
          buyRate: currentBond.buyRate,
          price: currentBond.price,
          maturityDate: currentBond.maturityDate,
          maturityYears: currentBond.maturityYears,
        },
        investmentAmount: investedAmount,
        currentRate: effectiveCurrentRate,
        targetRate: roundedRate,
        expectedIpca: expectedIpca,
      });

      points.push({
        rate: roundedRate,
        rateLabel: `${currentBond.type === "IPCA" ? "IPCA + " : ""}${roundedRate.toFixed(2)}%`,
        value: Math.round(sim.estimatedGrossValue),
        profit: Math.round(sim.estimatedGrossProfit),
        mtmPct: Number((sim.priceVariationPercent * 100).toFixed(2)),
      });
    }

    return points;
  }, [currentBond, investedAmount, effectiveCurrentRate, expectedIpca]);

  if (!currentBond || !result) {
    return null;
  }

  const isPositiveShift = result.priceVariationPercent > 0.0001;
  const isNegativeShift = result.priceVariationPercent < -0.0001;

  const handleBondChange = (val: string) => {
    setActiveBondName(val);
    if (onSelectBondName) {
      onSelectBondName(val);
    }
  };

  return (
    <Card id="mark-to-market-simulator" className="border-primary/40 bg-card shadow-lg scroll-mt-24">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-teal-500/20 border border-primary/30 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                Simulador de Marcação a Mercado
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                  Ferramenta Interativa
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Veja quanto seu investimento pode valer se a taxa do título mudar.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border/60">
          {/* 1. Título Select */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>1. Título Público</span>
              <span className="text-[10px] text-primary font-mono">{currentBond.type === "IPCA" ? "IPCA+" : "Prefixado"}</span>
            </Label>
            <Select value={activeBondName} onValueChange={handleBondChange}>
              <SelectTrigger className="h-9 text-xs font-medium">
                <SelectValue placeholder="Selecione o título" />
              </SelectTrigger>
              <SelectContent align="start">
                {bonds.map((b) => (
                  <SelectItem key={b.name} value={b.name} className="text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{b.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {b.type === "IPCA" ? `IPCA + ${b.buyRate.toFixed(2)}%` : `${b.buyRate.toFixed(2)}%`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-0.5 font-mono">
              <span>Venc: {new Date(currentBond.maturityDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
              <span>Prazo: {currentBond.maturityYears.toFixed(1)} anos</span>
            </div>
          </div>

          {/* 2. Valor Investido */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              2. Valor Investido (R$)
            </Label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">R$</span>
              <Input
                type="number"
                min={100}
                step={500}
                value={investedAmount || ""}
                onChange={(e) => setInvestedAmount(Math.max(0, Number(e.target.value)))}
                className="pl-8 h-9 text-xs font-mono font-bold"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Default: R$ 40.000,00</p>
          </div>

          {/* 3. Taxa Atual */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              3. Taxa Atual (% a.a.)
            </Label>
            <div className="relative">
              <Input
                type="text"
                value={customCurrentRate}
                onChange={(e) => setCustomCurrentRate(e.target.value)}
                className="h-9 text-xs font-mono font-bold pr-12"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground font-semibold">
                {currentBond.type === "IPCA" ? "IPCA+" : "a.a."}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Preenchido do Radar</p>
          </div>

          {/* 4. Taxa de Venda (Simulada) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">
                4. Taxa de Venda (Simulada)
              </Label>
              <span className="text-xs font-bold text-primary font-mono">
                {currentBond.type === "IPCA" ? "IPCA + " : ""}{targetRate.toFixed(2)}%
              </span>
            </div>
            <div className="pt-1">
              <Slider
                value={[targetRate]}
                min={2.0}
                max={currentBond.type === "PREFIXADO" ? 18.0 : 12.0}
                step={0.1}
                onValueChange={(vals) => setTargetRate(vals[0])}
                className="py-1"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Queda (ganho)</span>
              <span>Alta (perda)</span>
            </div>
          </div>
        </div>

        {/* 5. IPCA Médio & Cenários Rápido */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-3 rounded-xl border border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-36">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                IPCA Médio Anual
              </Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  step={0.25}
                  value={expectedIpca}
                  onChange={(e) => setExpectedIpca(Number(e.target.value))}
                  className="h-8 text-xs font-mono font-bold pr-8"
                />
                <span className="absolute right-2 top-1.5 text-[10px] text-muted-foreground">%</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground max-w-xs leading-tight">
              Estimativa de inflação para projeção do valor nominal futuro.
            </p>
          </div>

          {/* Quick Scenarios */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              Cenários Rápido (Taxa de Venda):
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {scenarioButtons.map((rateVal) => (
                <Button
                  key={rateVal}
                  variant={targetRate === rateVal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTargetRate(rateVal)}
                  className="h-7 text-xs font-mono px-2.5 shrink-0"
                >
                  {rateVal.toFixed(2)}%
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Result Display Card */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isPositiveShift
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-card"
            : isNegativeShift
            ? "border-destructive/40 bg-gradient-to-br from-destructive/10 via-destructive/5 to-card"
            : "border-border bg-muted/30"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                isPositiveShift ? "bg-emerald-500/20 text-emerald-400" : isNegativeShift ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
              }`}>
                {isPositiveShift ? <TrendingUp className="w-5 h-5" /> : isNegativeShift ? <TrendingDown className="w-5 h-5" /> : <ArrowRightLeft className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Efeito de Marcação a Mercado
                </span>
                <h4 className={`text-base font-bold ${
                  isPositiveShift ? "text-emerald-400" : isNegativeShift ? "text-destructive" : "text-muted-foreground"
                }`}>
                  {isPositiveShift
                    ? "Valorização Potencial"
                    : isNegativeShift
                    ? "Desvalorização Potencial"
                    : "Sem efeito relevante de marcação a mercado"}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="font-mono text-xs cursor-help bg-background/50">
                      Duration: {result.durationYears.toFixed(1)} anos <Info className="w-3 h-3 ml-1 text-muted-foreground inline" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Duration: medida da sensibilidade do preço do título às mudanças nas taxas de juros. Quanto maior o prazo e menor o cupom, maior a oscilação.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Badge className={`font-mono text-sm px-3 py-1 font-black ${
                isPositiveShift ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : isNegativeShift ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-muted text-foreground"
              }`}>
                {formatPct(result.priceVariationPercent)}
              </Badge>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 font-mono">
            <div className="bg-background/60 p-3 rounded-xl border border-border/40">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">
                Valor Investido
              </span>
              <span className="text-sm sm:text-base font-bold text-foreground">
                {formatBRL(result.investedAmount)}
              </span>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                Taxa: {currentBond.type === "IPCA" ? "IPCA + " : ""}{result.currentRate.toFixed(2)}%
              </div>
            </div>

            <div className="bg-background/60 p-3 rounded-xl border border-border/40">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">
                Taxa Simulada
              </span>
              <span className="text-sm sm:text-base font-bold text-primary">
                {currentBond.type === "IPCA" ? "IPCA + " : ""}{result.targetRate.toFixed(2)}%
              </span>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                MtM: {formatPct(result.priceVariationPercent)}
              </div>
            </div>

            <div className="bg-background/60 p-3 rounded-xl border border-border/40">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">
                Valor Estimado
              </span>
              <span className="text-sm sm:text-base font-black text-foreground">
                {formatBRL(result.estimatedGrossValue)}
              </span>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {currentBond.type === "IPCA" ? `IPCA ${expectedIpca.toFixed(1)}% p.a.` : "Bruto no período"}
              </div>
            </div>

            <div className="bg-background/60 p-3 rounded-xl border border-border/40">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold block">
                Lucro Bruto Estimado
              </span>
              <span className={`text-sm sm:text-base font-black ${
                result.estimatedGrossProfit >= 0 ? "text-emerald-400" : "text-destructive"
              }`}>
                {result.estimatedGrossProfit >= 0 ? "+" : ""}{formatBRL(result.estimatedGrossProfit)}
              </span>
              <div className={`text-[10px] font-bold mt-0.5 ${
                result.nominalReturnPercent >= 0 ? "text-emerald-400" : "text-destructive"
              }`}>
                {formatPct(result.nominalReturnPercent)} nominal
              </div>
            </div>
          </div>
        </div>

        {/* IPCA Distinction Note */}
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-start gap-2.5 text-xs text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-foreground">Importante:</strong> o ganho de marcação a mercado vem principalmente da mudança da taxa de mercado. O IPCA é utilizado para estimar a evolução nominal do investimento ao longo dos {result.remainingTermYears.toFixed(1)} anos restantes.
          </p>
        </div>

        {/* Sensitivity Chart */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              Curva de Sensibilidade (Taxa vs Preço)
            </h4>
            <span className="text-[11px] font-semibold text-emerald-400 font-mono">
              TAXA ↓ PREÇO ↑
            </span>
          </div>

          <div className="h-[180px] w-full bg-background/50 border border-border rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="rate"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <YAxis
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <RechartsTooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${formatBRL(Number(val))} (Lucro: ${formatBRL(item.payload.profit)})`,
                    `Valor Estimado`,
                  ]}
                  labelFormatter={(lbl) => `Taxa: ${currentBond.type === "IPCA" ? "IPCA + " : ""}${lbl}%`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Costs Expansion Section */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = !showCostsSection;
                setShowCostsSection(next);
                if (next) setIncludeCosts(true);
              }}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 p-0 h-auto"
            >
              {showCostsSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{showCostsSection ? "Ocultar Custos Estimados" : "[+] Considerar Custos (IR e Custódia B3)"}</span>
            </Button>
            <span className="text-[11px] text-muted-foreground font-mono">Resultado Bruto Inicial</span>
          </div>

          {showCostsSection && result.costsBreakdown && (
            <div className="mt-3 bg-muted/40 p-3.5 rounded-xl border border-border/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground font-sans block">Imposto de Renda (IR)</span>
                  <span className="font-bold text-destructive">
                    -{formatBRL(result.costsBreakdown.incomeTaxAmount)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">Alíquota: {result.costsBreakdown.incomeTaxRatePct}%</p>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground font-sans block">Custódia B3 (0.20% a.a.)</span>
                  <span className="font-bold text-destructive">
                    -{formatBRL(result.costsBreakdown.custodyFeeAmount)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">Proporcional ao prazo</p>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground font-sans block">Total de Custos</span>
                  <span className="font-bold text-destructive">
                    -{formatBRL(result.costsBreakdown.totalCosts)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">IR + B3</p>
                </div>

                <div className="bg-background/80 p-2 rounded-lg border border-border">
                  <span className="text-[10px] text-muted-foreground font-sans block font-semibold">Lucro Líquido Estimado</span>
                  <span className={`font-black text-sm ${result.costsBreakdown.netProfit >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                    {result.costsBreakdown.netProfit >= 0 ? "+" : ""}{formatBRL(result.costsBreakdown.netProfit)}
                  </span>
                  <p className="text-[10px] font-bold text-emerald-400">
                    {formatPct(result.costsBreakdown.netReturnPercent)} líquido
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer Warning */}
        <p className="text-[11px] text-muted-foreground/80 italic text-center pt-1 border-t border-border/40">
          Simulação teórica de marcação a mercado. O preço efetivo de venda pode diferir do valor calculado devido às condições de mercado e ao preço disponível no momento da venda.
        </p>
      </CardContent>
    </Card>
  );
};

export default MarkToMarketSimulator;
