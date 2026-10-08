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
    getCanonicalPositions: (_fxRates, _storedValueBRL) => {
      const effectiveFx = 5.1322;
      return [
        {
          symbol: "TSLA",
          name: "Tesla Inc",
          quantity: 14.0829,
          averagePrice: 319.69,
          currentPrice: 380.12,
          appliedAmount: 4502.18,
          currentValue: 5353.19,
          currentValueBRL: 5353.19 * effectiveFx,
          appliedAmountBRL: 4502.18 * effectiveFx,
          currency: "USD",
          fxRate: effectiveFx,
        },
        {
          symbol: "META",
          name: "Meta Platforms Inc",
          quantity: 2.9699,
          averagePrice: 210.52,
          currentPrice: 744.10,
          appliedAmount: 625.22,
          currentValue: 2209.90,
          currentValueBRL: 2209.90 * effectiveFx,
          appliedAmountBRL: 625.22 * effectiveFx,
          currency: "USD",
          fxRate: effectiveFx,
        },
        {
          symbol: "USDT",
          name: "Tether USDt USD",
          quantity: 1936.56,
          averagePrice: 1.00,
          currentPrice: 1.00,
          appliedAmount: 1936.56,
          currentValue: 1936.56,
          currentValueBRL: 1936.56 * effectiveFx,
          appliedAmountBRL: 1936.56 * effectiveFx,
          currency: "USD",
          fxRate: effectiveFx,
        },
        {
          symbol: "BRK.B",
          name: "Berkshire Hathaway Inc Class B",
          quantity: 2.5976,
          averagePrice: 229.16,
          currentPrice: 507.17,
          appliedAmount: 595.27,
          currentValue: 1317.42,
          currentValueBRL: 1317.42 * effectiveFx,
          appliedAmountBRL: 595.27 * effectiveFx,
          currency: "USD",
          fxRate: effectiveFx,
        },
        {
          symbol: "GOOGL",
          name: "Alphabet Inc Class A",
          quantity: 2.9580,
          averagePrice: 94.84,
          currentPrice: 337.83,
          appliedAmount: 280.54,
          currentValue: 999.30,
          currentValueBRL: 999.30 * effectiveFx,
          appliedAmountBRL: 280.54 * effectiveFx,
          currency: "USD",
          fxRate: effectiveFx,
        },
        {
          symbol: "IONQ",
          name: "IonQ Inc",
          quantity: 5.08221,
          averagePrice: 66.90,
          currentPrice: 42.54,
          appliedAmount: 340.00,
          currentValue: 216.20,
          currentValueBRL: 216.20 * effectiveFx,
          appliedAmountBRL: 340.00 * effectiveFx,
          currency: "USD",
          fxRate: effectiveFx,
        },
        {
          symbol: "RGTI",
          name: "Rigetti Computing Inc",
          quantity: 8.0,
          averagePrice: 48.87,
          currentPrice: 16.01,
          appliedAmount: 390.96,
          currentValue: 128.04,
          currentValueBRL: 128.04 * effectiveFx,
          appliedAmountBRL: 390.96 * effectiveFx,
          currency: "USD",
          fxRate: effectiveFx,
        },
        {
          symbol: "AMD",
          name: "Advanced Micro Devices Inc",
          quantity: 0.1947,
          averagePrice: 196.89,
          currentPrice: 614.61,
          appliedAmount: 38.33,
          currentValue: 119.66,
          currentValueBRL: 119.66 * effectiveFx,
          appliedAmountBRL: 38.33 * effectiveFx,
          currency: "USD",
          fxRate: effectiveFx,
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
    getCanonicalPositions: (fxRates) => {
      const usdRate = fxRates["USD"] || 5.6827;
      return [
        {
          symbol: "BTC",
          name: "Bitcoin USD",
          quantity: 0.02,
          averagePrice: 29882.78,
          currentPrice: 77459.5,
          appliedAmount: 597.66,
          currentValue: 1549.19,
          currentValueBRL: 8803.5,
          appliedAmountBRL: 597.66 * 5.0889,
          currency: "USD",
          fxRate: 5.6826,
        },
        {
          symbol: "ETH",
          name: "Ethereum USD",
          quantity: 0.919702,
          averagePrice: 2160.0,
          currentPrice: 2467.75,
          appliedAmount: 1986.56,
          currentValue: 2269.6,
          currentValueBRL: 12926.64,
          appliedAmountBRL: 1986.56 * 5.0889,
          currency: "USD",
          fxRate: 5.6955,
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
      const usdRate = fxRates["USD"] || 5.5223;
      const targetBRL = storedValueBRL && storedValueBRL > 20000 ? storedValueBRL : 55305.09;
      const usdtValUSD = 4754.78;
      const targetUSD = targetBRL / usdRate;
      const btcValUSD = Math.max(0, targetUSD - usdtValUSD);
      const btcQty = btcValUSD > 0 ? btcValUSD / 77356.24 : 0.068;
      return [
        {
          symbol: "USDT",
          name: "Tether USD",
          quantity: 4754.78,
          averagePrice: 1.0,
          currentPrice: 1.0,
          appliedAmount: 4754.78,
          currentValue: usdtValUSD,
          currentValueBRL: usdtValUSD * usdRate,
          appliedAmountBRL: 4754.78 * 5.074,
          currency: "USD",
          fxRate: usdRate,
        },
        {
          symbol: "BTC",
          name: "Bitcoin",
          quantity: btcQty,
          averagePrice: 29882.78,
          currentPrice: 77356.24,
          appliedAmount: 2032.02,
          currentValue: btcValUSD,
          currentValueBRL: btcValUSD * usdRate,
          appliedAmountBRL: 2032.02 * 5.074,
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
    getCanonicalPositions: (fxRates) => {
      const usdRate = fxRates["USD"] || 5.5223;
      return [
        {
          symbol: "USDT",
          name: "Tether USD",
          quantity: 4754.78,
          averagePrice: 1.0,
          currentPrice: 1.0,
          appliedAmount: 4754.78,
          currentValue: 4754.78,
          currentValueBRL: 4754.78 * usdRate,
          appliedAmountBRL: 4754.78 * 5.074,
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
    getCanonicalPositions: (fxRates) => {
      const usdRate = fxRates["USD"] || 5.5223;
      const valUSD = 1014.07;
      const valBRL = 5600.00;
      return [
        {
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 0.0149,
          averagePrice: 48000,
          currentPrice: 68000,
          appliedAmount: 960,
          currentValue: valUSD,
          currentValueBRL: valBRL,
          appliedAmountBRL: 5303.98,
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
