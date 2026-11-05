import type { InvestmentMode, Position } from "@/data/investments";
import { FALLBACK_USD_BRL } from "@/config/marketDefaults";

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
      const usdRate = fxRates["USD"] || FALLBACK_USD_BRL;
      const targetBRL = storedValueBRL && storedValueBRL > 0 ? storedValueBRL : (11446.08 * usdRate);
      const baseUSD = targetBRL / usdRate;
      const scale = baseUSD / 11446.08;
      return [
        {
          symbol: "TSLA",
          name: "Tesla Inc",
          quantity: 14.0829 * scale,
          averagePrice: 319.69,
          currentPrice: 343.69,
          appliedAmount: 4502.18 * scale,
          currentValue: 4840.15 * scale,
          currentValueBRL: (4840.15 * scale) * usdRate,
          appliedAmountBRL: (4502.18 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "META",
          name: "Meta Platforms Inc",
          quantity: 2.9699 * scale,
          averagePrice: 210.52,
          currentPrice: 605.08,
          appliedAmount: 625.22 * scale,
          currentValue: 1797.03 * scale,
          currentValueBRL: (1797.03 * scale) * usdRate,
          appliedAmountBRL: (625.22 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "USDT",
          name: "Dólar / Saldo em Conta",
          quantity: 2194.98 * scale,
          averagePrice: 1.00,
          currentPrice: 1.00,
          appliedAmount: 2194.98 * scale,
          currentValue: 2194.98 * scale,
          currentValueBRL: (2194.98 * scale) * usdRate,
          appliedAmountBRL: (2194.98 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "BRK.B",
          name: "Berkshire Hathaway Inc Class B",
          quantity: 2.5976 * scale,
          averagePrice: 229.16,
          currentPrice: 572.16,
          appliedAmount: 595.27 * scale,
          currentValue: 1486.24 * scale,
          currentValueBRL: (1486.24 * scale) * usdRate,
          appliedAmountBRL: (595.27 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "GOOGL",
          name: "Alphabet Inc Class A",
          quantity: 2.9580 * scale,
          averagePrice: 94.84,
          currentPrice: 282.57,
          appliedAmount: 280.54 * scale,
          currentValue: 835.84 * scale,
          currentValueBRL: (835.84 * scale) * usdRate,
          appliedAmountBRL: (280.54 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "IONQ",
          name: "IonQ Inc",
          quantity: 5.08221 * scale,
          averagePrice: 66.90,
          currentPrice: 26.53,
          appliedAmount: 340.00 * scale,
          currentValue: 134.82 * scale,
          currentValueBRL: (134.82 * scale) * usdRate,
          appliedAmountBRL: (340.00 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "RGTI",
          name: "Rigetti Computing Inc",
          quantity: 8.0 * scale,
          averagePrice: 48.87,
          currentPrice: 9.79,
          appliedAmount: 390.96 * scale,
          currentValue: 78.28 * scale,
          currentValueBRL: (78.28 * scale) * usdRate,
          appliedAmountBRL: (390.96 * scale) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "AMD",
          name: "Advanced Micro Devices Inc",
          quantity: 0.1947 * scale,
          averagePrice: 196.89,
          currentPrice: 404.40,
          appliedAmount: 38.33 * scale,
          currentValue: 78.74 * scale,
          currentValueBRL: (78.74 * scale) * usdRate,
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
      const usdRate = fxRates["USD"] || FALLBACK_USD_BRL;
      const targetBRL = storedValueBRL && storedValueBRL > 0 ? storedValueBRL : 19744.47;
      const valUSD = targetBRL / usdRate;
      return [
        {
          symbol: "BTC",
          name: "Bitcoin USD (Spot)",
          quantity: (valUSD * 0.4243) / 77459.5,
          averagePrice: 29882.78,
          currentPrice: 77459.5,
          appliedAmount: (valUSD * 0.4243 * 0.65),
          currentValue: valUSD * 0.4243,
          currentValueBRL: (valUSD * 0.4243) * usdRate,
          appliedAmountBRL: (valUSD * 0.4243 * 0.65) * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "ETH",
          name: "Ethereum USD (Staking)",
          quantity: (valUSD * 0.5757) / 2467.75,
          averagePrice: 2160.0,
          currentPrice: 2467.75,
          appliedAmount: (valUSD * 0.5757 * 0.65),
          currentValue: valUSD * 0.5757,
          currentValueBRL: (valUSD * 0.5757) * usdRate,
          appliedAmountBRL: (valUSD * 0.5757 * 0.65) * usdRate,
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
      const usdRate = fxRates["USD"] || FALLBACK_USD_BRL;
      const targetBRL = storedValueBRL && storedValueBRL > 0 ? storedValueBRL : 55085.26;
      const targetUSD = targetBRL / usdRate;
      const usdtValUSD = targetUSD * 0.385;
      const btcValUSD = targetUSD * 0.373;
      const ethValUSD = targetUSD * 0.242;
      return [
        {
          symbol: "USDT",
          name: "Tether USD",
          quantity: 3858.18,
          averagePrice: 1.0,
          currentPrice: 1.0,
          appliedAmount: 3858.18,
          currentValue: usdtValUSD,
          currentValueBRL: usdtValUSD * usdRate,
          appliedAmountBRL: 3858.18 * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 0.04894251,
          averagePrice: 29882.78,
          currentPrice: 77356.24,
          appliedAmount: 1462.54,
          currentValue: btcValUSD,
          currentValueBRL: btcValUSD * usdRate,
          appliedAmountBRL: 1462.54 * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "ETH",
          name: "Ethereum",
          quantity: 1.0804185,
          averagePrice: 2160.00,
          currentPrice: 2467.75,
          appliedAmount: 2333.70,
          currentValue: ethValUSD,
          currentValueBRL: ethValUSD * usdRate,
          appliedAmountBRL: 2333.70 * usdRate,
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
      const usdRate = fxRates["USD"] || FALLBACK_USD_BRL;
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
      const usdRate = fxRates["USD"] || FALLBACK_USD_BRL;
      const targetBRL = storedValueBRL && storedValueBRL > 0 ? storedValueBRL : 5604.76;
      const valUSD = targetBRL / usdRate;
      return [
        {
          symbol: "ETH",
          name: "Ethereum (Mercado Bitcoin)",
          quantity: 0.40945792,
          averagePrice: 2160.0,
          currentPrice: 2490.0,
          appliedAmount: 892.56,
          currentValue: valUSD,
          currentValueBRL: targetBRL,
          appliedAmountBRL: 892.56 * usdRate,
          currency: "USD",
          fxRate: usdRate,
        },
      ];
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
