import { supabase } from "@/integrations/supabase/client";

const FIREBASE_FUNCTION_URL = import.meta.env.VITE_FIREBASE_FUNCTION_URL || "";

export interface QuoteDetails {
  price: number;
  currency?: string;
  name?: string;
}

export class MarketDataService {
  /**
   * Internal helper to retrieve the USD-BRL FX rate and quotes for a set of symbols.
   * If the Firebase Cloud Function is configured, it calls it. Otherwise, it uses the fallback.
   */
  private static async fetchFromBackend(symbols: string[]): Promise<{ usdbrl: number; quotes: Record<string, number> }> {
    if (FIREBASE_FUNCTION_URL) {
      try {
        const response = await fetch(FIREBASE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ symbols }),
        });

        if (response.ok) {
          const data = await response.json();
          if (typeof data.usdbrl === "number" && data.quotes) {
            // Log according to spec (since the function returned, log on client console too)
            console.log({
              usdbrl: data.usdbrl,
              source: 'AwesomeAPI'
            });

            for (const sym of Object.keys(data.quotes)) {
              console.log({
                symbol: sym,
                marketPrice: data.quotes[sym],
                source: 'Yahoo Finance'
              });
            }

            return {
              usdbrl: data.usdbrl,
              quotes: data.quotes
            };
          }
        }
      } catch (err) {
        console.warn("Failed to call Firebase Function getPortfolioMarketData, using client-side fallback:", err);
      }
    }

    // Fallback: Fetch directly from AwesomeAPI and Supabase edge function
    return this.fetchFallback(symbols);
  }

  private static async fetchFallback(symbols: string[]): Promise<{ usdbrl: number; quotes: Record<string, number> }> {
    const quotes: Record<string, number> = {};
    let usdbrl = 0;

    // Fetch USD-BRL from AwesomeAPI
    try {
      const fxRes = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
      if (fxRes.ok) {
        const fxData = await fxRes.json();
        usdbrl = Number(fxData?.USDBRL?.bid || fxData?.USDBRL?.ask);
        if (Number.isFinite(usdbrl) && usdbrl > 0) {
          console.log({
            usdbrl,
            source: 'AwesomeAPI'
          });
        }
      }
    } catch (e) {
      console.error("Fallback error fetching USD-BRL:", e);
    }

    // Fetch quotes sequentially/in parallel using Supabase edge function
    if (symbols.length > 0) {
      await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const { data, error } = await supabase.functions.invoke("asset-quote", {
              body: { action: "quote", symbol, provider: "yahoo" },
            });
            if (error) throw error;
            const price = Number(data?.result?.price);
            if (Number.isFinite(price) && price > 0) {
              quotes[symbol.toUpperCase()] = price;
              console.log({
                symbol: symbol.toUpperCase(),
                marketPrice: price,
                source: 'Yahoo Finance'
              });
            }
          } catch (e) {
            console.error(`Fallback error fetching quote for ${symbol}:`, e);
          }
        })
      );
    }

    return { usdbrl, quotes };
  }

  /**
   * Fetches real-time price and details (currency, name) for a single symbol.
   */
  static async getQuoteDetails(symbol: string, provider: string = "auto"): Promise<QuoteDetails | null> {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return null;
    try {
      const { data, error } = await supabase.functions.invoke("asset-quote", {
        body: { action: "quote", symbol: sym, provider },
      });
      if (error) throw error;
      const result = data?.result;
      if (result) {
        return {
          price: Number(result.price) || 0,
          currency: result.currency,
          name: result.name,
        };
      }
    } catch (e) {
      console.error(`Error fetching quote details for ${sym}:`, e);
    }
    return null;
  }

  /**
   * Fetches real-time price for a single symbol.
   */
  static async getQuote(symbol: string): Promise<number> {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return 0;
    const res = await this.fetchFromBackend([sym]);
    return res.quotes[sym] || 0;
  }

  /**
   * Fetches real-time prices for multiple symbols.
   */
  static async getMultipleQuotes(symbols: string[]): Promise<Record<string, number>> {
    const uniqueSymbols = Array.from(new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean)));
    if (uniqueSymbols.length === 0) return {};
    const res = await this.fetchFromBackend(uniqueSymbols);
    return res.quotes;
  }

  /**
   * Fetches USD-BRL exchange rate.
   */
  static async getUsdBrl(): Promise<number> {
    const res = await this.fetchFromBackend([]);
    return res.usdbrl;
  }
}
