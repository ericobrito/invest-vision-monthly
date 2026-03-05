import { useState } from "react";
import { monthlyData } from "@/data/investments";
import MonthSelector from "@/components/MonthSelector";
import SummaryCards from "@/components/SummaryCards";
import InvestmentTable from "@/components/InvestmentTable";
import AllocationChart from "@/components/AllocationChart";
import EvolutionChart from "@/components/EvolutionChart";
import { BarChart3 } from "lucide-react";

const Index = () => {
  const [currentIndex, setCurrentIndex] = useState(monthlyData.length - 1);
  const snapshot = monthlyData[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Month Selector */}
        <div className="overflow-x-auto">
          <MonthSelector currentIndex={currentIndex} onChange={setCurrentIndex} />
        </div>

        {/* Summary Cards */}
        <SummaryCards snapshot={snapshot} />

        {/* Charts Row */}
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <EvolutionChart />
          </div>
          <div className="lg:col-span-2">
            <AllocationChart snapshot={snapshot} />
          </div>
        </div>

        {/* Table */}
        <InvestmentTable snapshot={snapshot} />

        {/* Growth 2025 */}
        {snapshot.growth2025 && (
          <div className="gradient-card rounded-xl border border-primary/30 p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Crescimento acumulado desde Jan 2025</p>
            <p className="text-2xl font-bold text-primary">
              {snapshot.growth2025.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
