import type { CapitalChainTrail, CapitalChainStep } from "./capitalChainTypes";

const STORAGE_KEY = "invest_vision_capital_chain_trails";

export const DEFAULT_CAPITAL_TRAILS: CapitalChainTrail[] = [
  {
    id: "trail-eth-btc-demo",
    title: "Trilha Exemplo: Ciclo ETH ➔ BTC",
    category: "Criptoativo",
    initialSeedBRL: 1000,
    currentValueBRL: 6000,
    totalProfitBRL: 5000,
    compoundReturnPct: 500.0,
    multiplier: 6.0,
    createdAt: "2024-01-15",
    updatedAt: "2026-09-22",
    status: "ACTIVE",
    steps: [
      {
        id: "step-1-eth",
        stepIndex: 1,
        symbol: "ETH",
        name: "Ethereum (Etapa 1)",
        startDate: "2024-01-15",
        endDate: "2024-11-20",
        initialAmountBRL: 1000,
        finalAmountBRL: 3000,
        profitBRL: 2000,
        returnPct: 200.0, // +200% (3x)
        status: "COMPLETED",
        notes: "Realização parcial cirúrgica no topo do ciclo de altcoins.",
      },
      {
        id: "step-2-btc",
        stepIndex: 2,
        symbol: "BTC",
        name: "Bitcoin (Etapa 2 - Recompra)",
        startDate: "2024-11-21",
        initialAmountBRL: 3000,
        finalAmountBRL: 6000,
        profitBRL: 3000,
        returnPct: 100.0, // +100% (2x)
        status: "ACTIVE",
        notes: "Reinvestimento integral dos R$ 3.000 gerados pela venda do ETH.",
      },
    ],
  },
];

export class CapitalChainService {
  /**
   * Recalculates metrics for a trail given its steps.
   */
  public calculateTrailMetrics(trail: CapitalChainTrail): CapitalChainTrail {
    if (!trail.steps || trail.steps.length === 0) {
      return {
        ...trail,
        currentValueBRL: trail.initialSeedBRL,
        totalProfitBRL: 0,
        compoundReturnPct: 0,
        multiplier: 1.0,
      };
    }

    const initialSeed = trail.initialSeedBRL > 0 ? trail.initialSeedBRL : trail.steps[0].initialAmountBRL;
    const latestStep = trail.steps[trail.steps.length - 1];
    const currentValue = latestStep.finalAmountBRL;
    const totalProfit = currentValue - initialSeed;

    // Multiplier compounding across steps
    let cumulativeMultiplier = 1.0;
    for (const step of trail.steps) {
      const stepMult = step.initialAmountBRL > 0 ? step.finalAmountBRL / step.initialAmountBRL : 1.0;
      cumulativeMultiplier *= stepMult;
    }

    const compoundReturnPct = (cumulativeMultiplier - 1.0) * 100;

    return {
      ...trail,
      initialSeedBRL: initialSeed,
      currentValueBRL: currentValue,
      totalProfitBRL: totalProfit,
      compoundReturnPct: Math.round(compoundReturnPct * 10) / 10,
      multiplier: Math.round(cumulativeMultiplier * 100) / 100,
    };
  }

  /**
   * Loads all capital trails from LocalStorage with fallback defaults.
   */
  public getTrails(): CapitalChainTrail[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: CapitalChainTrail[] = JSON.parse(saved);
        return parsed.map((t) => this.calculateTrailMetrics(t));
      }
    } catch (e) {
      console.warn("[CapitalChainService] Failed to load trails from LocalStorage:", e);
    }
    return DEFAULT_CAPITAL_TRAILS.map((t) => this.calculateTrailMetrics(t));
  }

  /**
   * Saves trails list to LocalStorage.
   */
  public saveTrails(trails: CapitalChainTrail[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trails));
    } catch (e) {
      console.error("[CapitalChainService] Failed to save trails to LocalStorage:", e);
    }
  }

  /**
   * Adds a new trail.
   */
  public createTrail(newTrail: Omit<CapitalChainTrail, "id" | "createdAt" | "updatedAt" | "compoundReturnPct" | "multiplier">): CapitalChainTrail {
    const trails = this.getTrails();
    const id = `trail-${Date.now()}`;
    const now = new Date().toISOString().split("T")[0];

    const trail: CapitalChainTrail = this.calculateTrailMetrics({
      ...newTrail,
      id,
      createdAt: now,
      updatedAt: now,
      compoundReturnPct: 0,
      multiplier: 1.0,
    });

    trails.unshift(trail);
    this.saveTrails(trails);
    return trail;
  }

  /**
   * Adds a new step / reinvestment cycle to an existing trail.
   */
  public addStepToTrail(trailId: string, newStep: Omit<CapitalChainStep, "id" | "stepIndex">): CapitalChainTrail | null {
    const trails = this.getTrails();
    const index = trails.findIndex((t) => t.id === trailId);
    if (index === -1) return null;

    const trail = trails[index];
    // Close the previous active step if present
    if (trail.steps.length > 0) {
      const lastStep = trail.steps[trail.steps.length - 1];
      lastStep.status = "COMPLETED";
      if (!lastStep.endDate) {
        lastStep.endDate = new Date().toISOString().split("T")[0];
      }
    }

    const stepIndex = trail.steps.length + 1;
    const stepId = `step-${stepIndex}-${Date.now()}`;
    const stepGain = newStep.initialAmountBRL > 0
      ? ((newStep.finalAmountBRL - newStep.initialAmountBRL) / newStep.initialAmountBRL) * 100
      : 0;

    const step: CapitalChainStep = {
      ...newStep,
      id: stepId,
      stepIndex,
      profitBRL: newStep.finalAmountBRL - newStep.initialAmountBRL,
      returnPct: Math.round(stepGain * 10) / 10,
    };

    trail.steps.push(step);
    trail.updatedAt = new Date().toISOString().split("T")[0];

    const updatedTrail = this.calculateTrailMetrics(trail);
    trails[index] = updatedTrail;
    this.saveTrails(trails);
    return updatedTrail;
  }

  /**
   * Updates an existing step in a trail.
   */
  public updateStep(trailId: string, stepId: string, updates: Partial<CapitalChainStep>): CapitalChainTrail | null {
    const trails = this.getTrails();
    const trailIdx = trails.findIndex((t) => t.id === trailId);
    if (trailIdx === -1) return null;

    const trail = trails[trailIdx];
    const stepIdx = trail.steps.findIndex((s) => s.id === stepId);
    if (stepIdx === -1) return null;

    const currentStep = trail.steps[stepIdx];
    const updatedStep: CapitalChainStep = {
      ...currentStep,
      ...updates,
    };

    const stepGain = updatedStep.initialAmountBRL > 0
      ? ((updatedStep.finalAmountBRL - updatedStep.initialAmountBRL) / updatedStep.initialAmountBRL) * 100
      : 0;

    updatedStep.profitBRL = updatedStep.finalAmountBRL - updatedStep.initialAmountBRL;
    updatedStep.returnPct = Math.round(stepGain * 10) / 10;

    trail.steps[stepIdx] = updatedStep;
    trail.updatedAt = new Date().toISOString().split("T")[0];

    const updatedTrail = this.calculateTrailMetrics(trail);
    trails[trailIdx] = updatedTrail;
    this.saveTrails(trails);
    return updatedTrail;
  }

  /**
   * Deletes a trail.
   */
  public deleteTrail(trailId: string): void {
    const trails = this.getTrails().filter((t) => t.id !== trailId);
    this.saveTrails(trails);
  }
}

export const capitalChainService = new CapitalChainService();
