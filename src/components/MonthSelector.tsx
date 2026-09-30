import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { getCleanMonthLabel, type MonthlySnapshot } from "@/data/investments";

interface MonthSelectorProps {
  currentIndex: number;
  onChange: (index: number) => void;
  months: MonthlySnapshot[];
}

const MonthSelector = ({ currentIndex, onChange, months }: MonthSelectorProps) => {
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
  }, [currentIndex, months]);

  return (
    <div className="flex items-center gap-1.5 bg-card/60 backdrop-blur-md border border-border/70 p-1.5 rounded-2xl shadow-sm max-w-full">
      <button
        onClick={() => onChange(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        aria-label="Mês Anterior"
        className="p-1.5 rounded-xl hover:bg-secondary/80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-foreground shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div 
        ref={containerRef} 
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-0.5 touch-pan-x min-w-0 flex-1"
      >
        {months.map((m, i) => {
          const isActive = i === currentIndex;
          return (
            <button
              key={m.month}
              onClick={() => onChange(i)}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-900/20 scale-[1.02]"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {getCleanMonthLabel(m.month, m.label)}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onChange(Math.min(months.length - 1, currentIndex + 1))}
        disabled={currentIndex === months.length - 1}
        aria-label="Próximo Mês"
        className="p-1.5 rounded-xl hover:bg-secondary/80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-foreground shrink-0"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default MonthSelector;
