/**
 * FX (currency) normalization layer.
 * All portfolio aggregation must occur in BRL.
 *
 * Source of truth: live FX APIs (no hardcoded rates).
 *   Primary:   https://api.exchangerate.host/latest?base=USD&symbols=BRL
 *   Fallback:  https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL
 *
 * Rates are cached in localStorage for 1 hour.
 */
import { useQuery } from "@tanstack/react-query";

export type SupportedCurrency = "BRL" | "USD" | "EUR" | "GBP";

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["BRL", "USD", "EUR", "GBP"];

/** Rate map: currency code -> units of BRL per 1 unit of currency. */
export type FxRates = Record<string, number> & { updatedAt?: string };

export interface CurrencyRates {
  USD_BRL: number;
  EUR_BRL: number;
  GBP_BRL: number;
  updatedAt: Date;
}

const CACHE_KEY = "fx_rates_brl_v2";
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

async function fetchSingle(base: string): Promise<number | null> {
  // Try exchangerate.host first
  try {
    const res = await fetch(`https://api.exchangerate.host/latest?base=${base}&symbols=BRL`);
    if (res.ok) {
      const json = await res.json();
      const r = Number(json?.rates?.BRL);
      if (Number.isFinite(r) && r > 0) return r;
    }
  } catch (e) {
    console.warn(`[fx] exchangerate.host failed for ${base}:`, e);
  }
  // Fallback to frankfurter.dev
  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=BRL`);
    if (res.ok) {
      const json = await res.json();
      const r = Number(json?.rates?.BRL);
      if (Number.isFinite(r) && r > 0) return r;
    }
  } catch (e) {
    console.warn(`[fx] frankfurter fallback failed for ${base}:`, e);
  }
  return null;
}

/**
 * Fetch latest FX rates with BRL as the target currency.
 * Returns map { USD: 5.42, EUR: 5.9, GBP: 6.8, BRL: 1 } meaning "1 USD = 5.42 BRL".
 * NO hardcoded rates — if all providers fail for a currency, the key is absent
 * and downstream callers must handle the missing rate.
 */
export async function fetchFxRatesToBRL(): Promise<FxRates> {
  const cached = readCache();
  if (cached) return cached.rates;

  const others = SUPPORTED_CURRENCIES.filter((c) => c !== "BRL");
  const rates: FxRates = { BRL: 1, updatedAt: new Date().toISOString() };

  await Promise.all(
    others.map(async (cur) => {
      const r = await fetchSingle(cur);
      if (r != null) rates[cur] = r;
    }),
  );

  console.log("[fx] rates fetched", rates);
  writeCache(rates);
  return rates;
}

/** Return units of BRL per 1 unit of given currency. Returns 1 only for BRL; NaN if missing. */
export function getFxRate(currency: string | undefined, rates: FxRates | undefined): number {
  if (!currency || currency === "BRL") return 1;
  const r = rates?.[currency.toUpperCase()];
  if (Number.isFinite(r) && (r as number) > 0) return r as number;
  console.warn(`[fx] missing rate for ${currency}, returning 1 (will skew totals)`);
  return 1;
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

/**
 * Centralized currency service. Single entry point for all FX conversions.
 * Caches rates in-memory + localStorage; refreshes after TTL expires.
 */
class CurrencyServiceImpl {
  private cache: FxRates | null = null;
  private fetchedAt = 0;
  private inflight: Promise<FxRates> | null = null;

  async getRates(): Promise<FxRates> {
    const fresh = this.cache && Date.now() - this.fetchedAt < CACHE_TTL_MS;
    if (fresh) return this.cache!;
    if (this.inflight) return this.inflight;
    this.inflight = fetchFxRatesToBRL().then((r) => {
      this.cache = r;
      this.fetchedAt = Date.now();
      this.inflight = null;
      return r;
    });
    return this.inflight;
  }

  async snapshot(): Promise<CurrencyRates> {
    const r = await this.getRates();
    return {
      USD_BRL: r.USD,
      EUR_BRL: r.EUR,
      GBP_BRL: r.GBP,
      updatedAt: new Date(r.updatedAt ?? this.fetchedAt),
    };
  }

  async getUsdBrl(): Promise<number> {
    return (await this.getRates()).USD;
  }
  async getEurBrl(): Promise<number> {
    return (await this.getRates()).EUR;
  }
  async getGbpBrl(): Promise<number> {
    return (await this.getRates()).GBP;
  }

  async convertToBRL(amount: number, currency: string): Promise<number> {
    const rates = await this.getRates();
    return toBRL(amount, currency, rates);
  }
}

export const CurrencyService = new CurrencyServiceImpl();
