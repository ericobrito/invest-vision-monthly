import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSnapshots } from "@/hooks/useSnapshots";
import type { Investment, MonthlySnapshot } from "@/data/investments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lightbulb, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CDI_BENCHMARK = 12;
const TARGET_MIN = 20;
const TARGET_AGGRESSIVE = 30;

interface ClassifiedAsset {
  name: string;
  value: number;
  allocation: number;
  applied: number;
  annualReturn: number;
  totalReturn: number;
  classification: "low" | "medium" | "high";
}

interface RebalanceAction {
  name: string;
  direction: "reduce" | "increase";
  currentAllocation: number;
  newAllocation: number;
  changePercent: number;
  changeValue: number;
}

interface Scenario {
  name: string;
  description: string;
  actions: RebalanceAction[];
  expectedReturn: number;
  currentReturn: number;
}

function classifyAssets(investments: Investment[], total: number): ClassifiedAsset[] {
  return investments.map((inv) => {
    const allocation = total > 0 ? (inv.value / total) * 100 : 0;
    const annualReturn = inv.annualReturn ?? 0;
    const classification: "low" | "medium" | "high" =
      annualReturn < CDI_BENCHMARK ? "low" : annualReturn < 20 ? "medium" : "high";

    return {
      name: inv.name,
      value: inv.value,
      allocation,
      applied: inv.applied ?? inv.value,
      annualReturn,
      totalReturn: inv.totalReturn ?? 0,
      classification,
    };
  });
}

function computePortfolioReturn(assets: ClassifiedAsset[]): number {
  const totalAlloc = assets.reduce((s, a) => s + a.allocation, 0);
  if (totalAlloc === 0) return 0;
  return assets.reduce((s, a) => s + (a.allocation / 100) * a.annualReturn, 0);
}

function isCrypto(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("bitcoin") ||
    lower.includes("btc") ||
    lower.includes("cripto") ||
    lower.includes("crypto") ||
    lower.includes("bybit") ||
    lower.includes("eth") ||
    lower.includes("binance")
  );
}

function generateScenario(
  assets: ClassifiedAsset[],
  total: number,
  intensity: "conservative" | "balanced" | "aggressive"
): Scenario {
  const reductionFactor = intensity === "conservative" ? 0.03 : intensity === "balanced" ? 0.06 : 0.10;
  const maxCryptoAlloc = 25;

  const lowPerf = assets.filter((a) => a.classification === "low" && a.allocation > 1);
  const highPerf = assets.filter((a) => a.classification === "high");

  const actions: RebalanceAction[] = [];
  let freedAllocation = 0;

  // Reduce low performers
  for (const asset of lowPerf) {
    const reduction = Math.min(asset.allocation * reductionFactor * 10, asset.allocation * 0.5);
    if (reduction < 0.5) continue;
    const roundedReduction = Math.round(reduction * 100) / 100;
    actions.push({
      name: asset.name,
      direction: "reduce",
      currentAllocation: asset.allocation,
      newAllocation: asset.allocation - roundedReduction,
      changePercent: -roundedReduction,
      changeValue: -(total * roundedReduction) / 100,
    });
    freedAllocation += roundedReduction;
  }

  // Distribute to high performers
  if (highPerf.length > 0 && freedAllocation > 0) {
    const currentCryptoAlloc = assets.filter((a) => isCrypto(a.name)).reduce((s, a) => s + a.allocation, 0);
    const cryptoHighPerf = highPerf.filter((a) => isCrypto(a.name));
    const nonCryptoHighPerf = highPerf.filter((a) => !isCrypto(a.name));

    let cryptoShare = cryptoHighPerf.length > 0 ? freedAllocation * 0.4 : 0;
    const availableCryptoRoom = Math.max(0, maxCryptoAlloc - currentCryptoAlloc);
    cryptoShare = Math.min(cryptoShare, availableCryptoRoom);

    const nonCryptoShare = freedAllocation - cryptoShare;

    if (cryptoHighPerf.length > 0 && cryptoShare > 0) {
      const perAsset = cryptoShare / cryptoHighPerf.length;
      for (const asset of cryptoHighPerf) {
        actions.push({
          name: asset.name,
          direction: "increase",
          currentAllocation: asset.allocation,
          newAllocation: asset.allocation + perAsset,
          changePercent: perAsset,
          changeValue: (total * perAsset) / 100,
        });
      }
    }

    if (nonCryptoHighPerf.length > 0 && nonCryptoShare > 0) {
      const perAsset = nonCryptoShare / nonCryptoHighPerf.length;
      for (const asset of nonCryptoHighPerf) {
        actions.push({
          name: asset.name,
          direction: "increase",
          currentAllocation: asset.allocation,
          newAllocation: asset.allocation + perAsset,
          changePercent: perAsset,
          changeValue: (total * perAsset) / 100,
        });
      }
    }
  }

  // Simulate new return
  const assetMap = new Map(assets.map((a) => [a.name, { ...a }]));
  for (const action of actions) {
    const a = assetMap.get(action.name);
    if (a) {
      a.allocation = action.newAllocation;
    }
  }
  const newReturn = computePortfolioReturn([...assetMap.values()]);
  const currentReturn = computePortfolioReturn(assets);

  const labels = {
    conservative: { name: "Conservador", desc: "Pequenas mudanças, menor risco" },
    balanced: { name: "Balanceado", desc: "Mudanças moderadas" },
    aggressive: { name: "Agressivo", desc: "Maximizar retorno rumo a 30%" },
  };

  return {
    name: labels[intensity].name,
    description: labels[intensity].desc,
    actions: actions.filter((a) => Math.abs(a.changePercent) >= 0.3),
    expectedReturn: newReturn,
    currentReturn,
  };
}

