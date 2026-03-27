import { Link } from "react-router-dom";
import { useTesouroData } from "@/hooks/useTesouroData";
import TesouroTable from "@/components/radar/TesouroTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Landmark, RefreshCw } from "lucide-react";

const RadarTesouro = () => {
  const { data: response, isLoading, error, refetch, isFetching } = useTesouroData();

  const bonds = response?.data ?? [];

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
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Radar Tesouro Direto</h1>
              <p className="text-xs text-muted-foreground">
                Oportunidades em títulos públicos brasileiros
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Strategy Context */}
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Este radar identifica oportunidades para lucrar com a <span className="text-foreground font-semibold">queda de juros (marcação a mercado)</span>. Não se destina a manter títulos até o vencimento.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center mt-4">
              <div>
                <p className="text-xs text-muted-foreground">Benchmark IPCA+</p>
                <p className="text-lg font-bold text-primary">5.50%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Benchmark Prefixado</p>
                <p className="text-lg font-bold text-primary">10.50%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading || isFetching ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Buscando dados do Tesouro Direto...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-destructive font-semibold mb-2">Erro ao carregar dados</p>
            <p className="text-sm text-muted-foreground mb-4">{String(error)}</p>
            <Button variant="outline" onClick={() => refetch()}>
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {bonds.length} títulos analisados (IPCA+ e Prefixado)
              </p>
              {response?.updatedAt && (
                <p className="text-xs text-muted-foreground">
                  Atualizado {new Date(response.updatedAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
            <TesouroTable bonds={bonds} />
          </div>
        )}

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Legenda</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
              <div>🟢 Strong Buy (Score ≥ 1.20)</div>
              <div>🟡 Buy (Score 1.05 – 1.20)</div>
              <div>⚪ Neutral (Score 0.90 – 1.05)</div>
              <div>🔴 Sell / Avoid (Score &lt; 0.90)</div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RadarTesouro;
