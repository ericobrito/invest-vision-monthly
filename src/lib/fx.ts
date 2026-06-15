/**
 * FX (currency) normalization layer.
 * All portfolio aggregation must occur in BRL.
 *
 * Source of truth: frankfurter.dev (free, no API key, BRL supported as base).
 * Rates are cached in localStorage for 1 hour.
 */
import { useQuery } from "@tanstack/react-query";

export type SupportedCurrency = "BRL" | "USD" | "EUR" | "GBP";

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["BRL", "USD", "EUR", "GBP"];

/** Rate map: currency code -> units of BRL per 1 unit of currency. */
export type FxRates = Record<string, number>;

const CACHE_KEY = "fx_rates_brl_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

interface CachedRates {
  rates: FxRates;
  at: number;
}

function readCache(): CachedRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (!parsed.rates || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rates: FxRates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/**
 * Fetch latest FX rates with BRL as the target currency.
 * Returns map { USD: 5.4, EUR: 5.9, GBP: 6.8, BRL: 1 } meaning "1 USD = 5.4 BRL".
 */
export async function fetchFxRatesToBRL(): Promise<FxRates> {
  const cached = readCache();
  if (cached) return cached.rates;

  // frankfurter.dev: ask for BRL quoted against each currency we care about.
  // GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL  -> {rates:{BRL:5.4}}
  const others = SUPPORTED_CURRENCIES.filter((c) => c !== "BRL");
  const rates: FxRates = { BRL: 1 };

  await Promise.all(
    others.map(async (cur) => {
      try {
        const res = await fetch(
          `https://api.frankfurter.dev/v1/latest?base=${cur}&symbols=BRL`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const r = Number(json?.rates?.BRL);
        if (Number.isFinite(r) && r > 0) {
          rates[cur] = r;
        }
      } catch (e) {
        console.warn(`[fx] failed to fetch ${cur}/BRL:`, e);
      }
    }),
  );

  // Fallback hardcoded approximations if network fails — keeps app functional.
  if (rates.USD == null) rates.USD = 5.4;
  if (rates.EUR == null) rates.EUR = 5.9;
  if (rates.GBP == null) rates.GBP = 6.8;

  writeCache(rates);
  return rates;
}

/** Return units of BRL per 1 unit of given currency. */
export function getFxRate(currency: string | undefined, rates: FxRates | undefined): number {
  if (!currency || currency === "BRL") return 1;
  const r = rates?.[currency.toUpperCase()];
  return Number.isFinite(r) && r! > 0 ? (r as number) : 1;
}

/** Convert any amount in `currency` to BRL using the provided rate map. */
export function toBRL(
  amount: number | null | undefined,
  currency: string | undefined,
  rates: FxRates | undefined,
): number {
  const a = Number(amount) || 0;
  return a * getFxRate(currency, rates);
}

/** React Query hook to load FX rates (1h cache). */
export function useFxRates() {
  return useQuery({
    queryKey: ["fx-rates-brl"],
    queryFn: fetchFxRatesToBRL,
    staleTime: CACHE_TTL_MS,
    gcTime: CACHE_TTL_MS,
  });
}
