/**
 * Market Defaults — Centralized fallback configuration.
 *
 * All market-related fallback values live here. No other file should hardcode
 * FX rates, average prices, or symbol-name mappings. Instead, import from here.
 *
 * These are LAST-RESORT fallbacks only used when ALL live APIs fail.
 * They do NOT override live data — they prevent crashes.
 */

// ─── FX Fallback ──────────────────────────────────────────────────
/** Last-resort USD→BRL rate when every API is unreachable. */
export const FALLBACK_USD_BRL = 5.60;

// ─── Crypto Average Price Sanitization ────────────────────────────
/**
 * Minimum valid average prices in USD per crypto symbol.
 * Used to detect legacy/uninitialized DB rows (e.g. averagePrice = 0).
 * When a DB row has an averagePrice below `minValid`, we replace it with `defaultAvg`.
 */
export interface CryptoAverageFallback {
  /** Below this threshold, the stored averagePrice is considered invalid/legacy */
  minValid: number;
  /** Replacement averagePrice (in USD) when the DB value is invalid */
  defaultAvg: number;
}

export const CRYPTO_AVERAGE_FALLBACKS: Record<string, CryptoAverageFallback> = {
  BTC: { minValid: 5000, defaultAvg: 29882.78 },
  ETH: { minValid: 500,  defaultAvg: 2160.00  },
  SOL: { minValid: 10,   defaultAvg: 95.00    },
};

/**
 * Sanitize a crypto average price using the centralized fallback table.
 * Returns the original price if it's valid, or the default if it's not.
 */
export function sanitizeCryptoAveragePrice(symbol: string, averagePrice: number): number {
  const key = symbol.toUpperCase();
  const fallback = CRYPTO_AVERAGE_FALLBACKS[key];
  if (!fallback) return averagePrice; // unknown symbol, keep as-is
  if (averagePrice <= 0 || averagePrice < fallback.minValid) {
    return fallback.defaultAvg;
  }
  return averagePrice;
}

// ─── Symbol Inference from Investment Names ───────────────────────
/**
 * Maps keywords found in investment names to crypto symbols to fetch.
 * Fully data-driven: add new entries here and the whole app picks them up.
 * Case-insensitive matching is performed on the investment name.
 */
export interface SymbolInferenceRule {
  /** Keywords to search for in the investment name (case-insensitive) */
  keywords: string[];
  /** The market symbol to fetch (e.g. "BTC", "ETH") */
  symbol: string;
}

export const SYMBOL_INFERENCE_RULES: SymbolInferenceRule[] = [
  { keywords: ["bitcoin", "btc", "mercado bitcoin"],  symbol: "BTC" },
  { keywords: ["ethereum", "eth"],                     symbol: "ETH" },
  { keywords: ["solana", "sol"],                       symbol: "SOL" },
  { keywords: ["cardano", "ada"],                      symbol: "ADA" },
  { keywords: ["ripple", "xrp"],                       symbol: "XRP" },
  { keywords: ["dogecoin", "doge"],                    symbol: "DOGE" },
];

/**
 * Given an investment name, return all symbols that should be fetched.
 * Uses the centralized SYMBOL_INFERENCE_RULES table.
 */
export function inferSymbolsFromName(investmentName: string): string[] {
  const nameLower = (investmentName || "").toLowerCase();
  const symbols: string[] = [];
  for (const rule of SYMBOL_INFERENCE_RULES) {
    if (rule.keywords.some((kw) => nameLower.includes(kw))) {
      symbols.push(rule.symbol);
    }
  }
  return symbols;
}

/**
 * Given a list of investments, return all unique symbols that should be fetched live.
 */
export function inferAllSymbolsFromInvestments(investments: { name?: string }[]): string[] {
  const symbols = new Set<string>();
  for (const inv of investments) {
    for (const sym of inferSymbolsFromName(inv.name || "")) {
      symbols.add(sym);
    }
  }
  return Array.from(symbols);
}
