import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useRadarData } from "@/hooks/useRadarData";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useVariableAssets } from "@/features/variableAssets/useVariableAssets";
import RadarTable from "@/components/radar/RadarTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Target, RefreshCw, Eye, EyeOff, Briefcase } from "lucide-react";

function normalizeTickerForYahoo(rawTicker: string): string | null {
  if (!rawTicker) return null;
  let sym = rawTicker.trim().toUpperCase();

  // Known Portuguese/English asset name to ticker mapping
  const knownNameMap: Record<string, string> = {
    BITCOIN: "BTC",
    ETHEREUM: "ETH",
    TETHER: "USDT",
    SOLANA: "SOL",
    RIPPLE: "XRP",
    CARDANO: "ADA",
    DOGECOIN: "DOGE",
    BERKSHIRE: "BRK-B",
    "BERKSHIRE HATHAWAY": "BRK-B",
    TESLA: "TSLA",
    GOOGLE: "GOOGL",
    ALPHABET: "GOOGL",
    META: "META",
    MICROSOFT: "MSFT",
    APPLE: "AAPL",
    AMAZON: "AMZN",
    NVIDIA: "NVDA",
  };

  if (knownNameMap[sym]) {
    sym = knownNameMap[sym];
  }

  // Handle dot notation for US stocks (BRK.B -> BRK-B, BF.B -> BF-B)
  if (/^[A-Z]{2,5}\.[A-Z]{1,2}$/.test(sym)) {
    sym = sym.replace(".", "-");
  }

  // Handle Binance/Crypto pair tickers like BTCUSDT, ETHUSDT, SOLUSDT -> BTC, ETH, SOL
  if (sym.length > 4 && sym.endsWith("USDT")) {
    sym = sym.replace(/USDT$/, "");
  } else if (sym.length > 3 && sym.endsWith("BRL") && !sym.includes(".")) {
    sym = sym.replace(/BRL$/, "");
  }

  // Remove currency pair slash if present (e.g. BTC/USD -> BTC)
  if (sym.includes("/")) {
    sym = sym.split("/")[0].trim();
  }

  const cryptos = [
    "BTC", "ETH", "USDT", "USDC", "SOL", "ADA", "XRP", "DOT",
    "DOGE", "LINK", "UNI", "MATIC", "AVAX", "LTC", "PEPE", "SHIB", "NEAR", "APT", "SUI", "RENDER", "FET", "NIGHT"
  ];

  if (cryptos.includes(sym)) {
    return `${sym}-USD`;
  }

  if (sym.endsWith("-USD")) {
    return sym;
  }

  if (sym.endsWith(".SA")) {
    return sym;
  }

  // B3 Brazilian stock / FII / ETF tickers (PETR4, VALE3, B3SA3, IVVB11, HASH11, SMAL11, BOVA11, CPLE6, etc.)
  if (/^[A-Z0-9]{4,6}[0-9]{1,2}F?$/.test(sym)) {
    return `${sym.replace(/F$/, "")}.SA`;
  }

  // US Stocks or general tickers (GOOGL, TSLA, META, AMD, IONQ, RGTI, BRK-B, PETR4.SA)
  if (/^[A-Z0-9.\-]{1,10}$/.test(sym)) {
    const ignoredWords = [
      "USD", "BRL", "FX", "CRIPTO", "RENDA", "FIXA", "VARIAVEL", "EXTERIOR", "BRASIL",
      "US$", "VALOR", "APLICADO", "CARTEIRA", "POSICOES", "SOFISA", "CDB", "LCI", "LCA", "BANCO", "TESOURO"
    ];
    if (!/^\d+$/.test(sym) && !ignoredWords.includes(sym) && sym.length >= 2) {
      return sym;
    }
  }

  return null;
}

