import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Smartphone, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  Percent, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle,
  PiggyBank,
  Zap,
  Globe2,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoScene {
  title: string;
  subtitle: string;
  duration: number; // in seconds
  description: string;
  mockupType: "patrimonio" | "assimetria" | "pivotagem" | "indicadores";
}

const Landing = () => {
  // Video simulator state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentScene, setCurrentScene] = useState(0);
  const [progress, setProgress] = useState(0);

  // ROI Calculator state
  const [portfolioValue, setPortfolioValue] = useState(50000);
  const [monthlyContribution, setMonthlyContribution] = useState(1500);
  const [years, setYears] = useState(10);

  const scenes: VideoScene[] = [
    {
      title: "Patrimônio na Palma da Mão",
      subtitle: "Consolidação Global em Tempo Real",
      duration: 6,
      description: "Esqueça dezenas de planilhas e logins. Visualize todo o seu patrimônio — renda fixa, ações no Brasil, ativos dolarizados no exterior e criptoativos — unificados em uma única interface inteligente, com conversão de câmbio automática.",
      mockupType: "patrimonio"
    },
    {
      title: "O Poder da Assimetria",
      subtitle: "Gaps em Relação ao Topo Histórico (ATH)",
      duration: 7,
      description: "Identifique assimetrias brutais rastreando a distância atual dos ativos em relação ao seu topo histórico (All-Time High). Descubra ações premium, Bitcoin e Ethereum que estão com grandes descontos em relação às suas máximas, garantindo uma relação risco/retorno altamente favorável.",
      mockupType: "assimetria"
    },
    {
      title: "Pivotagem Inteligente",
      subtitle: "Rebalanceamento Preciso e Estratégico",
      duration: 6,
      description: "Tome decisões rápidas para pivotar seus investimentos. O aplicativo calcula a distância exata da sua alocação ideal e gera um plano de ação automatizado com o valor exato a aportar ou resgatar baseando-se no desconto dos ativos.",
      mockupType: "pivotagem"
    },
    {
      title: "Indicadores Adotados pelo Mercado",
      subtitle: "Decisões Guiadas por Dados, Não Emoção",
      duration: 7,
      description: "Monitore o percentual de queda desde a máxima histórica (Drawdown do Topo), além de múltiplos e indexadores macroeconômicos (Selic, IPCA+). Saiba exatamente se o BTC/ETH e as principais ações estão em zona de acumulação assimétrica ou topo esticado.",
      mockupType: "indicadores"
    }
  ];

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (100 / (scenes[currentScene].duration * 10)); // updating every 100ms
          if (next >= 100) {
            setCurrentScene((prevScene) => (prevScene + 1) % scenes.length);
            return 0;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentScene]);

  const selectScene = (index: number) => {
    setCurrentScene(index);
    setProgress(0);
    setIsPlaying(true);
  };

  // Calculate ROI comparisons
  // Standard Return: 8% per year
  // Asymmetric Return: 12.5% per year
  const calculateROI = (rate: number) => {
    const r = rate / 12 / 100;
    const n = years * 12;
    let total = portfolioValue;
    for (let i = 0; i < n; i++) {
      total = total * (1 + r) + monthlyContribution;
    }
    return Math.round(total);
  };

  const standardTotal = calculateROI(8.5);
  const asymmetricTotal = calculateROI(13.2);
  const totalDifference = asymmetricTotal - standardTotal;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">InvestVision</span>
              <span className="text-[10px] block text-emerald-400 font-medium tracking-widest uppercase">Wealth Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900">
                Entrar
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 container max-w-7xl mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> A Era das Planilhas de Investimentos Acabou
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Seu patrimônio global na <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">palma da mão</span>. Decisões por <span className="underline decoration-emerald-400 underline-offset-8">assimetria histórica</span>.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Consolide todos os seus ativos e monitore a distância exata das principais ações, do Bitcoin e do Ethereum em relação aos seus topos históricos (ATH) para pivotar nos momentos de máximo desconto.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-base px-8 py-6 rounded-xl transition-all shadow-xl shadow-emerald-500/20 hover:scale-[1.02]">
                Acessar Plataforma Grátis <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#video-demo">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900 hover:text-white px-8 py-6 rounded-xl transition-all">
                Ver Vídeo Explicativo
              </Button>
            </a>
          </div>

          {/* Social Proof Badges */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-slate-500 text-sm border-t border-slate-900/60 mt-12">
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500/70" />
              <span>Dados Criptografados</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Globe2 className="w-4 h-4 text-emerald-500/70" />
              <span>Multi-moedas (BRL/USD)</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500/70" />
              <span>Integrações Diretas</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-500/70" />
              <span>Mobile-First Premium</span>
            </div>
          </div>
        </div>
      </section>

      {/* Video / Interactive Simulator Section */}
      <section id="video-demo" className="py-16 md:py-24 border-y border-slate-900 bg-slate-950/50 relative">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Apresentação Educativa do InvestVision
            </h2>
            <p className="text-slate-400 text-base md:text-lg">
              Clique em qualquer um dos pilares abaixo para navegar pelas funcionalidades e entender como a aplicação maximiza o retorno do seu capital.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Navigation & Scene Details (Left side) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {scenes.map((scene, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectScene(idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${
                      currentScene === idx 
                        ? "bg-slate-900/80 border-emerald-500/40 shadow-lg shadow-emerald-500/5 text-white" 
                        : "bg-slate-900/20 border-slate-900 text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm ${
                      currentScene === idx ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-sm truncate">{scene.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{scene.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Narrator Voiceover text box */}
              <div className="bg-slate-900/60 border border-slate-800/60 p-5 rounded-xl space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Áudio Guia (Subtítulos)
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)} 
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      title={isPlaying ? "Pausar" : "Iniciar"}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => { setCurrentScene(0); setProgress(0); }} 
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Reiniciar"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-white">{scenes[currentScene].subtitle}</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  "{scenes[currentScene].description}"
                </p>
                {/* Scene progress bar */}
                <div className="w-full bg-slate-950 h-1 rounded overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Interactive Mock Video Visual Simulator (Right side) */}
            <div className="lg:col-span-7 bg-slate-900/50 border border-slate-850 rounded-2xl p-6 flex flex-col justify-between min-h-[420px] shadow-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />
              
              {/* Scene 1: Patrimonio Mockup */}
              {scenes[currentScene].mockupType === "patrimonio" && (
                <div className="space-y-6 w-full animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Patrimônio Global Consolidade</h4>
                      <div className="text-2xl md:text-3xl font-black text-white mt-1">R$ 600.585,28</div>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-500/20">
                      +3.74% este mês
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
                      <div className="text-xs text-muted-foreground">Brasil (Renda Fixa)</div>
                      <div className="text-lg font-bold text-slate-200 mt-1">R$ 448.637,20</div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[74.7%]" />
                      </div>
                      <span className="text-[10px] text-emerald-400 mt-1 block">74.7% do portfólio</span>
                    </div>

                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
                      <div className="text-xs text-muted-foreground">Exterior (Dólar)</div>
                      <div className="text-lg font-bold text-slate-200 mt-1">R$ 151.948,08</div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full w-[25.3%]" />
                      </div>
                      <span className="text-[10px] text-blue-400 mt-1 block">25.3% do portfólio</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-400">Ativos Conectados e Automatizados</h5>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="bg-slate-900 border border-slate-800 p-2 rounded flex items-center justify-between">
                        <span>Avenue Dólar</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-2 rounded flex items-center justify-between">
                        <span>Binance API</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-2 rounded flex items-center justify-between">
                        <span>Yahoo Finance</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scene 2: Assimetria Mockup */}
              {scenes[currentScene].mockupType === "assimetria" && (
                <div className="space-y-4 w-full animate-fade-in text-xs">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Radar de Assimetria (Distância do Topo Histórico)</h4>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">All-Time High (ATH)</span>
                  </div>

                  <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                    <div className="grid grid-cols-4 text-[10px] text-slate-500 font-bold border-b border-slate-900 pb-1.5 mb-1.5 font-mono">
                      <span>Ativo</span>
                      <span>Preço Atual</span>
                      <span>Topo Histórico</span>
                      <span className="text-right">Distância (Desconto)</span>
                    </div>

                    <div className="grid grid-cols-4 py-1 items-center font-mono">
                      <span className="font-bold text-slate-200 font-sans">BTC (Bitcoin)</span>
                      <span>$ 59.450</span>
                      <span className="text-slate-400">$ 73.750</span>
                      <span className="text-right text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">-19.39% (Assimetria)</span>
                    </div>

                    <div className="grid grid-cols-4 py-1 items-center font-mono">
                      <span className="font-bold text-slate-200 font-sans">ETH (Ethereum)</span>
                      <span>$ 2.680</span>
                      <span className="text-slate-400">$ 4.891</span>
                      <span className="text-right text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">-45.21% (Alta Ass.)</span>
                    </div>

                    <div className="grid grid-cols-4 py-1 items-center font-mono">
                      <span className="font-bold text-slate-200 font-sans">TSLA (Tesla)</span>
                      <span>$ 322,08</span>
                      <span className="text-slate-400">$ 429,19</span>
                      <span className="text-right text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">-24.95% (Assimetria)</span>
                    </div>

                    <div className="grid grid-cols-4 py-1 items-center font-mono">
                      <span className="font-bold text-slate-200 font-sans">AMD</span>
                      <span>$ 141,50</span>
                      <span className="text-slate-400">$ 227,30</span>
                      <span className="text-right text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">-37.75% (Alta Ass.)</span>
                    </div>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-[11px] text-slate-300">
                      <strong>Raciocínio Assimétrico:</strong> Comprar ativos líderes (BTC, ETH, e ações premium) com altos descontos em relação ao seu topo histórico oferece um enorme espaço para valorização até a máxima anterior, com menor risco de queda.
                    </p>
                  </div>
                </div>
              )}

              {/* Scene 3: Pivotagem Mockup */}
              {scenes[currentScene].mockupType === "pivotagem" && (
                <div className="space-y-6 w-full animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Plano de Pivotagem de Alocação</h4>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">Rebalanceamento</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                      <span className="text-slate-400 font-medium">Classe de Ativo</span>
                      <span className="text-slate-400">Atual / Alvo</span>
                      <span className="text-right text-slate-400">Ajuste Recomendado</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Renda Fixa IPCA+</span>
                      <span className="text-slate-400">20.5% / 30.0%</span>
                      <span className="text-right text-emerald-400 font-bold">+ R$ 14.500,00</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Ações Exterior</span>
                      <span className="text-slate-400">25.3% / 20.0%</span>
                      <span className="text-right text-red-400 font-bold">- R$ 11.200,00</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Criptoativos</span>
                      <span className="text-slate-400">2.5% / 5.0%</span>
                      <span className="text-right text-emerald-400 font-bold">+ R$ 3.800,00</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
                    <div className="text-[10px] text-muted-foreground tracking-wider uppercase font-bold">Objetivo Gerado:</div>
                    <p className="text-xs text-slate-300 mt-1">
                      Pivotar capital de ativos internacionais (que atingiram a meta de valuation esticado) para Renda Fixa IPCA+ aproveitando as taxas atuais de fechamento.
                    </p>
                  </div>
                </div>
              )}

              {/* Scene 4: Indicadores Mockup */}
              {scenes[currentScene].mockupType === "indicadores" && (
                <div className="space-y-6 w-full animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Termômetro de Indicadores Macroeconômicos</h4>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">Live Rates</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/40 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold">IPCA real</span>
                      <span className="text-lg font-black text-slate-200 mt-1">IPCA + 6.38%</span>
                      <span className="text-[8px] text-emerald-400 font-semibold mt-1">Histórico: Excelente</span>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/40 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold">TAXA SELIC</span>
                      <span className="text-lg font-black text-slate-200 mt-1">10.50% a.a.</span>
                      <span className="text-[8px] text-blue-400 font-semibold mt-1">Manutenção</span>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/40 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold">USD/BRL</span>
                      <span className="text-lg font-black text-slate-200 mt-1">R$ 5,703</span>
                      <span className="text-[8px] text-amber-500 font-semibold mt-1">Patamar Esticado</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-2">
                    <div className="flex items-center gap-2">
                      <Percent className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-200">Recomendação Macroeconômica:</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                      Com o Dólar esticado a R$ 5,70 e o IPCA+ pagando 6.38% real de prêmio, o modelo indica travar aportes no Brasil em Renda Fixa e reduzir a exposição de caixa lá fora temporariamente.
                    </p>
                  </div>
                </div>
              )}

              {/* Progress Slider Bar */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-4 mt-auto">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Módulo Educativo Interativo
                </span>
                <span>Cena {currentScene + 1} de {scenes.length}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Persuasive Pillars */}
      <section className="py-20 md:py-28 container max-w-7xl mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Por que investidores profissionais usam o InvestVision?
          </h2>
          <p className="text-slate-400 text-lg">
            Muito mais do que um rastreador de ativos. Uma máquina de tomada de decisões para acelerar sua independência financeira.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="gradient-card rounded-2xl border border-slate-900 p-8 space-y-6 hover:border-slate-800 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Assimetria de Topo (ATH)</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Pare de seguir a manada. O InvestVision mapeia a distância exata em que ações consolidadas e as maiores criptomoedas (Bitcoin/Ethereum) estão de suas máximas históricas para você comprar com desconto e segurança.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-500 border-t border-slate-900/60 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Rastreamento de ATH de BTC e ETH
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Drawdown de Ações BR/EUA
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="gradient-card rounded-2xl border border-slate-900 p-8 space-y-6 hover:border-slate-800 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Patrimônio na Palma da Mão</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Suas corretoras no Brasil, suas contas de ações e cash card no exterior (Avenue), e suas exchanges de cripto (Binance) totalmente consolidadas. Tenha visibilidade imediata do seu patrimônio líquido consolidado em BRL.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-500 border-t border-slate-900/60 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Sincronismo de corretoras via API
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Câmbio USD/BRL comercial automático
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="gradient-card rounded-2xl border border-slate-900 p-8 space-y-6 hover:border-slate-800 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Layers className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Pivotagem Inteligente</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                O rebalanceamento de carteira comum falha porque ignora valuations. Nosso algoritmo gera planos de ação para pivotar o seu capital focando em valor intrínseco e indicadores consolidados de mercado como P/VP e IPCA Real.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-500 border-t border-slate-900/60 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" /> Plano de ação automático de aportes
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" /> Alertas de rebalanceamento esticado
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ROI & Portfolio Growth Simulator */}
      <section className="py-20 md:py-28 bg-slate-900/30 border-y border-slate-900 relative">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left side: Controls */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                Simulador de Independência Financeira
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Simule o impacto de investir com <span className="text-emerald-400">Assimetria</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Investir na média do mercado te dá retornos na média (ex: 8.5% ao ano). Investir selecionando assimetrias e pivotando posições esticadas eleva o retorno (ex: 13.2% ao ano) mantendo o mesmo nível de risco. Veja a diferença ao longo do tempo.
              </p>

              {/* Slider 1 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">Patrimônio Inicial</span>
                  <span className="text-white font-mono font-bold">R$ {portfolioValue.toLocaleString("pt-BR")}</span>
                </div>
                <input 
                  type="range" 
                  min="5000" 
                  max="1000000" 
                  step="5000" 
                  value={portfolioValue}
                  onChange={(e) => setPortfolioValue(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Slider 2 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">Aporte Mensal</span>
                  <span className="text-white font-mono font-bold">R$ {monthlyContribution.toLocaleString("pt-BR")} / mês</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="50000" 
                  step="100" 
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Slider 3 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">Tempo de Acumulação</span>
                  <span className="text-white font-mono font-bold">{years} anos</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="35" 
                  step="1" 
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Right side: Results Comparison */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <h3 className="text-lg font-bold text-white">Resultado após {years} anos de acumulação</h3>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Result 1 */}
                <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-900/60 relative">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Investimento Tradicional (Média)</div>
                  <div className="text-2xl font-black text-slate-400 mt-2">R$ {standardTotal.toLocaleString("pt-BR")}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Taxa estimada: 8.5% a.a.</div>
                </div>

                {/* Result 2 */}
                <div className="bg-emerald-500/5 p-5 rounded-xl border border-emerald-500/20 relative">
                  <div className="absolute -top-2.5 -right-2 bg-emerald-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Assimétrico
                  </div>
                  <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Com InvestVision (Assimetria)</div>
                  <div className="text-2xl font-black text-emerald-400 mt-2">R$ {asymmetricTotal.toLocaleString("pt-BR")}</div>
                  <div className="text-[10px] text-emerald-400/80 mt-1">Taxa estimada: 13.2% a.a.</div>
                </div>
              </div>

              {/* Difference Spotlight */}
              <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 p-6 rounded-xl text-center space-y-2">
                <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Patrimônio Adicional Conquistado</span>
                <div className="text-3xl md:text-4xl font-black text-white">
                  + R$ {totalDifference.toLocaleString("pt-BR")}
                </div>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  A diferença de uma alocação ativa focada em assimetria e pivotagem pode gerar centenas de milhares de reais a mais para o seu bolso.
                </p>
              </div>

              <div className="text-center">
                <Link to="/login">
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                    Garantir Meu Acesso Grátis Agora
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Objections / FAQ */}
      <section className="py-20 md:py-28 container max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">Perguntas Frequentes</h2>
          <p className="text-slate-400 text-sm md:text-base mt-3">Tire todas as suas dúvidas sobre a aplicação</p>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-xl space-y-2">
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              O InvestVision é seguro? Meus dados estão expostos?
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed pl-7">
              Segurança é nossa prioridade máxima. Nós utilizamos criptografia SSL ponta a ponta e o nosso banco de dados roda sob a infraestrutura segura da Supabase. O aplicativo possui acesso do tipo apenas leitura (read-only) para as corretoras integradas. Nenhuma movimentação ou transferência pode ser feita através do aplicativo.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-xl space-y-2">
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              O que é a "assimetria de retorno" na prática?
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed pl-7">
              Na nossa plataforma, focamos na assimetria em relação ao **topo histórico (ATH)** de ações de alta liquidez e criptoativos líderes (BTC e ETH). Quando um ativo com excelentes fundamentos apresenta uma grande correção (ex: 20% a 50% de queda desde a máxima histórica), o espaço potencial para valorização de volta ao topo histórico é enorme (alta assimetria de retorno), enquanto o risco de queda residual é minimizado. O InvestVision rastreia esses desvios em tempo real.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-xl space-y-2">
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              Como a integração em segundo plano ajuda na pivotagem?
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed pl-7">
              Ao conectar sua carteira, o sistema busca cotações em tempo real do Yahoo Finance e cotações de câmbio USD/BRL atualizadas. O motor de pivotagem compara o valor atualizado de cada classe com a alocação alvo ideal que você definiu e calcula exatamente as movimentações necessárias no seu plano de ação.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 md:py-32 relative overflow-hidden bg-gradient-to-b from-slate-950 to-emerald-950/20 text-center border-t border-slate-900">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="container max-w-4xl mx-auto px-4 space-y-8 relative">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Assuma o controle total do seu patrimônio hoje mesmo.
          </h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Faça como os maiores investidores do mercado: pare de chutar ou gastar horas em planilhas. Comece a pivotar seus investimentos com a precisão dos melhores indicadores.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-base px-10 py-6 rounded-xl transition-all shadow-xl shadow-emerald-500/20">
                Criar Minha Conta Grátis
              </Button>
            </Link>
          </div>

          <p className="text-xs text-slate-500">Sem cartão de crédito necessário. Cancelamento grátis a qualquer momento.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-center text-xs text-slate-600">
        <div className="container max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="font-bold text-slate-400">InvestVision Wealth Engine</span>
          </div>
          <p>&copy; {new Date().getFullYear()} InvestVision. Todos os direitos reservados. Feito com rigor financeiro.</p>
          <p className="text-[10px] text-slate-700 max-w-xl mx-auto">
            Aviso Legal: Os dados, simuladores e ferramentas do aplicativo possuem fins meramente informativos e educativos, não constituindo recomendação explícita de compra ou venda de valores mobiliários.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
