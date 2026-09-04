import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RadarStock {
  ticker: string;
  currentPrice: number;
  ath: number;
  athDate: string;
  distanceFromAth: number;
  potentialReturn: number;
  annualizedReturn: number;
  momentum: boolean;
  ma200: number;
  relativeStrength: number;
  revenueGrowth: number | null;
  probability30: number;
  score: number;
  volatility: number;
  avgVolume: number;
  sparklineData: number[];
  stockReturn12m: number;
  qualityBadge: string;
  opportunitySignal: string;
}

export interface RadarResponse {
  success: boolean;
  data: RadarStock[];
  allData: RadarStock[];
  sp500Return12m: number;
  updatedAt: string;
  totalAnalyzed: number;
  totalPassed: number;
  error?: string;
}

async function fetchChartData(symbol: string): Promise<any> {
  const trySymbols = [symbol];
  
  if (symbol.includes(".")) {
    trySymbols.push(symbol.replace(".", "-"));
  }
  if (symbol.endsWith("-USD")) {
    trySymbols.push(symbol.replace("-USD", ""));
  }
  if (!symbol.includes("-") && !symbol.includes(".")) {
    trySymbols.push(`${symbol}-USD`);
    trySymbols.push(`${symbol}.SA`);
  }

  for (const sym of Array.from(new Set(trySymbols))) {
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=2y&interval=1d&includePrePost=false`;

    const proxies = [
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];

    for (const proxyFn of proxies) {
      try {
        const proxyUrl = proxyFn(targetUrl);
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const data = await res.json();
          const chart = data?.chart?.result?.[0];
          if (chart) {
            const closes = chart?.indicators?.quote?.[0]?.close || [];
            const price = chart?.meta?.regularMarketPrice || closes[closes.length - 1];
            if (price > 0) {
              return chart;
            }
          }
        }
      } catch (err) {
        console.warn(`Proxy chart fetch failed for ${sym}:`, err);
      }
    }

    // Fallback: call Supabase edge function 'asset-quote'
    try {
      const { data, error } = await supabase.functions.invoke("asset-quote", {
        body: { action: "quote", symbol: sym, provider: "yahoo" },
      });
      if (!error && data?.result?.price > 0) {
        const p = Number(data.result.price);
        return {
          meta: {
            symbol: sym,
            regularMarketPrice: p,
            currency: data.result.currency || "USD",
          },
          timestamp: [Math.floor(Date.now() / 1000)],
          indicators: {
            quote: [{ close: [p], volume: [0] }],
          },
        };
      }
    } catch (err) {
      console.warn(`Asset quote edge function fallback failed for ${sym}:`, err);
    }
  }

  return null;
}

function analyzeStockData(chart: any, sp500Return12m: number): RadarStock | null {
  if (!chart) return null;

  const meta = chart.meta || {};
  const timestamps: number[] = chart.timestamp || [];
  const quotes = chart.indicators?.quote?.[0] || {};
  const closes: (number | null)[] = quotes.close || [];
  const volumes: (number | null)[] = quotes.volume || [];

  const validCloses: number[] = [];
  const validTimestamps: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] != null && closes[i]! > 0) {
      validCloses.push(closes[i]!);
      validTimestamps.push(timestamps[i] || Math.floor(Date.now() / 1000));
    }
  }

  const currentPrice = meta.regularMarketPrice || (validCloses.length > 0 ? validCloses[validCloses.length - 1] : 0);
  if (!currentPrice || currentPrice <= 0 || !Number.isFinite(currentPrice)) return null;

  if (validCloses.length === 0) {
    validCloses.push(currentPrice);
    validTimestamps.push(Math.floor(Date.now() / 1000));
  }

  let ath = 0;
  let athIdx = 0;
  for (let i = 0; i < validCloses.length; i++) {
    if (validCloses[i] > ath) {
      ath = validCloses[i];
      athIdx = i;
    }
  }

  if (currentPrice > ath) {
    ath = currentPrice;
    athIdx = validCloses.length - 1;
  }

  const athDate = validTimestamps[athIdx] ? new Date(validTimestamps[athIdx] * 1000) : new Date();
  const distanceFromAth = ath > 0 ? (ath - currentPrice) / ath : 0;
  const potentialReturn = currentPrice > 0 ? (ath / currentPrice) - 1 : 0;
  const annualizedReturn = potentialReturn / 2;

  const maWindow = Math.min(200, validCloses.length);
  const lastN = validCloses.slice(-maWindow);
  const ma200 = lastN.length > 0 ? lastN.reduce((a, b) => a + b, 0) / lastN.length : currentPrice;
  const momentum = currentPrice >= ma200;

  const lookback = Math.min(252, validCloses.length - 1);
  const idx12m = Math.max(0, validCloses.length - 1 - lookback);
  const price12mAgo = validCloses[idx12m] || validCloses[0];
  const stockReturn12m = price12mAgo > 0 ? (currentPrice - price12mAgo) / price12mAgo : 0;

  const relativeStrength = (sp500Return12m && sp500Return12m !== 0 && Number.isFinite(sp500Return12m)) 
    ? stockReturn12m / sp500Return12m 
    : 0;

  const logReturns: number[] = [];
  for (let i = 1; i < validCloses.length; i++) {
    if (validCloses[i] > 0 && validCloses[i - 1] > 0) {
      logReturns.push(Math.log(validCloses[i] / validCloses[i - 1]));
    }
  }
  const avgLogReturn = logReturns.length > 0 ? logReturns.reduce((a, b) => a + b, 0) / logReturns.length : 0;
  const variance = logReturns.length > 0 ? logReturns.reduce((a, b) => a + (b - avgLogReturn) ** 2, 0) / logReturns.length : 0;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);

  const recentVols = volumes.filter(v => v != null && v! > 0).slice(-60) as number[];
  const avgVolume = recentVols.length > 0 ? recentVols.reduce((a, b) => a + b, 0) / recentVols.length : 0;

  const rawProb = volatility > 0 ? (potentialReturn / volatility) * 50 : 0;
  const probability30 = Math.min(100, Math.max(0, Number.isFinite(rawProb) ? rawProb : 0));

  const potReturnFactor = Math.min(1, potentialReturn / 0.5);
  const momentumFactor = momentum ? 1 : 0.3;
  const rsFactor = relativeStrength > 1 ? Math.min(1, (relativeStrength - 0.5) / 1.5) : Math.max(0, relativeStrength / 2);
  const rawScore = potReturnFactor * 30 + momentumFactor * 20 + rsFactor * 20 + 0.6 * 15 + 10 + 5;
  const score = Math.round(Math.min(100, Math.max(0, Number.isFinite(rawScore) ? rawScore : 50)));

  const last252 = validCloses.slice(-252);
  const sparkline: number[] = [];
  const step = Math.max(1, Math.floor(last252.length / 50));
  for (let i = 0; i < last252.length; i += step) {
    sparkline.push(last252[i]);
  }
  if (sparkline.length === 0) {
    sparkline.push(currentPrice, currentPrice);
  }

  let qualityBadge = 'Fraco';
  if (score >= 90) qualityBadge = 'Excelente';
  else if (score >= 80) qualityBadge = 'Forte';
  else if (score >= 70) qualityBadge = 'Moderado';

  let opportunitySignal = 'Observação';
  if (score >= 90) opportunitySignal = 'Oportunidade Forte';
  else if (score >= 80) opportunitySignal = 'Boa Assimetria';

  return {
    ticker: meta.symbol || meta.name || 'UNKNOWN',
    currentPrice,
    ath,
    athDate: athDate.toISOString(),
    distanceFromAth: Number.isFinite(distanceFromAth) ? distanceFromAth : 0,
    potentialReturn: Number.isFinite(potentialReturn) ? potentialReturn : 0,
    annualizedReturn: Number.isFinite(annualizedReturn) ? annualizedReturn : 0,
    momentum,
    ma200: Number.isFinite(ma200) ? ma200 : currentPrice,
    relativeStrength: Number.isFinite(relativeStrength) ? relativeStrength : 0,
    revenueGrowth: null,
    probability30,
    score,
    volatility: Number.isFinite(volatility) ? volatility : 0,
    avgVolume: Number.isFinite(avgVolume) ? avgVolume : 0,
    sparklineData: sparkline,
    stockReturn12m: Number.isFinite(stockReturn12m) ? stockReturn12m : 0,
    qualityBadge,
    opportunitySignal,
  };
}

async function fetchRadar(tab: string, customTickers?: string[]): Promise<RadarResponse> {
  if (tab === "my_portfolio" || (customTickers && customTickers.length > 0)) {
    const tickersToAnalyze = customTickers || [];
    if (tickersToAnalyze.length === 0) {
      return {
        success: true,
        data: [],
        allData: [],
        sp500Return12m: 0,
        updatedAt: new Date().toISOString(),
        totalAnalyzed: 0,
        totalPassed: 0,
      };
    }

    try {
      const sp500Chart = await fetchChartData('^GSPC');
      let sp500Return12m = 0;
      if (sp500Chart) {
        const spCloses = (sp500Chart.indicators?.quote?.[0]?.close || []).filter((c: any) => c != null && c > 0);
        if (spCloses.length >= 252) {
          const spNow = spCloses[spCloses.length - 1];
          const spYearAgo = spCloses[spCloses.length - 252];
          sp500Return12m = (spNow - spYearAgo) / spYearAgo;
        }
      }

      const results: RadarStock[] = [];
      await Promise.all(
        tickersToAnalyze.map(async (ticker) => {
          const chart = await fetchChartData(ticker);
          if (chart) {
            const analysis = analyzeStockData(chart, sp500Return12m);
            if (analysis && analysis.currentPrice > 0 && analysis.ath > 0) {
              results.push(analysis);
            }
          }
        })
      );

      // Strictly filter out any items with 0 price ("O que tiver zerado vc não traz")
      const validResults = results.filter(s => s.currentPrice > 0 && s.ath > 0);

      validResults.sort((a, b) => b.score - a.score || b.potentialReturn - a.potentialReturn);

      return {
        success: true,
        data: validResults,
        allData: validResults,
        sp500Return12m,
        updatedAt: new Date().toISOString(),
        totalAnalyzed: tickersToAnalyze.length,
        totalPassed: validResults.length,
      };
    } catch (err) {
      console.warn("Client side portfolio radar fetch failed:", err);
      return {
        success: true,
        data: [],
        allData: [],
        sp500Return12m: 0,
        updatedAt: new Date().toISOString(),
        totalAnalyzed: tickersToAnalyze.length,
        totalPassed: 0,
        error: String(err),
      };
    }
  }

  const { data, error } = await supabase.functions.invoke('radar-assimetria', {
    body: { tab, customTickers },
  });
  if (error) throw new Error(error.message || 'Failed to invoke radar function');
  if (!data?.success) throw new Error(data?.error || 'Failed to fetch radar data');
  return data;
}

export function useRadarData(tab: string, customTickers?: string[]) {
  return useQuery({
    queryKey: ['radar', tab, customTickers],
    queryFn: () => fetchRadar(tab, customTickers),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
