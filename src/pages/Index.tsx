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
import ExportImportDialog from "@/components/ExportImportDialog";
import LanguageToggle from "@/components/LanguageToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { BarChart3, Plus, Pencil, Trash2, Target, Landmark, Lightbulb, Coins, Menu, ShieldCheck, PiggyBank, Trophy, Flame, Calculator, ChevronDown, FileSpreadsheet, Download, Upload, Zap, Bot, UserCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { calculateVariablePeakProjection, calculateActivePortfolioCAGR } from "@/utils/portfolioProjections";
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
  const [exportImportOpen, setExportImportOpen] = useState(false);

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
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <header className="border-b border-border/80 sticky top-0 z-50 bg-background/80 backdrop-blur-xl shadow-sm">
        <div className="container max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-900/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="shrink-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-none">{t("app.title")}</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block font-medium">{t("app.subtitle")}</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden xl:flex items-center gap-1">
            <Link to="/radar">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 font-medium">
                <Target className="w-3.5 h-3.5 text-muted-foreground" /> {t("nav.radar")}
              </Button>
            </Link>
            <Link to="/radar-etf">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-semibold">
                <Zap className="w-3.5 h-3.5 text-cyan-400" /> ETF Radar
              </Button>
            </Link>
            <Link to="/desempenho-variavel">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-semibold">
                <Flame className="w-3.5 h-3.5 text-emerald-400" /> Maiores Altas
              </Button>
            </Link>
            <Link to="/plano-inteligente">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Plano Inteligente
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 font-medium">
                  Mais <ChevronDown className="w-3 h-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 space-y-0.5">
                <DropdownMenuItem onClick={() => setExportImportOpen(true)} className="cursor-pointer font-medium text-emerald-400 text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 mr-2" /> Exportar / Importar
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link to="/radar-tesouro" className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-amber-400" /> Tesouro Direto
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link to="/plano-acao" className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" /> Plano de Ação
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link to="/contabilidade-cripto" className="flex items-center gap-2 text-blue-400 font-medium">
                    <Calculator className="w-4 h-4 text-blue-400" /> Contabilidade Cripto
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link to="/simulador-renda" className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-purple-400" /> Simulador de Renda
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link to="/metas" className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" /> {t("nav.goals")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link to="/analisador-perfil" className="flex items-center gap-2 text-emerald-400 font-medium">
                    <UserCheck className="w-4 h-4 text-emerald-400" /> Analisador de Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link to="/admin/incidents" className="flex items-center gap-2 text-amber-400 font-medium">
                    <Bot className="w-4 h-4 text-amber-400" /> Agente de Incidentes
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {snapshot && (
              <div className="flex items-center border-l border-border/60 pl-2 ml-1 gap-1">
                <Button variant="ghost" size="icon" onClick={openEdit} title={t("nav.editMonth")} className="w-8 h-8 rounded-lg hover:bg-secondary">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteMonth(snapshot.month)}
                  title={t("nav.deleteMonth")}
                  className="w-8 h-8 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <Button onClick={openAdd} size="sm" className="h-8 text-xs gap-1.5 ml-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 font-semibold shadow-sm">
              <Plus className="w-3.5 h-3.5" /> {t("nav.newMonth")}
            </Button>
            <div className="flex items-center gap-1 border-l border-border/60 pl-2 ml-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Navigation Header */}
          <div className="flex xl:hidden items-center gap-1">
            {snapshot && (
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" onClick={openEdit} title={t("nav.editMonth")} className="w-8 h-8">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteMonth(snapshot.month)}
                  title={t("nav.deleteMonth")}
                  className="w-8 h-8 text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Button onClick={openAdd} size="icon" title={t("nav.newMonth")} className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 text-white">
              <Plus className="w-4 h-4" />
            </Button>
            <LanguageToggle />
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu" className="w-8 h-8 ml-0.5">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-left font-bold">{t("app.title")}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-2 space-y-1">
                  <SheetClose asChild>
                    <Link to="/radar" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary text-foreground">
                      <Target className="w-4 h-4 text-emerald-400" /> {t("nav.radar")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/radar-etf" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-cyan-500/10 text-cyan-400">
                      <Zap className="w-4 h-4 text-cyan-400" /> ETF Radar
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/desempenho-variavel" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-400">
                      <Flame className="w-4 h-4 text-emerald-400" /> Maiores Altas
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/radar-tesouro" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary text-foreground">
                      <Landmark className="w-4 h-4 text-amber-400" /> {t("nav.tesouro")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/plano-acao" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary text-foreground">
                      <Lightbulb className="w-4 h-4 text-yellow-400" /> {t("nav.plan")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/plano-inteligente" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary/10 text-primary">
                      <ShieldCheck className="w-4 h-4 text-primary" /> Plano Inteligente
                    </Link>
                  </SheetClose>
                  <div className="my-2 border-t border-border" />
                  <SheetClose asChild>
                    <button onClick={() => setExportImportOpen(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 w-full text-left">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Exportar / Importar CSV/XLS
                    </button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/contabilidade-cripto" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-blue-500/10 text-blue-400">
                      <Calculator className="w-4 h-4 text-blue-400" /> Contabilidade Cripto
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/simulador-renda" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary text-foreground">
                      <PiggyBank className="w-4 h-4 text-purple-400" /> Simulador de Renda
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/metas" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary text-foreground">
                      <Trophy className="w-4 h-4 text-amber-400" /> {t("nav.goals")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/analisador-perfil" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-400">
                      <UserCheck className="w-4 h-4 text-emerald-400" /> Analisador de Perfil
                    </Link>
                  </SheetClose>

                  {snapshot && (
                    <>
                      <div className="h-px bg-border my-2" />
                      <SheetClose asChild>
                        <button onClick={openEdit} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary text-foreground text-left w-full">
                          <Pencil className="w-4 h-4" /> {t("nav.editMonth")}
                        </button>
                      </SheetClose>
                      <SheetClose asChild>
                        <button onClick={() => setDeleteMonth(snapshot.month)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary text-rose-400 text-left w-full">
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

      <main className="container max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 flex-1 w-full min-w-0">
        {monthlyData.length === 0 ? (
          <div className="text-center py-20 bg-card/40 rounded-3xl border border-border/60">
            <p className="text-muted-foreground mb-4">{t("index.empty")}</p>
            <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="w-4 h-4 mr-1" /> {t("index.addFirst")}
            </Button>
          </div>
        ) : (
          <>
            {/* Month selector & Action toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
              <div className="w-full md:w-auto min-w-0">
                <MonthSelector
                  currentIndex={effectiveIndex}
                  onChange={setCurrentIndex}
                  months={monthlyData}
                />
              </div>

              <div className="flex items-center justify-between md:justify-end gap-2 flex-wrap">
                {snapshot && (() => {
                  const latestSnap = monthlyData[monthlyData.length - 1];
                  const isPastMonth = snapshot.month < (latestSnap?.month || "");
                  return (
                    <div className="text-[11px] text-muted-foreground/80 flex items-center gap-2 bg-card/60 backdrop-blur border border-border/70 px-3 py-1.5 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {snapshot.createdAt && (
                        <span className="hidden sm:inline">Criado: {new Date(snapshot.createdAt).toLocaleDateString("pt-BR")}</span>
                      )}
                      <span>
                        {isPastMonth
                          ? `Fechamento: ${getLastDayOfMonth(snapshot.month)}`
                          : `Cotação: ${snapshot.updatedAt ? new Date(snapshot.updatedAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}`
                        }
                      </span>
                    </div>
                  );
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportImportOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5 shrink-0 bg-card/60 border-border/80 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-foreground"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Exportar / Importar</span>
                  <span className="sm:hidden">CSV/XLS</span>
                </Button>
              </div>
            </div>

            {snapshot && (
              <>
                <SummaryCards snapshot={snapshot} />

                {/* Main Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 min-w-0">
                  <div className="lg:col-span-3 min-w-0">
                    <EvolutionChart snapshots={monthlyData} />
                  </div>
                  <div className="lg:col-span-2 min-w-0">
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

                {/* Insights & Projeções */}
                {(() => {
                  const jan2024 = monthlyData.find(s => s.month === '2024-01');
                  const growthSince2024 = jan2024 ? snapshot.total - jan2024.total : undefined;

                  const allTotals = monthlyData.map(s => s.total);
                  const maxTotal = Math.max(...allTotals);
                  const diffFromMax = snapshot.total - maxTotal;
                  const diffFromMaxPct = maxTotal > 0 ? (diffFromMax / maxTotal) * 100 : 0;
                  const isAtPeak = diffFromMax >= 0;

                  // Variable Income Peak Projection (Simultaneous Peak for all Variable Assets & Positions: BTC, TSLA, META, GOOGL, etc.)
                  const peakProjection = calculateVariablePeakProjection(monthlyData);
                  const projectedTotalAtPeak = peakProjection.projectedTotalAtPeak;
                  const totalVariablePeakGap = peakProjection.totalVariablePeakGap;
                  const projectedGainPct = peakProjection.projectedGainPct;

                  // Projected Annualized Return Calculation (CAGR based on active portfolio tracking timeframe since Jan 2024)
                  const totalApplied = snapshot.investments.reduce((s, i) => s + (i.appliedBRL ?? i.applied ?? 0), 0);
                  let projectedAnnualReturn: number | undefined;
                  if (totalApplied > 0 && projectedTotalAtPeak > 0) {
                    projectedAnnualReturn = calculateActivePortfolioCAGR(projectedTotalAtPeak, totalApplied, "2024-01-01");
                  }

                  return (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" /> Insights & Projeções da Carteira
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {growthSince2024 != null && (
                          <div className="gradient-card rounded-2xl border border-border/70 p-5 text-center flex flex-col justify-between">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t("index.growthSince")}</p>
                            <p className={`text-2xl font-extrabold font-mono ${growthSince2024 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {growthSince2024.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-2">Variação acumulada no período</p>
                          </div>
                        )}
                        <div className="gradient-card rounded-2xl border border-border/70 p-5 text-center flex flex-col justify-between">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {isAtPeak ? t("index.atPeak") : t("index.distanceFromPeak")}
                          </p>
                          <p className={`text-2xl font-extrabold font-mono ${isAtPeak ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diffFromMax.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                          {!isAtPeak ? (
                            <p className="text-[11px] text-rose-400 font-medium mt-1">
                              {t("index.vsPeak", { pct: diffFromMaxPct.toFixed(2), peak: maxTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })}
                            </p>
                          ) : (
                            <p className="text-[11px] text-emerald-400 font-medium mt-1">Máxima Histórica Atingida</p>
                          )}
                        </div>
                        <div className="gradient-card rounded-2xl border border-border/70 p-5 text-center flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {t("index.variablePeakProjection")}
                            </p>
                            <p className="text-2xl font-extrabold font-mono text-emerald-400">
                              {projectedTotalAtPeak.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                            {totalVariablePeakGap > 0 ? (
                              <p className="text-[11px] text-emerald-400 font-medium mt-1">
                                {t("index.variablePeakGain", { 
                                  gain: totalVariablePeakGap.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 
                                  pct: projectedGainPct.toFixed(2) 
                                })}
                              </p>
                            ) : (
                              <p className="text-[11px] text-emerald-400 font-medium mt-1">
                                Renda variável em topo histórico
                              </p>
                            )}
                          </div>
                          {projectedAnnualReturn != null && (
                            <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/40">
                              Ret. Anual Projetada: <strong className="text-emerald-400 font-mono">{projectedAnnualReturn.toFixed(2)}% a.a.</strong>
                            </p>
                          )}
                        </div>
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

      <ExportImportDialog
        open={exportImportOpen}
        onOpenChange={setExportImportOpen}
        monthlyData={monthlyData}
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
