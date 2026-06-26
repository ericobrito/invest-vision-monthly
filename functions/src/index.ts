import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import yahooFinance from "yahoo-finance2";
import fetch from "node-fetch";

admin.initializeApp();
const db = admin.firestore();

interface RequestBody {
  symbols?: string[];
}

export const getPortfolioMarketData = onRequest(async (req, res) => {
  // CORS configuration
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    let symbols: string[] = [];
    if (req.method === "POST") {
      const body = (req.body || {}) as RequestBody;
      symbols = Array.isArray(body.symbols) ? body.symbols : [];
    } else {
      const querySymbols = req.query.symbols;
      if (typeof querySymbols === "string") {
        symbols = querySymbols.split(",").map(s => s.trim()).filter(Boolean);
      }
    }

    const now = Date.now();
    const cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

    // 1. Fetch USD-BRL (AwesomeAPI)
    let usdbrl = 0;
    try {
      const usdRef = db.collection("market_cache").doc("USD-BRL");
      const usdDoc = await usdRef.get();
      let useCachedUsd = false;

      if (usdDoc.exists) {
        const cachedData = usdDoc.data();
        const updatedAt = cachedData?.updatedAt;
        let updatedAtMs = 0;
        if (updatedAt instanceof admin.firestore.Timestamp) {
          updatedAtMs = updatedAt.toMillis();
        } else if (typeof updatedAt === "number") {
          updatedAtMs = updatedAt;
        } else if (updatedAt instanceof Date) {
          updatedAtMs = updatedAt.getTime();
        }

        if (now - updatedAtMs < cacheTTL) {
          usdbrl = Number(cachedData?.price);
          useCachedUsd = true;
        }
      }

      if (!useCachedUsd || !Number.isFinite(usdbrl)) {
        const fxRes = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
        if (fxRes.ok) {
          const fxData: any = await fxRes.json();
          usdbrl = Number(fxData?.USDBRL?.bid || fxData?.USDBRL?.ask);
          if (Number.isFinite(usdbrl) && usdbrl > 0) {
            console.log({
              usdbrl,
              source: 'AwesomeAPI'
            });
            await usdRef.set({
              symbol: "USD-BRL",
              price: usdbrl,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
    } catch (e) {
      console.error("Error fetching or caching USD-BRL:", e);
    }

    // 2. Fetch quotes (Yahoo Finance)
    const quotes: Record<string, number> = {};
    if (symbols.length > 0) {
      await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const sym = symbol.toUpperCase();
            const symbolRef = db.collection("market_cache").doc(sym);
            const symbolDoc = await symbolRef.get();
            let useCachedPrice = false;
            let price = 0;

            if (symbolDoc.exists) {
              const cachedData = symbolDoc.data();
              const updatedAt = cachedData?.updatedAt;
              let updatedAtMs = 0;
              if (updatedAt instanceof admin.firestore.Timestamp) {
                updatedAtMs = updatedAt.toMillis();
              } else if (typeof updatedAt === "number") {
                updatedAtMs = updatedAt;
              } else if (updatedAt instanceof Date) {
                updatedAtMs = updatedAt.getTime();
              }

              if (now - updatedAtMs < cacheTTL) {
                price = Number(cachedData?.price);
                useCachedPrice = true;
              }
            }

            if (!useCachedPrice || !Number.isFinite(price) || price === 0) {
              const quote = await yahooFinance.quote(sym);
              price = Number(quote?.regularMarketPrice);
              if (Number.isFinite(price) && price > 0) {
                console.log({
                  symbol: sym,
                  marketPrice: price,
                  source: 'Yahoo Finance'
                });
                await symbolRef.set({
                  symbol: sym,
                  price,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            }

            if (Number.isFinite(price) && price > 0) {
              quotes[sym] = price;
            }
          } catch (e) {
            console.error(`Error fetching/caching quote for ${symbol}:`, e);
          }
        })
      );
    }

    res.status(200).json({
      usdbrl,
      quotes
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});
