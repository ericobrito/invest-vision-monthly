import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthlyData } from "@/data/investments";

interface MonthSelectorProps {
  currentIndex: number;
  onChange: (index: number) => void;
}

const MonthSelector = ({ currentIndex, onChange }: MonthSelectorProps) => {
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
        {monthlyData.map((m, i) => (
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
        onClick={() => onChange(Math.min(monthlyData.length - 1, currentIndex + 1))}
        disabled={currentIndex === monthlyData.length - 1}
        className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default MonthSelector;