const PlanoAcao = () => {
  const { data: monthlyData = [], isLoading } = useSnapshots();
  const [activeScenario, setActiveScenario] = useState("balanced");

  const snapshot = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return monthlyData[monthlyData.length - 1];
  }, [monthlyData]);

  const classifiedAssets = useMemo(() => {
    if (!snapshot) return [];
    return classifyAssets(snapshot.investments, snapshot.total);
  }, [snapshot]);

  const portfolioReturn = useMemo(() => computePortfolioReturn(classifiedAssets), [classifiedAssets]);

  const gap = TARGET_MIN - portfolioReturn;

  const scenarios = useMemo(() => {
    if (!snapshot || classifiedAssets.length === 0) return [];
    return [
      generateScenario(classifiedAssets, snapshot.total, "conservative"),
      generateScenario(classifiedAssets, snapshot.total, "balanced"),
      generateScenario(classifiedAssets, snapshot.total, "aggressive"),
    ];
  }, [classifiedAssets, snapshot]);

  const lowAssets = classifiedAssets.filter((a) => a.classification === "low");
  const medAssets = classifiedAssets.filter((a) => a.classification === "medium");
  const highAssets = classifiedAssets.filter((a) => a.classification === "high");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Carregando dados...</div>
      </div>
    );
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const pct = (v: number) => `${v.toFixed(2)}%`;

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
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Plano de Ação Inteligente</h1>
              <p className="text-xs text-muted-foreground">
                Sugestões de rebalanceamento para otimizar retornos
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {!snapshot ? (
          <div className="text-center py-20 text-muted-foreground">
            Nenhum dado de portfólio disponível.
          </div>
        ) : (
          <>
            {/* Performance Atual + Gap */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-primary/30">
                <CardContent className="p-5 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Rentabilidade Atual (ponderada)</p>
                  <p className={`text-2xl font-bold ${portfolioReturn >= TARGET_MIN ? "text-primary" : portfolioReturn >= CDI_BENCHMARK ? "text-yellow-500" : "text-destructive"}`}>
                    {pct(portfolioReturn)} ao ano
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/30">
                <CardContent className="p-5 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Meta Mínima</p>
                  <p className="text-2xl font-bold text-foreground">{pct(TARGET_MIN)} ao ano</p>
                  {gap > 0 ? (
                    <p className="text-sm text-destructive mt-1">
                      Você está {pct(gap)} abaixo da sua meta
                    </p>
                  ) : (
                    <p className="text-sm text-primary mt-1">
                      ✅ Meta atingida! (+{pct(Math.abs(gap))})
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="border-primary/30">
                <CardContent className="p-5 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Meta Agressiva</p>
                  <p className="text-2xl font-bold text-foreground">{pct(TARGET_AGGRESSIVE)} ao ano</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gap: {pct(Math.max(0, TARGET_AGGRESSIVE - portfolioReturn))}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Progress bar */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Progresso em relação à meta</span>
                  <span className="text-sm text-muted-foreground">{pct(portfolioReturn)} / {pct(TARGET_MIN)}</span>
                </div>
                <Progress value={Math.min(100, (portfolioReturn / TARGET_MIN) * 100)} className="h-3" />
              </CardContent>
            </Card>

            {/* Classificação de Ativos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <AssetGroup
                title="🔴 Baixa Performance"
                subtitle={`Retorno < ${CDI_BENCHMARK}% (abaixo do CDI)`}
                assets={lowAssets}
                colorClass="text-destructive"
                borderClass="border-destructive/30"
                fmt={fmt}
                pct={pct}
              />
              <AssetGroup
                title="🟡 Performance Média"
                subtitle={`Retorno entre ${CDI_BENCHMARK}% e 20%`}
                assets={medAssets}
                colorClass="text-yellow-500"
                borderClass="border-yellow-500/30"
                fmt={fmt}
                pct={pct}
              />
              <AssetGroup
                title="🟢 Alta Performance"
                subtitle="Retorno > 20%"
                assets={highAssets}
                colorClass="text-primary"
                borderClass="border-primary/30"
                fmt={fmt}
                pct={pct}
              />
            </div>

            {/* Cenários */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cenários de Rebalanceamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeScenario} onValueChange={setActiveScenario}>
                  <TabsList className="w-full sm:w-auto mb-4">
                    <TabsTrigger value="conservative" className="flex-1 sm:flex-none">Conservador</TabsTrigger>
                    <TabsTrigger value="balanced" className="flex-1 sm:flex-none">Balanceado</TabsTrigger>
                    <TabsTrigger value="aggressive" className="flex-1 sm:flex-none">Agressivo</TabsTrigger>
                  </TabsList>

                  {["conservative", "balanced", "aggressive"].map((key, idx) => {
                    const scenario = scenarios[idx];
                    if (!scenario) return null;
                    return (
                      <TabsContent key={key} value={key}>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">{scenario.description}</p>

                          {/* Impact */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card className="border-muted">
                              <CardContent className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Retorno Atual</p>
                                <p className="text-xl font-bold text-foreground">{pct(scenario.currentReturn)}</p>
                              </CardContent>
                            </Card>
                            <Card className="border-primary/30">
                              <CardContent className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Retorno Estimado</p>
                                <p className={`text-xl font-bold ${scenario.expectedReturn > scenario.currentReturn ? "text-primary" : "text-foreground"}`}>
                                  {pct(scenario.expectedReturn)}
                                </p>
                                {scenario.expectedReturn !== scenario.currentReturn && (
                                  <p className={`text-xs mt-1 ${scenario.expectedReturn > scenario.currentReturn ? "text-primary" : "text-destructive"}`}>
                                    {scenario.expectedReturn > scenario.currentReturn ? "+" : ""}
                                    {pct(scenario.expectedReturn - scenario.currentReturn)}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          {/* Actions */}
                          {scenario.actions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhuma ação sugerida neste cenário. Seu portfólio já está bem posicionado.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-foreground">Plano sugerido:</h4>
                              {scenario.actions
                                .filter((a) => a.direction === "reduce")
                                .length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-destructive flex items-center gap-1">
                                    <ArrowDownRight className="w-3 h-3" /> Reduzir:
                                  </p>
                                  {scenario.actions
                                    .filter((a) => a.direction === "reduce")
                                    .map((a) => (
                                      <div
                                        key={a.name}
                                        className="flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2 text-sm"
                                      >
                                        <span className="text-foreground">{a.name}</span>
                                        <span className="text-destructive font-medium">
                                          {pct(a.changePercent)} ({fmt(a.changeValue)})
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              )}
                              {scenario.actions
                                .filter((a) => a.direction === "increase")
                                .length > 0 && (
                                <div className="space-y-1 mt-3">
                                  <p className="text-xs font-medium text-primary flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> Aumentar:
                                  </p>
                                  {scenario.actions
                                    .filter((a) => a.direction === "increase")
                                    .map((a) => (
                                      <div
                                        key={a.name}
                                        className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-sm"
                                      >
                                        <span className="text-foreground">{a.name}</span>
                                        <span className="text-primary font-medium">
                                          +{pct(a.changePercent)} ({fmt(a.changeValue)})
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="border-muted">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ Este plano é uma sugestão baseada em dados históricos e não constitui recomendação de investimento.
                  Consulte seu assessor financeiro antes de tomar decisões.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

function AssetGroup({
  title,
  subtitle,
  assets,
  colorClass,
  borderClass,
  fmt,
  pct,
}: {
  title: string;
  subtitle: string;
  assets: ClassifiedAsset[];
  colorClass: string;
  borderClass: string;
  fmt: (v: number) => string;
  pct: (v: number) => string;
}) {
  const totalAlloc = assets.reduce((s, a) => s + a.allocation, 0);
  return (
    <Card className={borderClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {assets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Nenhum ativo</p>
        ) : (
          <>
            {assets
              .sort((a, b) => b.allocation - a.allocation)
              .map((a) => (
                <div key={a.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate mr-2">{a.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground">{pct(a.allocation)}</span>
                    <span className={colorClass + " font-medium"}>{pct(a.annualReturn)} a.a.</span>
                  </div>
                </div>
              ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{assets.length} ativos</span>
              <span>Total: {pct(totalAlloc)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PlanoAcao;
