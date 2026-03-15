import { useState } from "react";
import { useSnapshots, useSaveSnapshot, useDeleteSnapshot } from "@/hooks/useSnapshots";
import { useUpdateInvestment } from "@/hooks/useUpdateInvestment";
import type { SnapshotFormData } from "@/hooks/useSnapshots";
import type { Investment } from "@/data/investments";
import MonthSelector from "@/components/MonthSelector";
import SummaryCards from "@/components/SummaryCards";
import InvestmentTable from "@/components/InvestmentTable";
import AllocationChart from "@/components/AllocationChart";
import EvolutionChart from "@/components/EvolutionChart";
import SnapshotDialog from "@/components/SnapshotDialog";
import InvestmentEditDialog from "@/components/InvestmentEditDialog";
import { BarChart3, Plus, Pencil, Trash2, Target } from "lucide-react";
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

  const effectiveIndex = currentIndex ?? (monthlyData.length > 0 ? monthlyData.length - 1 : 0);
  const snapshot = monthlyData[effectiveIndex];

  const handleSave = (data: SnapshotFormData, existingMonth?: string) => {
    saveSnapshot.mutate(
      { data, existingMonth },
      {
        onSuccess: () => {
          toast({ title: existingMonth ? "Mês atualizado!" : "Novo mês criado!" });
          setDialogOpen(false);
          setEditingSnapshot(undefined);
        },
        onError: (err) => {
          toast({ title: "Erro ao salvar", description: String(err), variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteMonth) return;
    deleteSnapshot.mutate(deleteMonth, {
      onSuccess: () => {
        toast({ title: "Mês excluído!" });
        setDeleteMonth(null);
        if (effectiveIndex >= monthlyData.length - 1) {
          setCurrentIndex(Math.max(0, monthlyData.length - 2));
        }
      },
      onError: (err) => {
        toast({ title: "Erro ao excluir", description: String(err), variant: "destructive" });
      },
    });
  };

  const handleEditInvestment = (inv: Investment) => {
    setEditingInvestment(inv);
    setInvestmentDialogOpen(true);
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
          toast({ title: "Investimento atualizado!" });
          setInvestmentDialogOpen(false);
          setEditingInvestment(null);
        },
        onError: (err) => {
          toast({ title: "Erro ao salvar", description: String(err), variant: "destructive" });
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
        <div className="text-muted-foreground animate-pulse">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Meu Patrimônio</h1>
              <p className="text-xs text-muted-foreground">Acompanhamento mensal de investimentos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/radar">
              <Button variant="outline" size="sm">
                <Target className="w-4 h-4 mr-1" /> Radar
              </Button>
            </Link>
            {snapshot && (
              <>
                <Button variant="ghost" size="icon" onClick={openEdit} title="Editar mês">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteMonth(snapshot.month)}
                  title="Excluir mês"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </>
            )}
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Novo Mês
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {monthlyData.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Nenhum dado encontrado.</p>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Primeiro Mês
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

                <InvestmentTable snapshot={snapshot} onEditInvestment={handleEditInvestment} />

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
                          <p className="text-sm text-muted-foreground mb-1">Crescimento acumulado desde Jan 2024</p>
                          <p className={`text-2xl font-bold ${growthSince2024 >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {growthSince2024.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </div>
                      )}
                      <div className="gradient-card rounded-xl border border-primary/30 p-5 text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          {isAtPeak ? "Você está no topo histórico!" : "Distância do topo histórico"}
                        </p>
                        <p className={`text-2xl font-bold ${isAtPeak ? 'text-primary' : 'text-destructive'}`}>
                          {diffFromMax.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        {!isAtPeak && (
                          <p className="text-sm text-destructive mt-1">
                            {diffFromMaxPct.toFixed(2)}% em relação ao pico ({maxTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
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

      <AlertDialog open={!!deleteMonth} onOpenChange={() => setDeleteMonth(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mês?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os investimentos deste mês serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
