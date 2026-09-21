import type { StrategySimulationScenario } from "./types";

export class IntelligentPlanSimulator {
  public simulateScenarios(
    initialPortfolioValueBRL: number = 200000,
    opportunityCashBRL: number = 32000,
    drawdownLevelPct: number = -15
  ): StrategySimulationScenario[] {
    const marketFactor = 1 + drawdownLevelPct / 100;
    const realizedCashFromRatio = 25000;

    // Strategy A: Buy and Hold (Full market exposure, no cash buffer deployment)
    const valA = initialPortfolioValueBRL * marketFactor;
    const stratA: StrategySimulationScenario = {
      strategyId: "STRATEGY_A",
      strategyName: "Estratégia A: Buy & Hold",
      description: "Manutenção integral da carteira sem realização prévia de lucros nem caixa de oportunidade.",
      finalPortfolioValueBRL: Math.round(valA),
      opportunityCashBRL: 0,
      investedCapitalBRL: initialPortfolioValueBRL,
      positionSizeBRL: Math.round(valA),
      averageCostBRL: initialPortfolioValueBRL,
      repurchasedQuantity: 0,
      totalReturnPct: Math.round(((valA - initialPortfolioValueBRL) / initialPortfolioValueBRL) * 1000) / 10,
      maxDrawdownPct: Math.abs(drawdownLevelPct),
      estimatedTaxBRL: 0,
      transactionCostsBRL: 0,
      opportunityCostBRL: Math.round(initialPortfolioValueBRL * 0.05),
    };

    // Strategy B: Partial Realization + Opportunity Cash (Preserved cash buffer)
    const investedB = initialPortfolioValueBRL - realizedCashFromRatio;
    const valBInvested = investedB * marketFactor;
    const cashB = opportunityCashBRL + realizedCashFromRatio;
    const totalB = valBInvested + cashB;
    const stratB: StrategySimulationScenario = {
      strategyId: "STRATEGY_B",
      strategyName: "Estratégia B: Realização Parcial + Caixa de Oportunidade",
      description: "Realização cirúrgica de lucros nos topos com proteção de capital em caixa de oportunidade.",
      finalPortfolioValueBRL: Math.round(totalB),
      opportunityCashBRL: Math.round(cashB),
      investedCapitalBRL: investedB,
      positionSizeBRL: Math.round(valBInvested),
      averageCostBRL: investedB,
      repurchasedQuantity: 0,
      totalReturnPct: Math.round(((totalB - initialPortfolioValueBRL) / initialPortfolioValueBRL) * 1000) / 10,
      maxDrawdownPct: Math.round(Math.abs(drawdownLevelPct) * 0.7 * 10) / 10,
      estimatedTaxBRL: 0, // Exempt under thresholds
      transactionCostsBRL: 15,
      opportunityCostBRL: 0,
    };

    // Strategy C: Partial Realization + Opportunity Cash + Re-entry Ladder
    const deployedCash = cashB * 0.5; // Deploy 50% of cash at configured drawdown
    const repurchasedVal = deployedCash / marketFactor; // Higher quantity bought at discount
    const valCInvested = valBInvested + repurchasedVal;
    const remainingCashC = cashB - deployedCash;
    const totalC = valCInvested + remainingCashC;
    const stratC: StrategySimulationScenario = {
      strategyId: "STRATEGY_C",
      strategyName: "Estratégia C: Realização + Caixa + Reentrada Progressiva",
      description: "Realização nos topos, acúmulo de caixa e reestocagem de ativos com desconto durante correções.",
      finalPortfolioValueBRL: Math.round(totalC),
      opportunityCashBRL: Math.round(remainingCashC),
      investedCapitalBRL: Math.round(investedB + deployedCash),
      positionSizeBRL: Math.round(valCInvested),
      averageCostBRL: Math.round((investedB + deployedCash) * 0.88),
      repurchasedQuantity: Math.round(deployedCash / 100),
      totalReturnPct: Math.round(((totalC - initialPortfolioValueBRL) / initialPortfolioValueBRL) * 1000) / 10,
      maxDrawdownPct: Math.round(Math.abs(drawdownLevelPct) * 0.45 * 10) / 10,
      estimatedTaxBRL: 0,
      transactionCostsBRL: 30,
      opportunityCostBRL: 0,
    };

    return [stratA, stratB, stratC];
  }
}

export const intelligentPlanSimulator = new IntelligentPlanSimulator();
export default intelligentPlanSimulator;
