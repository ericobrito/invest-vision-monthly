export interface CapitalChainStep {
  id: string;
  stepIndex: number; // 1, 2, 3...
  symbol: string;
  name: string;
  startDate: string;
  endDate?: string;
  initialAmountBRL: number;
  finalAmountBRL: number;
  profitBRL: number;
  returnPct: number; // e.g. +200% for Step 1, +100% for Step 2
  status: "COMPLETED" | "ACTIVE";
  notes?: string;
}

export interface CapitalChainTrail {
  id: string;
  title: string; // e.g. "Trilha Cripto: ETH ➔ BTC"
  category: "Ação EUA" | "Ação Brasil" | "Criptoativo" | "Mista";
  initialSeedBRL: number; // e.g. 1000
  currentValueBRL: number; // e.g. 6000
  totalProfitBRL: number; // e.g. 5000
  compoundReturnPct: number; // e.g. +500% (6.0x multiplier)
  multiplier: number; // e.g. 6.0
  createdAt: string;
  updatedAt: string;
  status: "ACTIVE" | "ARCHIVED";
  steps: CapitalChainStep[];
}
