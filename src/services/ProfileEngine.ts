/**
 * ProfileEngine (v1)
 * --------------------------------------------------------------------------
 * Single source of truth for calculating the investor's wealth-building stage.
 *
 * Methodology:
 * - annual_contribution = monthly_contribution * 12
 * - accumulation_ratio = annual_contribution / invested_assets
 *
 * Stages:
 * - ratio > 0.20 (20%) -> CONSTRUÇÃO (🟢)
 * - 0.05 <= ratio <= 0.20 (5% - 20%) -> TRANSIÇÃO (🟡)
 * - ratio < 0.05 (5%) -> MANUTENÇÃO (🔵)
 * - invested_assets == 0 -> CONSTRUÇÃO INICIAL (🟢) (no division by zero)
 *
 * ENGINE VERSION: v1
 */

export type WealthStage = "construction" | "transition" | "maintenance" | "construction_initial";

export type PriorityLevel = "ALTA" | "MÉDIA" | "BAIXA";

export interface ProfileInput {
  investedAssets: number;
  monthlyContribution: number;
  monthlyIncome?: number;
  age?: number;
  investmentHorizonYears?: number;
  riskProfile?: string; // Kept as distinct dimension from wealth stage
}

export interface ProfileEngineResult {
  stage: WealthStage;
  stageLabel: string;
  stageBadgeColor: "emerald" | "amber" | "blue";
  stageEmoji: string;
  accumulationRatio: number; // Decimal (0.30)
  accumulationRatioPercent: number; // Percentage (30.0)
  annualContribution: number;
  monthlyContribution: number;
  investedAssets: number;
  mainPriority: string;
  priorities: {
    aumentarAportes: PriorityLevel;
    investirMelhor: PriorityLevel;
    usufruirConsumir: PriorityLevel;
  };
  explanationText: string;
  qualityOfLifeNotice: string;
  engineVersion: "v1";
  calculatedAt: string;
}

class ProfileEngine {
  public calculate(input: ProfileInput): ProfileEngineResult {
    const investedAssets = Math.max(0, Number(input.investedAssets) || 0);
    const monthlyContribution = Math.max(0, Number(input.monthlyContribution) || 0);
    const annualContribution = monthlyContribution * 12;

    let stage: WealthStage;
    let accumulationRatio = 0;

    if (investedAssets === 0) {
      stage = "construction_initial";
      accumulationRatio = monthlyContribution > 0 ? 1.0 : 0.0;
    } else {
      accumulationRatio = annualContribution / investedAssets;
      if (accumulationRatio > 0.20) {
        stage = "construction";
      } else if (accumulationRatio >= 0.05) {
        stage = "transition";
      } else {
        stage = "maintenance";
      }
    }

    const accumulationRatioPercent = Number((accumulationRatio * 100).toFixed(2));
    const calculatedAt = new Date().toISOString();

    let stageLabel = "CONSTRUÇÃO";
    let stageBadgeColor: "emerald" | "amber" | "blue" = "emerald";
    let stageEmoji = "🟢";
    let mainPriority = "Aumentar capacidade de aporte";
    let explanationText = "";
    let priorities: {
      aumentarAportes: PriorityLevel;
      investirMelhor: PriorityLevel;
      usufruirConsumir: PriorityLevel;
    };

    switch (stage) {
      case "construction_initial":
        stageLabel = "CONSTRUÇÃO INICIAL";
        stageBadgeColor = "emerald";
        stageEmoji = "🟢";
        mainPriority = "Iniciar aportes e reserva básica";
        explanationText =
          "Você está iniciando sua jornada patrimonial. Nesta fase inicial, focar no aumento da renda e no início da constância de aportes trará o maior impacto no longo prazo.";
        priorities = {
          aumentarAportes: "ALTA",
          investirMelhor: "MÉDIA",
          usufruirConsumir: "BAIXA",
        };
        break;

      case "construction":
        stageLabel = "CONSTRUÇÃO";
        stageBadgeColor = "emerald";
        stageEmoji = "🟢";
        mainPriority = "Aumentar capacidade de aporte";
        explanationText =
          "Seu aporte anual representa uma parcela relevante do seu patrimônio atual. Nesta fase, aumentar sua capacidade de aporte tende a ter grande impacto na construção patrimonial.";
        priorities = {
          aumentarAportes: "ALTA",
          investirMelhor: "MÉDIA",
          usufruirConsumir: "BAIXA",
        };
        break;

      case "transition":
        stageLabel = "TRANSIÇÃO";
        stageBadgeColor = "amber";
        stageEmoji = "🟡";
        mainPriority = "Equilibrar aportes e qualidade dos investimentos";
        explanationText =
          "Seu patrimônio começa a assumir maior importância. O objetivo passa a ser equilibrar novos aportes, qualidade dos investimentos e utilização da sua renda.";
        priorities = {
          aumentarAportes: "MÉDIA",
          investirMelhor: "ALTA",
          usufruirConsumir: "MÉDIA",
        };
        break;

      case "maintenance":
        stageLabel = "MANUTENÇÃO";
        stageBadgeColor = "blue";
        stageEmoji = "🔵";
        mainPriority = "Gestão eficiente do patrimônio e usfruto da renda";
        explanationText =
          "Seu patrimônio existente já possui grande peso em relação aos novos aportes. A prioridade passa a ser administrar bem o patrimônio e avaliar se aumentar os aportes realmente compensa o sacrifício.";
        priorities = {
          aumentarAportes: "BAIXA",
          investirMelhor: "ALTA",
          usufruirConsumir: "ALTA",
        };
        break;
    }

    const qualityOfLifeNotice =
      "A utilidade marginal do dinheiro e o valor do tempo mudam ao longo da vida. Avalie continuamente a relação entre aumento de renda, capacidade de aporte, tempo sacrificado, qualidade de vida e utilidade do consumo presente vs. patrimônio futuro.";

    return {
      stage,
      stageLabel,
      stageBadgeColor,
      stageEmoji,
      accumulationRatio,
      accumulationRatioPercent,
      annualContribution,
      monthlyContribution,
      investedAssets,
      mainPriority,
      priorities,
      explanationText,
      qualityOfLifeNotice,
      engineVersion: "v1",
      calculatedAt,
    };
  }
}

export const profileEngine = new ProfileEngine();
export default profileEngine;
