import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MonthlySnapshot } from "@/data/investments";

interface MonthSelectorProps {
  currentIndex: number;
  onChange: (index: number) => void;
  months: MonthlySnapshot[];
}

const MonthSelector = ({ currentIndex, onChange, months }: MonthSelectorProps) => {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide px-1">
        {months.map((m, i) => (
          <button
            key={m.month}
            onClick={() => onChange(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              i === currentIndex
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => onChange(Math.min(months.length - 1, currentIndex + 1))}
        disabled={currentIndex === months.length - 1}
        className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default MonthSelector;
