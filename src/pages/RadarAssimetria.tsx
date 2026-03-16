import { useState } from "react";
import { Link } from "react-router-dom";
import { useRadarData } from "@/hooks/useRadarData";
import RadarTable from "@/components/radar/RadarTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Target, RefreshCw, Eye, EyeOff } from "lucide-react";

const RadarAssimetria = () => {
  const [activeTab, setActiveTab] = useState("big_techs");
  const [showAll, setShowAll] = useState(false);

  const { data: response, isLoading, error, refetch, isFetching } = useRadarData(activeTab);

  const stocks = response
    ? showAll ? response.allData : response.data
    : [];

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
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Radar de Assimetria</h1>
              <p className="text-xs text-muted-foreground">
                Oportunidades assimétricas em ações de tecnologia dos EUA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showAll ? "Apenas Filtrados" : "Ver Todos"}
            </Button>
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
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Strategy Context */}
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Objetivo Preferencial</p>
                <p className="text-lg font-bold text-primary">30% ao ano</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resultado Mínimo Aceitável</p>
                <p className="text-lg font-bold text-foreground">40% em 24 meses</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retorno S&P 500 (12m)</p>
                <p className="text-lg font-bold text-foreground">
                  {response ? `${(response.sp500Return12m * 100).toFixed(2)}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="big_techs" className="flex-1 sm:flex-none">
              Big Techs
            </TabsTrigger>
            <TabsTrigger value="growth" className="flex-1 sm:flex-none">
              Maior Potencial de Retorno
            </TabsTrigger>
          </TabsList>

          <TabsContent value="big_techs" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Estratégia conservadora com empresas dominantes de tecnologia.
                </p>
                {response && (
                  <p className="text-xs text-muted-foreground">
                    {response.totalPassed} de {response.totalAnalyzed} ativos passaram nos filtros
                    {response.updatedAt && (
                      <> · Atualizado {new Date(response.updatedAt).toLocaleString("pt-BR")}</>
                    )}
                  </p>
                )}
              </div>
              {renderContent()}
            </div>
          </TabsContent>

          <TabsContent value="growth" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Universo ampliado de ações de tecnologia e crescimento com market cap &gt; US$ 20B.
                </p>
                {response && (
                  <p className="text-xs text-muted-foreground">
                    {response.totalPassed} de {response.totalAnalyzed} ativos passaram nos filtros
                    {response.updatedAt && (
                      <> · Atualizado {new Date(response.updatedAt).toLocaleString("pt-BR")}</>
                    )}
                  </p>
                )}
              </div>
              {renderContent()}
            </div>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Legenda</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">Qualidade:</span>
                <div>🟢 Excelente (Score ≥ 90)</div>
                <div>🟡 Forte (Score 80–89)</div>
                <div>⚪ Moderado (Score 70–79)</div>
              </div>
              <div>
                <span className="font-semibold text-foreground">Sinal:</span>
                <div>🟢 Oportunidade Forte</div>
                <div>🟡 Boa Assimetria</div>
                <div>⚪ Observação</div>
              </div>
              <div>
                <span className="font-semibold text-foreground">Destaque de Linha:</span>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-primary/20 border border-primary" /> Ret. anualizado ≥ 30%
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500" /> Ret. anualizado 20–30%
                </div>
              </div>
              <div>
                <span className="font-semibold text-foreground">Filtros Obrigatórios:</span>
                <div>Momentum positivo (acima MA200)</div>
                <div>Potencial ≥ 30%</div>
                <div>Distância do ATH: 10–45%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );

  function renderContent() {
    if (isLoading || isFetching) {
      return (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Analisando ativos...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Buscando dados de mercado. Isso pode levar alguns segundos.
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-16">
          <p className="text-destructive font-semibold mb-2">Erro ao carregar dados</p>
          <p className="text-sm text-muted-foreground mb-4">{String(error)}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar Novamente
          </Button>
        </div>
      );
    }

    return <RadarTable stocks={stocks} showAll={showAll} />;
  }
};

export default RadarAssimetria;
