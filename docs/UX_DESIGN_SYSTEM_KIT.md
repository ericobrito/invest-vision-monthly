# 🎨 Invest Vision UX/UI Design System & Component Kit

Este guia contém todos os **tokens de design, CSS global, configurações de Tailwind e componentes reutilizáveis** criados no novo padrão de UX do dashboard. Você pode copiar este modelo para qualquer projeto **React + Tailwind CSS + Lucide Icons + Recharts**.

---

## 1. 🎨 CSS Global & Design Tokens (`src/index.css`)

Copie estes tokens HSL para o seu `index.css`. O modo escuro (*Dark Mode*) é o padrão primário, com suporte completo a *Light Mode*.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 20% 7%;
    --foreground: 210 20% 92%;

    --card: 220 18% 10%;
    --card-foreground: 210 20% 92%;

    --popover: 220 18% 12%;
    --popover-foreground: 210 20% 92%;

    --primary: 160 84% 39%;
    --primary-foreground: 220 20% 7%;

    --secondary: 220 16% 16%;
    --secondary-foreground: 210 20% 85%;

    --muted: 220 14% 14%;
    --muted-foreground: 215 12% 55%;

    --accent: 160 60% 30%;
    --accent-foreground: 160 84% 90%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 98%;

    --border: 220 14% 18%;
    --input: 220 14% 18%;
    --ring: 160 84% 39%;

    --radius: 0.75rem;

    --chart-positive: 160 84% 39%;
    --chart-negative: 0 72% 51%;

    --gradient-card-from: 220 18% 10%;
    --gradient-card-to: 220 18% 13%;
  }

  .light {
    --background: 210 25% 98%;
    --foreground: 220 25% 12%;

    --card: 0 0% 100%;
    --card-foreground: 220 25% 12%;

    --popover: 0 0% 100%;
    --popover-foreground: 220 25% 12%;

    --primary: 160 84% 32%;
    --primary-foreground: 0 0% 100%;

    --secondary: 220 16% 94%;
    --secondary-foreground: 220 25% 18%;

    --muted: 220 14% 95%;
    --muted-foreground: 215 14% 42%;

    --accent: 160 60% 92%;
    --accent-foreground: 160 84% 22%;

    --destructive: 0 72% 48%;
    --destructive-foreground: 0 0% 100%;

    --border: 220 14% 88%;
    --input: 220 14% 90%;
    --ring: 160 84% 32%;

    --gradient-card-from: 0 0% 100%;
    --gradient-card-to: 220 25% 97%;
  }

  * {
    @apply border-border;
  }

  html, body, #root {
    @apply bg-background text-foreground antialiased;
    font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow-x: hidden;
    max-width: 100vw;
  }
}

