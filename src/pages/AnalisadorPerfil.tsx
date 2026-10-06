import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  UserCheck,
  TrendingUp,
  Wallet,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Info,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  HeartHandshake
} from "lucide-react";
import { useInvestorProfile } from "@/hooks/useInvestorProfile";
import { formatBRL } from "@/data/investments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";

const AnalisadorPerfil = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    profileInput,
    calculationResult,
    saveProfile,
    isSaving,
    defaultInvestedAssets,
    defaultMonthlyContribution
  } = useInvestorProfile();

  const [formValues, setFormValues] = useState({
    investedAssets: profileInput.investedAssets ? String(profileInput.investedAssets) : "",
    monthlyContribution: profileInput.monthlyContribution ? String(profileInput.monthlyContribution) : "",
    monthlyIncome: profileInput.monthlyIncome ? String(profileInput.monthlyIncome) : "",
    age: profileInput.age ? String(profileInput.age) : "35",
    investmentHorizonYears: profileInput.investmentHorizonYears ? String(profileInput.investmentHorizonYears) : "15",
    riskProfile: profileInput.riskProfile || "Moderado",
  });

  useEffect(() => {
    setFormValues({
      investedAssets: profileInput.investedAssets ? String(profileInput.investedAssets) : "",
      monthlyContribution: profileInput.monthlyContribution ? String(profileInput.monthlyContribution) : "",
      monthlyIncome: profileInput.monthlyIncome ? String(profileInput.monthlyIncome) : "",
      age: profileInput.age ? String(profileInput.age) : "35",
      investmentHorizonYears: profileInput.investmentHorizonYears ? String(profileInput.investmentHorizonYears) : "15",
      riskProfile: profileInput.riskProfile || "Moderado",
    });
  }, [profileInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assets = parseFloat(formValues.investedAssets) || 0;
    const contribution = parseFloat(formValues.monthlyContribution) || 0;

    saveProfile(
      {
        investedAssets: assets,
        monthlyContribution: contribution,
        monthlyIncome: parseFloat(formValues.monthlyIncome) || 0,
        age: parseInt(formValues.age, 10) || 35,
        investmentHorizonYears: parseInt(formValues.investmentHorizonYears, 10) || 15,
        riskProfile: formValues.riskProfile,
      },
      {
        onSuccess: () => {
          toast({
            title: "Perfil Atualizado!",
            description: "O diagnóstico do seu estágio patrimonial foi recalculado com sucesso.",
          });
        },
      }
    );
  };

  const handleUseCurrentPortfolio = () => {
    setFormValues((prev) => ({
      ...prev,
      investedAssets: String(defaultInvestedAssets),
    }));
    toast({
      title: "Patrimônio Preenchido",
      description: `Valor total da carteira (${formatBRL(defaultInvestedAssets)}) importado.`,
    });
  };

  const handleUseTargetContribution = () => {
    setFormValues((prev) => ({
      ...prev,
      monthlyContribution: String(defaultMonthlyContribution),
    }));
    toast({
      title: "Meta de Aporte Preenchida",
      description: `Valor de aporte mensal (${formatBRL(defaultMonthlyContribution)}) importado.`,
    });
  };

  const hasData = (parseFloat(formValues.investedAssets) > 0 || parseFloat(formValues.monthlyContribution) > 0);

  const getPriorityBadgeVariant = (level: "ALTA" | "MÉDIA" | "BAIXA") => {
    if (level === "ALTA") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (level === "MÉDIA") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation Header */}
      <header className="border-b border-border/80 sticky top-0 z-50 bg-background/80 backdrop-blur-xl shadow-sm">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-900/20">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight leading-none text-foreground">Analisador de Perfil</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Diagnóstico do Estágio Patrimonial</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6 flex-1">
        {/* Top Banner / Description */}
        <div className="gradient-card rounded-2xl border border-border/70 p-5 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono text-xs">
                  Engine V1
                </Badge>
                <span className="text-xs text-muted-foreground">Classificação Analítica Independente</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">Descubra a Fase Atual da sua Construção Patrimonial</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este analisador avalia a relação entre sua capacidade de aporte anual e seu patrimônio atual para identificar se sua prioridade estratégica deve ser **Aumentar Aportes**, **Investir Melhor** ou **Administrar & Usufruir**.
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 px-3 py-1.5 text-xs font-semibold gap-1.5 bg-secondary/80 border border-border">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Metodologia Isola Perfil de Risco
            </Badge>
          </div>
        </div>

        {!hasData && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Complete seus dados no formulário abaixo para calcular seu perfil patrimonial.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Column */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="gradient-card border-border/70 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" /> Dados Financeiros
                </CardTitle>
                <CardDescription className="text-xs">
                  Informe seus dados para classificar seu estágio de acumulação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Patrimônio Investido */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="investedAssets" className="text-xs font-semibold">
                        Patrimônio Investido (R$)
                      </Label>
                      {defaultInvestedAssets > 0 && (
                        <button
                          type="button"
                          onClick={handleUseCurrentPortfolio}
                          className="text-[11px] text-emerald-400 hover:underline font-medium flex items-center gap-1"
                        >
                          Usar da Carteira
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Wallet className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        id="investedAssets"
                        type="number"
                        step="any"
                        placeholder="Ex: 200000"
                        className="pl-9 font-mono text-sm"
                        value={formValues.investedAssets}
                        onChange={(e) => setFormValues({ ...formValues, investedAssets: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Aporte Mensal */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="monthlyContribution" className="text-xs font-semibold">
                        Aporte Mensal (R$)
                      </Label>
                      {defaultMonthlyContribution > 0 && (
                        <button
                          type="button"
                          onClick={handleUseTargetContribution}
                          className="text-[11px] text-emerald-400 hover:underline font-medium flex items-center gap-1"
                        >
                          Usar Meta
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <PiggyBank className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        id="monthlyContribution"
                        type="number"
                        step="any"
                        placeholder="Ex: 5000"
                        className="pl-9 font-mono text-sm"
                        value={formValues.monthlyContribution}
                        onChange={(e) => setFormValues({ ...formValues, monthlyContribution: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Renda Mensal (Opcional) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="monthlyIncome" className="text-xs font-semibold">
                      Renda Mensal (R$) <span className="text-muted-foreground font-normal">(Opcional)</span>
                    </Label>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      step="any"
                      placeholder="Ex: 15000"
                      className="font-mono text-sm"
                      value={formValues.monthlyIncome}
                      onChange={(e) => setFormValues({ ...formValues, monthlyIncome: e.target.value })}
                    />
                  </div>

                  {/* Idade & Horizonte */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="age" className="text-xs font-semibold">
                        Idade <span className="text-muted-foreground font-normal">(Anos)</span>
                      </Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="35"
                        className="font-mono text-sm"
                        value={formValues.age}
                        onChange={(e) => setFormValues({ ...formValues, age: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="horizon" className="text-xs font-semibold">
                        Horizonte <span className="text-muted-foreground font-normal">(Anos)</span>
                      </Label>
                      <Input
                        id="horizon"
                        type="number"
                        placeholder="15"
                        className="font-mono text-sm"
                        value={formValues.investmentHorizonYears}
                        onChange={(e) => setFormValues({ ...formValues, investmentHorizonYears: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Perfil de Risco (Dimensão Independente) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="riskProfile" className="text-xs font-semibold">
                        Perfil de Risco
                      </Label>
                      <span className="text-[10px] text-muted-foreground">Dimensão Independente</span>
                    </div>
                    <select
                      id="riskProfile"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={formValues.riskProfile}
                      onChange={(e) => setFormValues({ ...formValues, riskProfile: e.target.value })}
                    >
                      <option value="Conservador">Conservador</option>
                      <option value="Moderado">Moderado</option>
                      <option value="Arrojado">Arrojado</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 font-semibold text-xs h-9 shadow-sm"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Calcular Perfil Patrimonial
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* MAIN CARD: SEU PERFIL PATRIMONIAL */}
            <Card className="gradient-card border-border/80 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Badge
                  className={`text-xs font-bold px-3 py-1 font-mono uppercase tracking-wider flex items-center gap-1.5 border ${
                    calculationResult.stageBadgeColor === "emerald"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : calculationResult.stageBadgeColor === "amber"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  }`}
                >
                  <span>{calculationResult.stageEmoji}</span>
                  <span>{calculationResult.stageLabel}</span>
                </Badge>
              </div>

              <CardHeader className="pb-3">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Diagnóstico Consolidado
                </CardDescription>
                <CardTitle className="text-xl font-extrabold text-foreground tracking-tight">
                  SEU PERFIL PATRIMONIAL
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Visual Accumulation Indicator */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Índice de Acumulação</span>
                    <span className="font-mono font-extrabold text-sm text-emerald-400">
                      {calculationResult.accumulationRatioPercent.toFixed(2)}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-3 rounded-full bg-secondary relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        calculationResult.stageBadgeColor === "emerald"
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : calculationResult.stageBadgeColor === "amber"
                          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                          : "bg-gradient-to-r from-blue-500 to-cyan-400"
                      }`}
                      style={{ width: `${Math.min(calculationResult.accumulationRatioPercent, 100)}%` }}
                    />
                  </div>

                  {/* Stage Range Markers */}
                  <div className="grid grid-cols-3 text-[10px] text-muted-foreground font-mono pt-1 text-center border-t border-border/30">
                    <span className={calculationResult.stage === "maintenance" ? "text-blue-400 font-bold" : ""}>
                      &lt; 5% (Manutenção)
                    </span>
                    <span className={calculationResult.stage === "transition" ? "text-amber-400 font-bold" : ""}>
                      5% - 20% (Transição)
                    </span>
                    <span className={calculationResult.stage === "construction" || calculationResult.stage === "construction_initial" ? "text-emerald-400 font-bold" : ""}>
                      &gt; 20% (Construção)
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-card/60 p-4 rounded-xl border border-border/50">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Patrimônio Investido</span>
                    <span className="font-mono font-bold text-foreground">
                      {formatBRL(calculationResult.investedAssets)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Aporte Mensal</span>
                    <span className="font-mono font-bold text-foreground">
                      {formatBRL(calculationResult.monthlyContribution)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Aporte Anual</span>
                    <span className="font-mono font-bold text-foreground">
                      {formatBRL(calculationResult.annualContribution)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Índice de Acumulação</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {calculationResult.accumulationRatioPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Principal Prioridade Banner */}
                <div className="p-3.5 rounded-xl bg-secondary/60 border border-border flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">Principal Prioridade Estratégica:</span>
                  <span className="text-xs font-bold text-foreground font-mono text-right">
                    {calculationResult.mainPriority}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* STAGE EXPLANATION CARD */}
            <Card className="gradient-card border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-400" /> Diagnóstico da Fase
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-foreground leading-relaxed bg-card/40 p-4 rounded-xl border border-border/40 font-medium">
                  "{calculationResult.explanationText}"
                </p>
              </CardContent>
            </Card>

            {/* STRATEGIC PRIORITY INDICATORS MATRIX */}
            <Card className="gradient-card border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Matriz de Prioridades Estratégicas
                </CardTitle>
                <CardDescription className="text-xs">
                  Recomendação analítica de foco para a sua fase patrimonial.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-card/50 border border-border/50 flex flex-col justify-between space-y-2">
                  <span className="text-xs font-semibold text-foreground">Aumentar Aportes</span>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Prioridade:</span>
                    <Badge variant="outline" className={`font-mono text-xs font-bold px-2.5 py-0.5 ${getPriorityBadgeVariant(calculationResult.priorities.aumentarAportes)}`}>
                      {calculationResult.priorities.aumentarAportes}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card/50 border border-border/50 flex flex-col justify-between space-y-2">
                  <span className="text-xs font-semibold text-foreground">Investir Melhor</span>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Prioridade:</span>
                    <Badge variant="outline" className={`font-mono text-xs font-bold px-2.5 py-0.5 ${getPriorityBadgeVariant(calculationResult.priorities.investirMelhor)}`}>
                      {calculationResult.priorities.investirMelhor}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card/50 border border-border/50 flex flex-col justify-between space-y-2">
                  <span className="text-xs font-semibold text-foreground">Usufruir / Consumir</span>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Prioridade:</span>
                    <Badge variant="outline" className={`font-mono text-xs font-bold px-2.5 py-0.5 ${getPriorityBadgeVariant(calculationResult.priorities.usufruirConsumir)}`}>
                      {calculationResult.priorities.usufruirConsumir}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QUALITY OF LIFE & TRADE-OFF REFLECTION */}
            <Card className="gradient-card border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <HeartHandshake className="w-4 h-4 text-emerald-400" /> Fator Qualidade de Vida & Equilíbrio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed italic bg-secondary/30 p-3.5 rounded-xl border border-border/40">
                  {calculationResult.qualityOfLifeNotice}
                </p>
              </CardContent>
            </Card>

            {/* INDEPENDENCE NOTE BADGE */}
            <div className="p-3 rounded-xl bg-card/40 border border-border/60 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground text-[11px]">Dimensões Analíticas Isoladas:</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[11px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  Estágio: {calculationResult.stageLabel}
                </Badge>
                <Badge variant="outline" className="font-mono text-[11px] border-primary/30 text-primary bg-primary/10">
                  Risco: {formValues.riskProfile}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalisadorPerfil;
