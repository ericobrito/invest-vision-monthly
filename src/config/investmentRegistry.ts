import type { InvestmentMode, Position } from "@/data/investments";
import { FALLBACK_USD_BRL } from "@/config/marketDefaults";

export interface InvestmentCanonicalRule {
  id: string;
  name: string;
  match: (name: string) => boolean;
  forcedMode?: InvestmentMode;
  forcedCurrency?: string;
  getCanonicalPositions: (
    fxRates: Record<string, number>,
    storedValueBRL?: number,
    liveQuotes?: Record<string, number>
  ) => Position[];
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
    getCanonicalPositions: (fxRates, storedValueBRL, liveQuotes) => {
      const usdRate = fxRates["USD"] || FALLBACK_USD_BRL;

      const tslaPrice = liveQuotes?.["TSLA"] || 378.05;
      const metaPrice = liveQuotes?.["META"] || 641.37;
      const brkbPrice = liveQuotes?.["BRK-B"] || liveQuotes?.["BRK.B"] || 575.25;
      const googlPrice = liveQuotes?.["GOOGL"] || 288.15;
      const ionqPrice = liveQuotes?.["IONQ"] || 35.34;
      const rgtiPrice = liveQuotes?.["RGTI"] || 12.98;
      const amdPrice = liveQuotes?.["AMD"] || 508.58;

      const holdings = [
        { symbol: "TSLA", name: "Tesla Inc", quantity: 14.0829, averagePrice: 319.69, currentPrice: tslaPrice, appliedAmount: 4502.18 },
        { symbol: "META", name: "Meta Platforms Inc", quantity: 2.9699, averagePrice: 210.52, currentPrice: metaPrice, appliedAmount: 625.22 },
        { symbol: "USDT", name: "Dólar / Saldo em Conta", quantity: 2194.98, averagePrice: 1.00, currentPrice: 1.00, appliedAmount: 2194.98 },
        { symbol: "BRK.B", name: "Berkshire Hathaway Inc Class B", quantity: 2.5976, averagePrice: 229.16, currentPrice: brkbPrice, appliedAmount: 595.27 },
        { symbol: "GOOGL", name: "Alphabet Inc Class A", quantity: 2.9580, averagePrice: 94.84, currentPrice: googlPrice, appliedAmount: 280.54 },
        { symbol: "IONQ", name: "IonQ Inc", quantity: 5.08221, averagePrice: 66.90, currentPrice: ionqPrice, appliedAmount: 340.00 },
        { symbol: "RGTI", name: "Rigetti Computing Inc", quantity: 8.0, averagePrice: 48.87, currentPrice: rgtiPrice, appliedAmount: 390.96 },
        { symbol: "AMD", name: "Advanced Micro Devices Inc", quantity: 0.1947, averagePrice: 196.89, currentPrice: amdPrice, appliedAmount: 38.33 },
      ];

      // If storedValueBRL is explicitly provided AND no live quotes are passed (historical frozen snapshot)
      if (storedValueBRL && storedValueBRL > 0 && (!liveQuotes || Object.keys(liveQuotes).length === 0)) {
        const baseUSD = storedValueBRL / usdRate;
        const baselineSum = 11446.08;
        const scale = baseUSD / baselineSum;
        return holdings.map((h) => {
          const qty = h.quantity * scale;
          const valUSD = qty * h.currentPrice;
          const appUSD = h.appliedAmount * scale;
          return {
            symbol: h.symbol,
            name: h.name,
            quantity: qty,
            averagePrice: h.averagePrice,
            currentPrice: h.currentPrice,
            appliedAmount: appUSD,
            currentValue: valUSD,
            currentValueBRL: valUSD * usdRate,
            appliedAmountBRL: appUSD * usdRate,
            currency: "USD",
            fxRate: usdRate,
          };
        });
      }

      // True dynamic calculation driven by live market prices
      return holdings.map((h) => {
        const valUSD = Number((h.quantity * h.currentPrice).toFixed(2));
        return {
          symbol: h.symbol,
          name: h.name,
          quantity: h.quantity,
          averagePrice: h.averagePrice,
          currentPrice: h.currentPrice,
          appliedAmount: h.appliedAmount,
          currentValue: valUSD,
          currentValueBRL: Number((valUSD * usdRate).toFixed(2)),
          appliedAmountBRL: Number((h.appliedAmount * usdRate).toFixed(2)),
          currency: "USD",
          fxRate: usdRate,
        };
      });
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
    getCanonicalPositions: (fxRates, storedValueBRL, liveQuotes) => {
      const usdRate = fxRates["USD"] || FALLBACK_USD_BRL;
      const btcPrice = liveQuotes?.["BTC"] || 74800;
      const ethPrice = liveQuotes?.["ETH"] || 2120;

      const holdings = [
        {
          symbol: "BTC",
          name: "Bitcoin (Spot)",
          quantity: 0.020000,
          averagePrice: 29882.78,
          currentPrice: btcPrice,
          appliedAmount: 597.66,
        },
        {
          symbol: "ETH",
          name: "Ethereum (Staking)",
          quantity: 0.919702,
          averagePrice: 2160.00,
          currentPrice: ethPrice,
          appliedAmount: 1615.37,
        },
      ];

      // If storedValueBRL is explicitly provided AND no live quotes are passed (historical frozen snapshot)
      if (storedValueBRL && storedValueBRL > 0 && (!liveQuotes || Object.keys(liveQuotes).length === 0)) {
        const totalBRL = storedValueBRL;
        const totalUSD = totalBRL / usdRate;
        const baselineUSD = 3593.63;
        const scale = totalUSD / baselineUSD;
        return holdings.map((h) => {
          const qty = h.quantity * scale;
          const valUSD = qty * h.currentPrice;
          const appUSD = h.appliedAmount * scale;
          return {
            symbol: h.symbol,
            name: h.name,
            quantity: qty,
            averagePrice: h.averagePrice,
            currentPrice: h.currentPrice,
            appliedAmount: appUSD,
            currentValue: valUSD,
            currentValueBRL: valUSD * usdRate,
            appliedAmountBRL: appUSD * usdRate,
            currency: "USD",
            fxRate: usdRate,
          };
        });
      }

      // True dynamic calculation driven by live market prices
      return holdings.map((h) => {
        const valUSD = Number((h.quantity * h.currentPrice).toFixed(2));
        return {
          symbol: h.symbol,
          name: h.name,
          quantity: h.quantity,
          averagePrice: h.averagePrice,
          currentPrice: h.currentPrice,
          appliedAmount: h.appliedAmount,
          currentValue: valUSD,
          currentValueBRL: Number((valUSD * usdRate).toFixed(2)),
          appliedAmountBRL: Number((h.appliedAmount * usdRate).toFixed(2)),
          currency: "USD",
          fxRate: usdRate,
        };
      });
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
    getCanonicalPositions: (fxRates, storedValueBRL, liveQuotes) => {
      const usdRate = fxRates["USD"] || FALLBACK_USD_BRL;
      const btcPrice = liveQuotes?.["BTC"] || 74800;
      const ethPrice = liveQuotes?.["ETH"] || 2120;

      const holdings = [
        {
          symbol: "USDT",
          name: "Tether USD",
          quantity: 3858.18,
          averagePrice: 1.00,
          currentPrice: 1.00,
          appliedAmount: 3858.18,
        },
        {
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 0.04894251,
          averagePrice: 29882.78,
          currentPrice: btcPrice,
          appliedAmount: 1462.54,
        },
        {
          symbol: "ETH",
          name: "Ethereum",
          quantity: 1.0804185,
          averagePrice: 2160.00,
          currentPrice: ethPrice,
          appliedAmount: 2333.70,
        },
      ];

      // If storedValueBRL is explicitly provided AND no live quotes are passed (historical frozen snapshot)
      if (storedValueBRL && storedValueBRL > 0 && (!liveQuotes || Object.keys(liveQuotes).length === 0)) {
        const targetUSD = storedValueBRL / usdRate;
        const baselineUSD = 10025.89;
        const scale = targetUSD / baselineUSD;
        return holdings.map((h) => {
          const qty = h.quantity * scale;
          const valUSD = qty * h.currentPrice;
          const appUSD = h.appliedAmount * scale;
          return {
            symbol: h.symbol,
            name: h.name,
            quantity: qty,
            averagePrice: h.averagePrice,
            currentPrice: h.currentPrice,
            appliedAmount: appUSD,
            currentValue: valUSD,
            currentValueBRL: valUSD * usdRate,
            appliedAmountBRL: appUSD * usdRate,
            currency: "USD",
            fxRate: usdRate,
          };
        });
      }

      // True dynamic calculation driven by live market prices
      return holdings.map((h) => {
        const valUSD = Number((h.quantity * h.currentPrice).toFixed(2));
        return {
          symbol: h.symbol,
          name: h.name,
          quantity: h.quantity,
          averagePrice: h.averagePrice,
          currentPrice: h.currentPrice,
          appliedAmount: h.appliedAmount,
          currentValue: valUSD,
          currentValueBRL: Number((valUSD * usdRate).toFixed(2)),
          appliedAmountBRL: Number((h.appliedAmount * usdRate).toFixed(2)),
          currency: "USD",
          fxRate: usdRate,
        };
      });
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
    getCanonicalPositions: (fxRates, storedValueBRL, liveQuotes) => {
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
    getCanonicalPositions: (fxRates, storedValueBRL, liveQuotes) => {
      const usdRate = fxRates["USD"] || FALLBACK_USD_BRL;
      const ethPrice = liveQuotes?.["ETH"] || 2120;
      const ethQty = 0.40945792;
      const appliedUSD = 892.56;

      // If storedValueBRL is explicitly provided AND no live quotes are passed (historical frozen snapshot)
      if (storedValueBRL && storedValueBRL > 0 && (!liveQuotes || Object.keys(liveQuotes).length === 0)) {
        const valUSD = storedValueBRL / usdRate;
        return [
          {
            symbol: "ETH",
            name: "Ethereum (Mercado Bitcoin)",
            quantity: ethQty,
            averagePrice: 2160.0,
            currentPrice: ethPrice,
            appliedAmount: appliedUSD,
            currentValue: valUSD,
            currentValueBRL: storedValueBRL,
            appliedAmountBRL: appliedUSD * usdRate,
            currency: "USD",
            fxRate: usdRate,
          },
        ];
      }

      // True dynamic calculation driven by live market prices
      const valUSD = Number((ethQty * ethPrice).toFixed(2));
      return [
        {
          symbol: "ETH",
          name: "Ethereum (Mercado Bitcoin)",
          quantity: ethQty,
          averagePrice: 2160.0,
          currentPrice: ethPrice,
          appliedAmount: appliedUSD,
          currentValue: valUSD,
          currentValueBRL: Number((valUSD * usdRate).toFixed(2)),
          appliedAmountBRL: Number((appliedUSD * usdRate).toFixed(2)),
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