@layer utilities {
  .text-positive {
    color: hsl(var(--chart-positive));
  }
  .text-negative {
    color: hsl(var(--chart-negative));
  }
  .gradient-card {
    background: linear-gradient(135deg, hsl(var(--gradient-card-from)), hsl(var(--gradient-card-to)));
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.25);
  }
  .glass-card {
    background: rgba(var(--card), 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

---

## 2. 🎛️ Componente: Seletor Pílula em Glassmorphism (`MonthSelector.tsx`)

```tsx
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OptionItem {
  id: string;
  label: string;
}

interface SelectorProps {
  currentIndex: number;
  onChange: (index: number) => void;
  options: OptionItem[];
}

export const PillSelector = ({ currentIndex, onChange, options }: SelectorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [currentIndex, options]);

  return (
    <div className="flex items-center gap-1.5 bg-card/60 backdrop-blur-md border border-border/70 p-1.5 rounded-2xl shadow-sm max-w-full">
      <button
        onClick={() => onChange(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        className="p-1.5 rounded-xl hover:bg-secondary/80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-foreground shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div 
        ref={containerRef} 
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-0.5 touch-pan-x min-w-0 flex-1"
      >
        {options.map((item, i) => {
          const isActive = i === currentIndex;
          return (
            <button
              key={item.id}
              onClick={() => onChange(i)}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-900/20 scale-[1.02]"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onChange(Math.min(options.length - 1, currentIndex + 1))}
        disabled={currentIndex === options.length - 1}
        className="p-1.5 rounded-xl hover:bg-secondary/80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-foreground shrink-0"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
```

---

## 3. 📊 Cards de Resumo & Métricas (`SummaryCards.tsx`)

```tsx
import { TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const MetricSummaryGrid = ({ totalValue, changeValue, changePct, ratioA, ratioB }: any) => {
  const isPositive = changeValue >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
      {/* Card 1: Valor Total */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-primary/50 group">
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium min-w-0 truncate">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="truncate">Patrimônio Total</span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0 border border-primary/20">
            BRL
          </span>
        </div>
        <div className="mt-1">
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono break-all leading-none">
            R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Card 2: Variação Mensal */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:border-border">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium mb-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"} shrink-0`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <span className="truncate">Variação Mensal</span>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono leading-none ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositive ? "+" : ""}{changePct.toFixed(2)}%
            </p>
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
              isPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
              R$ {changeValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Proporção A vs B */}
      <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:border-border">
        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium mb-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <span className="truncate">Fixa vs Variável</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-foreground">Renda Fixa</span>
              <span className="text-emerald-400 font-mono font-bold">{ratioA.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                style={{ width: `${ratioA}%` }} 
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-foreground">Renda Variável</span>
              <span className="text-cyan-400 font-mono font-bold">{ratioB.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-500" 
                style={{ width: `${ratioB}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 4. 📈 Gráfico de Evolução com Curva Suave (`EvolutionChart.tsx`)

```tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";

interface AreaChartProps {
  data: { month: string; total: number }[];
}

export const EvolutionAreaChart = ({ data }: AreaChartProps) => {
  return (
    <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-6 min-w-0 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Evolução Patrimonial</h2>
        </div>
      </div>

      <div className="h-[280px] sm:h-[320px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
            <defs>
              <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.4} />
                <stop offset="90%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              width={65}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-xl">
                      <p className="text-muted-foreground text-xs font-medium mb-1">{label}</p>
                      <p className="text-emerald-400 font-mono font-bold text-sm sm:text-base">
                        R$ {Number(payload[0].value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(160, 84%, 39%)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "hsl(160, 84%, 39%)", stroke: "white", strokeWidth: 2 }}
              fill="url(#gradientTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

---

## 5. 🍩 Gráfico de Alocação Donut com Legenda Responsiva (`AllocationChart.tsx`)

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

const CHART_COLORS = [
  "hsl(160, 84%, 39%)", "hsl(200, 80%, 55%)", "hsl(35, 92%, 55%)",
  "hsl(280, 65%, 60%)", "hsl(340, 75%, 55%)", "hsl(45, 93%, 58%)",
];

export const AllocationDonutChart = ({ items }: { items: { name: string; value: number; percentage: number }[] }) => {
  return (
    <div className="gradient-card rounded-2xl border border-border/70 p-4 sm:p-6 min-w-0 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
          <PieChartIcon className="w-4 h-4" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Alocação</h2>
      </div>

      <div className="h-[240px] sm:h-[260px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {items.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-xl">
                      <p className="text-foreground font-semibold text-sm mb-1">{d.name}</p>
                      <p className="text-emerald-400 font-mono font-bold text-sm">
                        R$ {Number(d.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">{d.percentage.toFixed(2)}% da carteira</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda Responsiva em 2 Colunas */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/40 max-h-[160px] overflow-y-auto scrollbar-hide">
        {items.map((item, index) => (
          <div 
            key={item.name} 
            className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-secondary/30 text-xs hover:bg-secondary/60 transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <div 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} 
              />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="text-foreground font-mono font-semibold shrink-0">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```
