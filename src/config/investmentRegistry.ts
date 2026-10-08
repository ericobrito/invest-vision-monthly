import type { InvestmentMode, Position } from "@/data/investments";

export interface InvestmentCanonicalRule {
  id: string;
  name: string;
  match: (name: string) => boolean;
  forcedMode?: InvestmentMode;
  forcedCurrency?: string;
  getCanonicalPositions: (fxRates: Record<string, number>, storedValueBRL?: number) => Position[];
  isPositionValid?: (positions: Position[]) => boolean;
}

export const CANONICAL_INVESTMENT_RULES: InvestmentCanonicalRule[] = [
  {
    id: "avenue-dolar",
    name: "Avenue - Dólar",
    match: (name: string) => {
      const n = (name || "").toLowerCase();
      return n.includes("avenue") || n.includes("dólar");
    },
    forcedMode: "DETAILED",
    forcedCurrency: "USD",
    getCanonicalPositions: (fxRates, storedValueBRL) => {
      const usdRate = fxRates["USD"] || 5.47;
      const targetBRL = storedValueBRL && storedValueBRL > 0 ? storedValueBRL : 68628.53;
      const baseUSD = targetBRL / usdRate;
      const scale = baseUSD / 12279.97;
      return [
        {
          symbol: "TSLA",
          name: "Tesla Inc",
          quantity: 14.0829 * scale,
          averagePrice: 319.69,
          currentPrice: 380.12,
          appliedAmount: 4502.18 * scale,
          currentValue: 5353.19 * scale,
          currentValueBRL: (5353.19 * scale) * usdRate,
          appliedAmountBRL: (4502.18 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "META",
          name: "Meta Platforms Inc",
          quantity: 2.9699 * scale,
          averagePrice: 210.52,
          currentPrice: 744.10,
          appliedAmount: 625.22 * scale,
          currentValue: 2209.90 * scale,
          currentValueBRL: (2209.90 * scale) * usdRate,
          appliedAmountBRL: (625.22 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "USDT",
          name: "Tether USDt USD",
          quantity: 1936.56 * scale,
          averagePrice: 1.00,
          currentPrice: 1.00,
          appliedAmount: 1936.56 * scale,
          currentValue: 1936.56 * scale,
          currentValueBRL: (1936.56 * scale) * usdRate,
          appliedAmountBRL: (1936.56 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "BRK.B",
          name: "Berkshire Hathaway Inc Class B",
          quantity: 2.5976 * scale,
          averagePrice: 229.16,
          currentPrice: 507.17,
          appliedAmount: 595.27 * scale,
          currentValue: 1317.42 * scale,
          currentValueBRL: (1317.42 * scale) * usdRate,
          appliedAmountBRL: (595.27 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "GOOGL",
          name: "Alphabet Inc Class A",
          quantity: 2.9580 * scale,
          averagePrice: 94.84,
          currentPrice: 337.83,
          appliedAmount: 280.54 * scale,
          currentValue: 999.30 * scale,
          currentValueBRL: (999.30 * scale) * usdRate,
          appliedAmountBRL: (280.54 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "IONQ",
          name: "IonQ Inc",
          quantity: 5.08221 * scale,
          averagePrice: 66.90,
          currentPrice: 42.54,
          appliedAmount: 340.00 * scale,
          currentValue: 216.20 * scale,
          currentValueBRL: (216.20 * scale) * usdRate,
          appliedAmountBRL: (340.00 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "RGTI",
          name: "Rigetti Computing Inc",
          quantity: 8.0 * scale,
          averagePrice: 48.87,
          currentPrice: 16.01,
          appliedAmount: 390.96 * scale,
          currentValue: 128.04 * scale,
          currentValueBRL: (128.04 * scale) * usdRate,
          appliedAmountBRL: (390.96 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "AMD",
          name: "Advanced Micro Devices Inc",
          quantity: 0.1947 * scale,
          averagePrice: 196.89,
          currentPrice: 614.61,
          appliedAmount: 38.33 * scale,
          currentValue: 119.66 * scale,
          currentValueBRL: (119.66 * scale) * usdRate,
          appliedAmountBRL: (38.33 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
      ];
    },
    isPositionValid: (positions) => {
      return Array.isArray(positions) && positions.length > 0;
    },
  },
  {
    id: "coinbase",
    name: "Coinbase - Cripto",
    match: (name: string) => (name || "").toLowerCase().includes("coinbase"),
    forcedMode: "DETAILED",
    forcedCurrency: "USD",
    getCanonicalPositions: (fxRates, storedValueBRL) => {
      const usdRate = fxRates["USD"] || 5.47;
      const targetBRL = storedValueBRL && storedValueBRL > 0 ? storedValueBRL : 19625.36;
      const valUSD = targetBRL / usdRate;
      return [
        {
          symbol: "BTC",
          name: "Bitcoin USD",
          quantity: (valUSD * 0.40) / 77459.5,
          averagePrice: 29882.78,
          currentPrice: 77459.5,
          appliedAmount: (valUSD * 0.40 * 0.65),
          currentValue: valUSD * 0.40,
          currentValueBRL: (valUSD * 0.40) * usdRate,
          appliedAmountBRL: (valUSD * 0.40 * 0.65) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "ETH",
          name: "Ethereum USD",
          quantity: (valUSD * 0.60) / 2467.75,
          averagePrice: 2160.0,
          currentPrice: 2467.75,
          appliedAmount: (valUSD * 0.60 * 0.65),
          currentValue: valUSD * 0.60,
          currentValueBRL: (valUSD * 0.60) * usdRate,
          appliedAmountBRL: (valUSD * 0.60 * 0.65) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
      ];
    },
  },
  {
    id: "binance",
    name: "Binance",
    match: (name: string) => {
      const n = (name || "").toLowerCase();
      return n.includes("binance");
    },
    forcedMode: "DETAILED",
    forcedCurrency: "USD",
    getCanonicalPositions: (fxRates, storedValueBRL) => {
      const usdRate = fxRates["USD"] || 5.47;
      const targetBRL = storedValueBRL && storedValueBRL > 0 ? storedValueBRL : 53096.51;
      const targetUSD = targetBRL / usdRate;
      const usdtValUSD = targetUSD * 0.35;
      const btcValUSD = targetUSD * 0.65;
      const btcQty = btcValUSD / 77356.24;
      return [
        {
          symbol: "USDT",
          name: "Tether USD",
          quantity: usdtValUSD,
          averagePrice: 1.0,
          currentPrice: 1.0,
          appliedAmount: usdtValUSD * 0.60,
          currentValue: usdtValUSD,
          currentValueBRL: usdtValUSD * usdRate,
          appliedAmountBRL: (usdtValUSD * 0.60) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "BTC",
          name: "Bitcoin",
          quantity: btcQty,
          averagePrice: 29882.78,
          currentPrice: 77356.24,
          appliedAmount: btcValUSD * 0.60,
          currentValue: btcValUSD,
          currentValueBRL: btcValUSD * usdRate,
          appliedAmountBRL: (btcValUSD * 0.60) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
      ];
    },
  },
  {
    id: "bybit",
    name: "Bybit - Cripto",
    match: (name: string) => {
      const n = (name || "").toLowerCase();
      return n.includes("bybit");
    },
    forcedMode: "DETAILED",
    forcedCurrency: "USD",
    getCanonicalPositions: (fxRates, storedValueBRL) => {
      const usdRate = fxRates["USD"] || 5.47;
      const targetBRL = storedValueBRL && storedValueBRL > 0 ? storedValueBRL : 15511.52;
      const valUSD = targetBRL / usdRate;
      return [
        {
          symbol: "USDT",
          name: "Tether USD",
          quantity: valUSD,
          averagePrice: 1.0,
          currentPrice: 1.0,
          appliedAmount: valUSD * 0.60,
          currentValue: valUSD,
          currentValueBRL: valUSD * usdRate,
          appliedAmountBRL: (valUSD * 0.60) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
      ];
    },
  },
  {
    id: "bitcoin",
    name: "Bitcoin - (API Mercado Bitcoin)",
    match: (name: string) => {
      const n = (name || "").toLowerCase();
      return n.includes("mercado bitcoin") || n === "bitcoin" || n === "btc" || (n.includes("bitcoin") && !n.includes("binance"));
    },
    forcedMode: "DETAILED",
    forcedCurrency: "USD",
    getCanonicalPositions: (fxRates, storedValueBRL) => {
      const usdRate = fxRates["USD"] || 5.47;
      const targetBRL = storedValueBRL && storedValueBRL > 0 ? storedValueBRL : 5106.35;
      const valUSD = targetBRL / usdRate;
      return [
        {
          symbol: "BTC",
          name: "Bitcoin",
          quantity: valUSD / 68000,
          averagePrice: 48000,
          currentPrice: 68000,
          appliedAmount: valUSD * 0.95,
          currentValue: valUSD,
          currentValueBRL: targetBRL,
          appliedAmountBRL: targetBRL * 0.95,
          currency: "USD",
          fxRate: usdRate,
        },
      ];
    },
  },
];

export function findCanonicalRule(investmentName: string): InvestmentCanonicalRule | undefined {
  return CANONICAL_INVESTMENT_RULES.find((rule) => rule.match(investmentName));
}
