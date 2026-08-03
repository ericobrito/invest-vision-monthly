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
import { BarChart3, Plus, Pencil, Trash2, Target, Landmark, Lightbulb, Coins, Menu, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground truncate">{t("app.title")}</h1>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">{t("app.subtitle")}</p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-2">
            <Link to="/radar">
              <Button variant="outline" size="sm">
                <Target className="w-4 h-4 mr-1" /> {t("nav.radar")}
              </Button>
            </Link>
            <Link to="/radar-tesouro">
              <Button variant="outline" size="sm">
                <Landmark className="w-4 h-4 mr-1" /> {t("nav.tesouro")}
              </Button>
            </Link>
            <Link to="/plano-acao">
              <Button variant="outline" size="sm">
                <Lightbulb className="w-4 h-4 mr-1" /> {t("nav.plan")}
              </Button>
            </Link>
            <Link to="/posicoes-variaveis">
              <Button variant="outline" size="sm">
                <Coins className="w-4 h-4 mr-1" /> {t("nav.variable")}
              </Button>
            </Link>
            <Link to="/admin/audit">
              <Button variant="outline" size="sm">
                <ShieldCheck className="w-4 h-4 mr-1" /> Audit
              </Button>
            </Link>
            {snapshot && (
              <>
                <Button variant="ghost" size="icon" onClick={openEdit} title={t("nav.editMonth")}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteMonth(snapshot.month)}
                  title={t("nav.deleteMonth")}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </>
            )}
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4 mr-1" /> {t("nav.newMonth")}
            </Button>
            <LanguageToggle />
            <ThemeToggle />
          </div>

          {/* Mobile actions */}
          <div className="flex lg:hidden items-center gap-1">
            <Button onClick={openAdd} size="icon" title={t("nav.newMonth")}>
              <Plus className="w-4 h-4" />
            </Button>
            <LanguageToggle />
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
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
                    <Link to="/radar-tesouro" className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground">
                      <Landmark className="w-4 h-4" /> {t("nav.tesouro")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/plano-acao" className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground">
                      <Lightbulb className="w-4 h-4" /> {t("nav.plan")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/posicoes-variaveis" className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground">
                      <Coins className="w-4 h-4" /> {t("nav.variable")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/admin/audit" className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-secondary text-foreground">
                      <ShieldCheck className="w-4 h-4" /> Integration Audit Center
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
        {(() => {
          const jul = monthlyData.find(s => s.month === "2026-07");
          const ago = monthlyData.find(s => s.month === "2026-08");
          if (!jul || !ago) return null;

          const julInvs = jul.investments;
          const agoInvs = ago.investments;

          // Group investments by name and find differences
          const allNames = Array.from(new Set([...julInvs.map(i => i.name), ...agoInvs.map(i => i.name)]));
          const diffTable = allNames.map(name => {
            const jVal = julInvs.find(i => i.name === name)?.valueBRL ?? 0;
            const aVal = agoInvs.find(i => i.name === name)?.valueBRL ?? 0;
            const diff = aVal - jVal;
            return { name, jVal, aVal, diff };
          }).filter(row => Math.abs(row.diff) > 0.01);

          if (diffTable.length === 0) return null;

          return (
            <div className="bg-destructive/10 border border-destructive/30 text-foreground p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-sm text-red-500">🔍 Debug: Diferenças de Valores entre Jul 2026 e Ago 2026</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 font-semibold text-muted-foreground">Investimento</th>
                      <th className="py-2 pr-4 font-semibold text-muted-foreground">Jul 2026 (BRL)</th>
                      <th className="py-2 pr-4 font-semibold text-muted-foreground">Ago 2026 (BRL)</th>
                      <th className="py-2 font-semibold text-red-500">Diferença (BRL)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffTable.map(r => (
                      <tr key={r.name} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pr-4 font-medium">{r.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">R$ {r.jVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 pr-4 text-muted-foreground">R$ {r.aVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 font-bold text-red-500">
                          {r.diff > 0 ? "+" : ""}
                          R$ {r.diff.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const julAvenue = julInvs.find(i => i.name === "Avenue - Dólar");
                const agoAvenue = agoInvs.find(i => i.name === "Avenue - Dólar");
                const julPos = julAvenue?.positions || [];
                const agoPos = agoAvenue?.positions || [];

                return (
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    <h4 className="font-bold text-xs text-primary">Detalhamento de Posições (Avenue - Dólar)</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-background/40 p-3 rounded border border-border">
                        <h5 className="font-semibold text-muted-foreground mb-2">Julho 2026 ({julPos.length} posições):</h5>
                        <ul className="space-y-1 divide-y divide-border/30 max-h-60 overflow-y-auto">
                          {julPos.length === 0 ? <li className="text-muted-foreground py-1">Nenhuma posição</li> : 
                            julPos.map((p, idx) => (
                              <li key={idx} className="py-1 flex justify-between gap-2">
                                <span className="font-medium">{p.symbol || "CASH"}</span>
                                <span className="text-muted-foreground">
                                  qtd: {p.quantity} | preço: {p.currentPrice} | BRL: R$ {p.currentValueBRL?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </li>
                            ))
                          }
                        </ul>
                      </div>
                      <div className="bg-background/40 p-3 rounded border border-border">
                        <h5 className="font-semibold text-muted-foreground mb-2">Agosto 2026 ({agoPos.length} posições):</h5>
                        <ul className="space-y-1 divide-y divide-border/30 max-h-60 overflow-y-auto">
                          {agoPos.length === 0 ? <li className="text-muted-foreground py-1">Nenhuma posição</li> : 
                            agoPos.map((p, idx) => (
                              <li key={idx} className="py-1 flex justify-between gap-2">
                                <span className="font-medium">{p.symbol || "CASH"}</span>
                                <span className="text-muted-foreground">
                                  qtd: {p.quantity} | preço: {p.currentPrice} | BRL: R$ {p.currentValueBRL?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </li>
                            ))
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <p className="text-[10px] text-muted-foreground mt-3">Nota: Esse painel é temporário para investigarmos quais ativos estão mudando de valor após a cópia.</p>
            </div>
          );
        })()}

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

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
