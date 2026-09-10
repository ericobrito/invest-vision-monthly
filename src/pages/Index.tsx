import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshots, useSaveSnapshot, useDeleteSnapshot } from "@/hooks/useSnapshots";
import { useUpdateInvestment } from "@/hooks/useUpdateInvestment";
import type { SnapshotFormData } from "@/hooks/useSnapshots";
import type { Investment } from "@/data/investments";
import MonthSelector from "@/components/MonthSelector";
import SummaryCards from "@/components/SummaryCards";
import InvestmentTable from "@/components/InvestmentTable";
import AllocationChart from "@/components/AllocationChart";
import EvolutionChart from "@/components/EvolutionChart";
import AssetEvolutionChart from "@/components/AssetEvolutionChart";
import ContributionEvolutionChart from "@/components/ContributionEvolutionChart";
import SnapshotDialog from "@/components/SnapshotDialog";
import InvestmentEditDialog from "@/components/InvestmentEditDialog";
import InvestmentDetailDialog from "@/components/InvestmentDetailDialog";
import LanguageToggle from "@/components/LanguageToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { BarChart3, Plus, Pencil, Trash2, Target, Landmark, Lightbulb, Coins, Menu, ShieldCheck, PiggyBank, Trophy, Flame, Calculator, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Index = () => {
  const { t } = useTranslation();
  const { data: monthlyData = [], isLoading } = useSnapshots();
  const saveSnapshot = useSaveSnapshot();
  const deleteSnapshot = useDeleteSnapshot();
  const updateInvestment = useUpdateInvestment();

  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<typeof monthlyData[0] | undefined>();
  const [deleteMonth, setDeleteMonth] = useState<string | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [detailInvestment, setDetailInvestment] = useState<Investment | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const effectiveIndex = currentIndex ?? (monthlyData.length > 0 ? monthlyData.length - 1 : 0);
  const snapshot = monthlyData[effectiveIndex];

  const getLastDayOfMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month, 0);
    return date.toLocaleDateString("pt-BR");
  };

  const handleSave = (data: SnapshotFormData, existingMonth?: string) => {
    saveSnapshot.mutate(
      { data, existingMonth },
      {
        onSuccess: () => {
          toast({ title: existingMonth ? t("toast.monthUpdated") : t("toast.monthCreated") });
          setDialogOpen(false);
          setEditingSnapshot(undefined);
        },
        onError: (err) => {
          toast({ title: t("toast.saveError"), description: String(err), variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteMonth) return;
    deleteSnapshot.mutate(deleteMonth, {
      onSuccess: () => {
        toast({ title: t("toast.monthDeleted") });
        setDeleteMonth(null);
        if (effectiveIndex >= monthlyData.length - 1) {
          setCurrentIndex(Math.max(0, monthlyData.length - 2));
        }
      },
      onError: (err) => {
        toast({ title: t("toast.deleteError"), description: String(err), variant: "destructive" });
      },
    });
  };

  const handleEditInvestment = (inv: Investment) => {
    setEditingInvestment(inv);
    setInvestmentDialogOpen(true);
  };

  const handleDetailInvestment = (inv: Investment) => {
    setDetailInvestment(inv);
    setDetailDialogOpen(true);
  };

  const handleSaveInvestment = (updated: Investment) => {
    if (!snapshot || !editingInvestment) return;
    updateInvestment.mutate(
      {
        investmentName: editingInvestment.name,
        snapshotMonth: snapshot.month,
        updated,
        allSnapshots: monthlyData,
      },
      {
        onSuccess: () => {
          toast({ title: t("toast.investmentUpdated") });
          setInvestmentDialogOpen(false);
          setEditingInvestment(null);
        },
        onError: (err) => {
          toast({ title: t("toast.saveError"), description: String(err), variant: "destructive" });
        },
      }
    );
  };

  const openAdd = () => {
    setEditingSnapshot(undefined);
    setDialogOpen(true);
  };

  const openEdit = () => {
    if (snapshot) {
      setEditingSnapshot(snapshot);
      setDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">{t("app.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="shrink-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground whitespace-nowrap">{t("app.title")}</h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">{t("app.subtitle")}</p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1.5">
            <Link to="/radar">
              <Button variant="ghost" size="sm">
                <Target className="w-4 h-4 mr-1" /> {t("nav.radar")}
              </Button>
            </Link>
            <Link to="/desempenho-variavel">
              <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-medium">
                <Flame className="w-4 h-4 mr-1 text-emerald-400" /> Maiores Altas
              </Button>
            </Link>
            <Link to="/radar-tesouro">
              <Button variant="ghost" size="sm">
                <Landmark className="w-4 h-4 mr-1" /> {t("nav.tesouro")}
              </Button>
            </Link>
            <Link to="/plano-acao">
              <Button variant="ghost" size="sm">
                <Lightbulb className="w-4 h-4 mr-1" /> {t("nav.plan")}
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Mais <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/contabilidade-cripto" className="flex items-center gap-2 text-blue-400 font-medium">
                    <Calculator className="w-4 h-4 text-blue-400" /> Contabilidade Cripto
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/simulador-renda" className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4" /> Simulador
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/metas" className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> {t("nav.goals")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {snapshot && (
              <div className="flex items-center border-l border-border pl-1.5 ml-0.5 gap-0.5">
                <Button variant="ghost" size="icon" onClick={openEdit} title={t("nav.editMonth")} className="w-8 h-8">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteMonth(snapshot.month)}
                  title={t("nav.deleteMonth")}
                  className="w-8 h-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Button onClick={openAdd} size="sm" className="ml-1">
              <Plus className="w-4 h-4 mr-1" /> {t("nav.newMonth")}
            </Button>
            <LanguageToggle />
            <ThemeToggle />
          </div>

          {/* Mobile/Tablet actions */}
          <div className="flex xl:hidden items-center gap-1">
            {snapshot && (
              <>
                <Button variant="ghost" size="icon" onClick={openEdit} title={t("nav.editMonth")} className="w-8 h-8">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteMonth(snapshot.month)}
                  title={t("nav.deleteMonth")}
                  className="w-8 h-8 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button onClick={openAdd} size="icon" title={t("nav.newMonth")} className="w-8 h-8">
              <Plus className="w-4 h-4" />
            </Button>
            <LanguageToggle />
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu" className="w-8 h-8 ml-1">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle>{t("app.title")}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-2">
                  <SheetClose asChild>
                    <Link to="/radar" className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground">
                      <Target className="w-4 h-4" /> {t("nav.radar")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/desempenho-variavel" className="flex items-center gap-3 px-3 py-3 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">
                      <Flame className="w-4 h-4 text-emerald-400" /> Maiores Altas e Desempenho
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/radar-tesouro" className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground">
                      <Landmark className="w-4 h-4" /> {t("nav.tesouro")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/plano-acao" className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground">
                      <Lightbulb className="w-4 h-4" /> {t("nav.plan")}
                    </Link>
                  </SheetClose>
                  <div className="my-1 border-t border-border" />
                  <SheetClose asChild>
                    <Link to="/contabilidade-cripto" className="flex items-center gap-3 px-3 py-3 rounded-md bg-blue-500/10 text-blue-400 font-medium">
                      <Calculator className="w-4 h-4 text-blue-400" /> Contabilidade Cripto
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/simulador-renda" className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground">
                      <PiggyBank className="w-4 h-4" /> Simulador de Renda Passiva
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/metas" className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground">
                      <Trophy className="w-4 h-4" /> {t("nav.goals")}
                    </Link>
                  </SheetClose>

                  {snapshot && (
                    <>
                      <div className="h-px bg-border my-2" />
                      <SheetClose asChild>
                        <button onClick={openEdit} className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground text-left">
                          <Pencil className="w-4 h-4" /> {t("nav.editMonth")}
                        </button>
                      </SheetClose>
                      <SheetClose asChild>
                        <button onClick={() => setDeleteMonth(snapshot.month)} className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-destructive text-left">
                          <Trash2 className="w-4 h-4" /> {t("nav.deleteMonth")}
                        </button>
                      </SheetClose>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">


        {monthlyData.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">{t("index.empty")}</p>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> {t("index.addFirst")}
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <MonthSelector
                currentIndex={effectiveIndex}
                onChange={setCurrentIndex}
                months={monthlyData}
              />
            </div>

            {snapshot && (() => {
              const latestSnap = monthlyData[monthlyData.length - 1];
              const isPastMonth = snapshot.month < (latestSnap?.month || "");
              return (
                <div className="text-[11px] text-muted-foreground/80 flex flex-wrap gap-x-4 justify-end mt-1 px-1">
                  {snapshot.createdAt && (
                    <span>Criado no sistema em: {new Date(snapshot.createdAt).toLocaleString("pt-BR")}</span>
                  )}
                  {isPastMonth ? (
                    <span>Cotação de Fechamento: {getLastDayOfMonth(snapshot.month)}</span>
                  ) : (
                    <span>
                      Última Atualização da Cotação:{" "}
                      {snapshot.updatedAt ? new Date(snapshot.updatedAt).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              );
            })()}

            {snapshot && (
              <>
                <SummaryCards snapshot={snapshot} />

                <div className="grid lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-3">
                    <EvolutionChart snapshots={monthlyData} />
                  </div>
                  <div className="lg:col-span-2">
                    <AllocationChart snapshot={snapshot} />
                  </div>
                </div>

                <ContributionEvolutionChart snapshots={monthlyData} />

                <AssetEvolutionChart snapshots={monthlyData} />

                <InvestmentTable
                  snapshot={snapshot}
                  onEditInvestment={handleEditInvestment}
                  onDetailInvestment={handleDetailInvestment}
                />

                {(() => {
                  const jan2024 = monthlyData.find(s => s.month === '2024-01');
                  const growthSince2024 = jan2024 ? snapshot.total - jan2024.total : undefined;

                  const allTotals = monthlyData.map(s => s.total);
                  const maxTotal = Math.max(...allTotals);
                  const diffFromMax = snapshot.total - maxTotal;
                  const diffFromMaxPct = maxTotal > 0 ? (diffFromMax / maxTotal) * 100 : 0;
                  const isAtPeak = diffFromMax >= 0;

                  // Variable Income Peak Projection
                  const variableInvs = snapshot.investments.filter(i => i.incomeType === 'variable');
                  let totalVariablePeakGap = 0;
                  
                  variableInvs.forEach(currInv => {
                    const histValues = monthlyData.flatMap(s => 
                      s.investments
                        .filter(i => i.name === currInv.name)
                        .map(i => i.valueBRL ?? i.value)
                    );
                    const peak = histValues.length > 0 ? Math.max(...histValues) : (currInv.valueBRL ?? currInv.value);
                    const current = currInv.valueBRL ?? currInv.value;
                    const gap = peak > current ? peak - current : 0;
                    totalVariablePeakGap += gap;
                  });

                  const projectedTotalAtPeak = snapshot.total + totalVariablePeakGap;
                  const projectedGainPct = snapshot.total > 0 ? (totalVariablePeakGap / snapshot.total) * 100 : 0;

                  // Projected Annualized Return Calculation
                  const totalApplied = snapshot.investments.reduce((s, i) => s + (i.appliedBRL ?? i.applied ?? 0), 0);
                  const oldestYear = snapshot.investments
                    .filter(i => i.yearStarted)
                    .map(i => i.yearStarted!)
                    .sort()[0];
                  let projectedAnnualReturn: number | undefined;
                  if (oldestYear && totalApplied > 0 && projectedTotalAtPeak > 0) {
                    const startDate = new Date(oldestYear.length === 4 ? `${oldestYear}-01-01` : oldestYear);
                    const years = (new Date().getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                    if (years >= 1) {
                      projectedAnnualReturn = (Math.pow(projectedTotalAtPeak / totalApplied, 1 / years) - 1) * 100;
                    } else if (years > 0) {
                      projectedAnnualReturn = ((projectedTotalAtPeak - totalApplied) / totalApplied) * 100;
                    }
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {growthSince2024 != null && (
                        <div className="gradient-card rounded-xl border border-primary/30 p-5 text-center">
                          <p className="text-sm text-muted-foreground mb-1">{t("index.growthSince")}</p>
                          <p className={`text-2xl font-bold ${growthSince2024 >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {growthSince2024.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </div>
                      )}
                      <div className="gradient-card rounded-xl border border-primary/30 p-5 text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          {isAtPeak ? t("index.atPeak") : t("index.distanceFromPeak")}
                        </p>
                        <p className={`text-2xl font-bold ${isAtPeak ? 'text-primary' : 'text-destructive'}`}>
                          {diffFromMax.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        {!isAtPeak && (
                          <p className="text-sm text-destructive mt-1">
                            {t("index.vsPeak", { pct: diffFromMaxPct.toFixed(2), peak: maxTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })}
                          </p>
                        )}
                      </div>
                      <div className="gradient-card rounded-xl border border-primary/30 p-5 text-center flex flex-col justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {t("index.variablePeakProjection")}
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            {projectedTotalAtPeak.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                          {totalVariablePeakGap > 0 ? (
                            <p className="text-sm text-primary mt-1">
                              {t("index.variablePeakGain", { 
                                gain: totalVariablePeakGap.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 
                                pct: projectedGainPct.toFixed(2) 
                              })}
                            </p>
                          ) : (
                            <p className="text-sm text-primary mt-1">
                              {t("index.atPeak")}
                            </p>
                          )}
                        </div>
                        {projectedAnnualReturn != null && (
                          <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
                            Ret. Anual Projetada: <strong className="text-primary font-mono">{projectedAnnualReturn.toFixed(2)}% a.a.</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}
      </main>

      <SnapshotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        snapshot={editingSnapshot}
        allSnapshots={monthlyData}
        isSaving={saveSnapshot.isPending}
      />

      <InvestmentEditDialog
        open={investmentDialogOpen}
        onOpenChange={setInvestmentDialogOpen}
        investment={editingInvestment}
        onSave={handleSaveInvestment}
        isSaving={updateInvestment.isPending}
      />

      <InvestmentDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        investment={detailInvestment}
      />

      <AlertDialog open={!!deleteMonth} onOpenChange={() => setDeleteMonth(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("delete.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