function extractTickersFromText(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];

  const fullNorm = normalizeTickerForYahoo(text);
  if (fullNorm) {
    results.push(fullNorm);
  }

  const tokens = text.split(/[\s(),;/\\_\-]+/);
  for (const tok of tokens) {
    const norm = normalizeTickerForYahoo(tok);
    if (norm) {
      results.push(norm);
    }
  }

  return results;
}

const RadarAssimetria = () => {
  const [activeTab, setActiveTab] = useState("big_techs");
  const [showAll, setShowAll] = useState(false);

  const { data: monthlySnapshots = [] } = useSnapshots();
  const { positions: variablePositions = [] } = useVariableAssets();

  // Extract structured position metadata ONLY from detailed (Avenue-Dolar, Bybit) and connected APIs (Binance, Bitcoin)
  const userPortfolioPositions = useMemo(() => {
    const map = new Map<string, {
      ticker: string;
      quantity: number;
      currentValueBRL: number;
      appliedAmountBRL: number;
      source?: string;
    }>();

    const ignoredDustTickers = new Set([
      "NEON", "CBK", "ZRO", "PENDLE", "GRAPE", "TOMI", "RENDER",
      "SOFISA", "CDB", "LCI", "LCA", "BANCO", "TESOURO"
    ]);

    // 1. From connected API positions (Binance, Bitcoin, etc. in useVariableAssets)
    variablePositions.forEach((pos) => {
      const rawSym = (pos.ticker || (pos as any).symbol || "").toUpperCase().trim();
      if (!rawSym || ignoredDustTickers.has(rawSym)) return;

      const norm = normalizeTickerForYahoo(rawSym);
      if (!norm) return;

      const qty = Number(pos.quantity) || 0;
      const valBRL = Number(pos.currentValue) || 0;
      if (valBRL <= 0 && qty <= 0) return; // Skip zeroed / dust holdings

      const existing = map.get(norm) || {
        ticker: norm,
        quantity: 0,
        currentValueBRL: 0,
        appliedAmountBRL: 0,
        source: pos.broker || pos.provider || "Conectado",
      };

      existing.quantity += qty;
      existing.currentValueBRL += valBRL;
      map.set(norm, existing);
    });

    // 2. From ALL monthly snapshots (Avenue-Dolar, Bybit - Cripto, etc.)
    monthlySnapshots.forEach((snap) => {
      if (snap?.investments) {
        snap.investments.forEach((inv) => {
          // Detailed positions inside this investment (Avenue-Dolar, Bybit - Cripto, etc.)
          if (inv.positions && inv.positions.length > 0) {
            inv.positions.forEach((p: any) => {
              const rawSym = (p.symbol || p.ticker || "").toUpperCase().trim();
              if (!rawSym || ignoredDustTickers.has(rawSym)) return;

              const norm = normalizeTickerForYahoo(rawSym);
              if (!norm) return;

              const qty = Number(p.quantity) || 0;
              const valBRL = Number(p.currentValueBRL != null ? p.currentValueBRL : p.currentValue) || 0;
              const appBRL = Number(p.appliedAmountBRL != null ? p.appliedAmountBRL : p.appliedAmount) || 0;

              if (valBRL <= 0 && qty <= 0) return; // Skip zeroed holdings

              const existing = map.get(norm) || {
                ticker: norm,
                quantity: 0,
                currentValueBRL: 0,
                appliedAmountBRL: 0,
                source: inv.name,
              };

              existing.quantity += qty;
              existing.currentValueBRL += valBRL;
              existing.appliedAmountBRL += appBRL;
              map.set(norm, existing);
            });
          }
        });
      }
    });

    const list: Array<{
      ticker: string;
      quantity: number;
      currentValueBRL: number;
      appliedAmountBRL: number;
      profitBRL?: number;
      profitPct?: number;
      source?: string;
    }> = [];

    map.forEach((item) => {
      if (item.currentValueBRL > 0 || item.quantity > 0) {
        const profitBRL = item.currentValueBRL - item.appliedAmountBRL;
        const profitPct = item.appliedAmountBRL > 0 ? profitBRL / item.appliedAmountBRL : undefined;
        list.push({
          ...item,
          profitBRL,
          profitPct,
        });
      }
    });

    return list;
  }, [monthlySnapshots, variablePositions]);

  const userPortfolioTickers = useMemo(
    () => userPortfolioPositions.map((p) => p.ticker),
    [userPortfolioPositions]
  );

  const portfolioSummary = useMemo(() => {
    const totalValueBRL = userPortfolioPositions.reduce((sum, p) => sum + p.currentValueBRL, 0);
    const totalAppliedBRL = userPortfolioPositions.reduce((sum, p) => sum + p.appliedAmountBRL, 0);
    const totalProfitBRL = totalValueBRL - totalAppliedBRL;
    const totalProfitPct = totalAppliedBRL > 0 ? totalProfitBRL / totalAppliedBRL : 0;

    return {
      totalValueBRL,
      totalAppliedBRL,
      totalProfitBRL,
      totalProfitPct,
      count: userPortfolioPositions.length,
    };
  }, [userPortfolioPositions]);

  const customTickers = activeTab === "my_portfolio" ? userPortfolioTickers : undefined;
  const customMeta = activeTab === "my_portfolio" ? userPortfolioPositions : undefined;

  const { data: response, isLoading, error, refetch, isFetching } = useRadarData(
    activeTab,
    customTickers,
    customMeta
  );

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
                Oportunidades assimétricas e análise de topo em ações e criptoativos
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
        {/* Strategy Context or Global Portfolio Summary */}
        <Card className="border-primary/30">
          <CardContent className="p-4">
            {activeTab === "my_portfolio" ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Valor Global Renda Variável</p>
                  <p className="text-lg font-bold text-primary">
                    {portfolioSummary.totalValueBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Aplicado</p>
                  <p className="text-lg font-bold text-foreground">
                    {portfolioSummary.totalAppliedBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resultado Global</p>
                  <p className={`text-lg font-bold ${portfolioSummary.totalProfitBRL >= 0 ? "text-primary" : "text-destructive"}`}>
                    {portfolioSummary.totalProfitBRL >= 0 ? "+" : ""}
                    {portfolioSummary.totalProfitBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    {" "}
                    ({(portfolioSummary.totalProfitPct * 100).toFixed(2)}%)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Retorno S&P 500 (12m)</p>
                  <p className="text-lg font-bold text-foreground">
                    {response ? `${(response.sp500Return12m * 100).toFixed(2)}%` : "—"}
                  </p>
                </div>
              </div>
            ) : (
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
            )}
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
            <TabsTrigger value="my_portfolio" className="flex-1 sm:flex-none flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Assimetria do Meu Portfólio ({userPortfolioTickers.length})
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

          <TabsContent value="my_portfolio" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Assimetria de topo de todos os ativos de renda variável alocados na sua carteira (conectados e declarados no detalhado).
                </p>
                {response && (
                  <p className="text-xs text-muted-foreground">
                    {response.totalPassed} de {response.totalAnalyzed} ativos analisados
                    {response.updatedAt && (
                      <> · Atualizado {new Date(response.updatedAt).toLocaleString("pt-BR")}</>
                    )}
                  </p>
                )}
              </div>

              {userPortfolioTickers.length === 0 ? (
                <div className="text-center py-12 bg-card/30 border border-border rounded-xl p-8 space-y-4">
                  <p className="text-base font-bold text-foreground">Nenhum ativo de renda variável detectado</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Não encontramos tickers de renda variável cadastrados nas suas conexões de corretoras ou no detalhamento da foto mensal.
                  </p>
                  <Link to="/posicoes-variaveis">
                    <Button variant="outline" size="sm">
                      Cadastrar Ativos em Posições Variáveis
                    </Button>
                  </Link>
                </div>
              ) : (
                renderContent()
              )}
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
