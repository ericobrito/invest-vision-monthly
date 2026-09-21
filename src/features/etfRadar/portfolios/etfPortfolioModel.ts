import type { ETFHolding } from "../types";
import { getEtfDefinition } from "../universe/etfUniverseData";

export interface ETFHoldingsDrilldown {
  ticker: string;
  etfName: string;
  theme: string;
  topHoldingsCount: number;
  topHoldingsConcentrationPct: number;
  holdings: ETFHolding[];
  disclaimer: string;
}

export function getEtfHoldingsDrilldown(ticker: string): ETFHoldingsDrilldown | undefined {
  const def = getEtfDefinition(ticker);
  if (!def) return undefined;

  return {
    ticker: def.ticker,
    etfName: def.name,
    theme: def.theme,
    topHoldingsCount: def.holdingsCount,
    topHoldingsConcentrationPct: def.topHoldingsConcentrationPct,
    holdings: def.topHoldings,
    disclaimer:
      "Atenção: As posições acionárias subjacentes exibidas pelo ETF Radar são estritamente informativas e educacionais. Elas NÃO alteram a carteira do usuário, NÃO alteram o Radar de Ações existente e NÃO geram ordens automáticas.",
  };
}
