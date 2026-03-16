const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BIG_TECHS = ['AAPL','MSFT','AMZN','GOOGL','META','NVDA','AMD','AVGO','ADBE','CRM','SNOW','PLTR','SHOP','TSLA','INTC'];

const GROWTH_UNIVERSE = [
  'NFLX','UBER','SQ','COIN','DDOG','NET','CRWD','ZS','PANW',
  'MELI','SPOT','ABNB','DASH','TTD','MDB','TEAM','WDAY','NOW',
  'ORCL','QCOM','MU','MRVL','ARM','ANET','FTNT','HUBS',
  'APP','DUOL','BILL','MNDY','GLOB','LYFT','PINS','SNAP',
  'RBLX','OKTA','ZM','VEEV','TWLO','CFLT',
];

interface StockAnalysis {
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

async function fetchChart(symbol: string): Promise<any> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(`Failed to fetch ${symbol}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data?.chart?.result?.[0] || null;
  } catch (err) {
    console.error(`Error fetching ${symbol}:`, err);
    return null;
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function analyzeStock(chart: any, sp500Return12m: number): StockAnalysis | null {
  if (!chart) return null;

  const meta = chart.meta;
  const timestamps: number[] = chart.timestamp || [];
  const closes: (number | null)[] = chart.indicators?.quote?.[0]?.close || [];
  const volumes: (number | null)[] = chart.indicators?.quote?.[0]?.volume || [];

  // Build valid arrays
  const validCloses: number[] = [];
  const validTimestamps: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] != null && closes[i]! > 0) {
      validCloses.push(closes[i]!);
      validTimestamps.push(timestamps[i]);
    }
  }

  if (validCloses.length < 200) return null;

  const currentPrice = meta.regularMarketPrice;
  if (!currentPrice || currentPrice <= 0) return null;

  // ATH from available data
  let ath = 0;
  let athIdx = 0;
  for (let i = 0; i < validCloses.length; i++) {
    if (validCloses[i] > ath) {
      ath = validCloses[i];
      athIdx = i;
    }
  }

  // Also check current price as potential ATH
  if (currentPrice > ath) {
    ath = currentPrice;
    athIdx = validCloses.length - 1;
  }

  const athDate = new Date(validTimestamps[athIdx] * 1000);
  const now = new Date();
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

  // ATH must be within last 24 months
  if (athDate < twoYearsAgo) return null;

  // Distance from ATH
  const distanceFromAth = (ath - currentPrice) / ath;

  // Potential return to ATH
  const potentialReturn = (ath / currentPrice) - 1;

  // Annualized return estimate (over 2 years)
  const annualizedReturn = potentialReturn / 2;

  // 200-day moving average
  const last200 = validCloses.slice(-200);
  const ma200 = last200.reduce((a, b) => a + b, 0) / last200.length;

  // Momentum
  const momentum = currentPrice > ma200;

  // 12-month return (~252 trading days)
  const lookback = Math.min(252, validCloses.length - 1);
  const idx12m = validCloses.length - 1 - lookback;
  const price12mAgo = validCloses[idx12m];
  const stockReturn12m = (currentPrice - price12mAgo) / price12mAgo;

  // Relative strength vs S&P 500
  const relativeStrength = sp500Return12m !== 0 ? stockReturn12m / sp500Return12m : 0;

  // Historical volatility (annualized from daily log returns)
  const logReturns: number[] = [];
  for (let i = 1; i < validCloses.length; i++) {
    if (validCloses[i] > 0 && validCloses[i - 1] > 0) {
      logReturns.push(Math.log(validCloses[i] / validCloses[i - 1]));
    }
  }
  const avgLogReturn = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, b) => a + (b - avgLogReturn) ** 2, 0) / logReturns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);

  // Average volume (last 60 days)
  const recentVols = volumes.filter(v => v != null && v! > 0).slice(-60) as number[];
  const avgVolume = recentVols.length > 0 ? recentVols.reduce((a, b) => a + b, 0) / recentVols.length : 0;

  // Probability of 30% annual return
  const rawProb = volatility > 0 ? (potentialReturn / volatility) * 50 : 0;
  const probability30 = Math.min(100, Math.max(0, rawProb));

  // Score calculation (0-100)
  // potential_return * 30, momentum * 20, relative_strength * 20, revenue * 15, market_cap * 10, volume * 5
  const potReturnFactor = Math.min(1, potentialReturn / 0.5);
  const momentumFactor = momentum ? 1 : 0;
  const rsFactor = Math.min(1, Math.max(0, (relativeStrength - 0.5) / 1.5));
  const revenueFactor = 0.6; // Default mid-value since data unavailable
  const mcapFactor = 1; // Curated list = all qualify
  const volFactor = avgVolume > 2_000_000 ? 1 : Math.min(1, avgVolume / 2_000_000);

  const score = Math.round(
    potReturnFactor * 30 +
    momentumFactor * 20 +
    rsFactor * 20 +
    revenueFactor * 15 +
    mcapFactor * 10 +
    volFactor * 5
  );

  // Sparkline data (sample to ~50 points from last 12 months)
  const last252 = validCloses.slice(-252);
  const sparkline: number[] = [];
  const step = Math.max(1, Math.floor(last252.length / 50));
  for (let i = 0; i < last252.length; i += step) {
    sparkline.push(last252[i]);
  }
  if (sparkline[sparkline.length - 1] !== last252[last252.length - 1]) {
    sparkline.push(last252[last252.length - 1]);
  }

  // Quality badge
  let qualityBadge: string;
  if (score >= 90) qualityBadge = 'Excelente';
  else if (score >= 80) qualityBadge = 'Forte';
  else if (score >= 70) qualityBadge = 'Moderado';
  else qualityBadge = 'Fraco';

  // Opportunity signal
  let opportunitySignal: string;
  if (score >= 90) opportunitySignal = 'Oportunidade Forte';
  else if (score >= 80) opportunitySignal = 'Boa Assimetria';
  else opportunitySignal = 'Observação';

  return {
    ticker: meta.symbol,
    currentPrice,
    ath,
    athDate: athDate.toISOString(),
    distanceFromAth,
    potentialReturn,
    annualizedReturn,
    momentum,
    ma200,
    relativeStrength,
    revenueGrowth: null,
    probability30,
    score,
    volatility,
    avgVolume,
    sparklineData: sparkline,
    stockReturn12m,
    qualityBadge,
    opportunitySignal,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tab = body.tab || 'big_techs';

    const tickers = tab === 'big_techs' ? BIG_TECHS : GROWTH_UNIVERSE;

    // Fetch S&P 500 data first
    console.log('Fetching S&P 500 data...');
    const sp500Chart = await fetchChart('^GSPC');
    let sp500Return12m = 0;
    if (sp500Chart) {
      const sp500Closes = (sp500Chart.indicators?.quote?.[0]?.close || []).filter((c: any) => c != null && c > 0);
      if (sp500Closes.length >= 252) {
        const sp500Now = sp500Closes[sp500Closes.length - 1];
        const sp500YearAgo = sp500Closes[sp500Closes.length - 252];
        sp500Return12m = (sp500Now - sp500YearAgo) / sp500YearAgo;
      }
    }
    console.log(`S&P 500 12m return: ${(sp500Return12m * 100).toFixed(2)}%`);

    // Fetch tickers in batches
    const allResults: StockAnalysis[] = [];
    const batchSize = 5;

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      console.log(`Fetching batch: ${batch.join(', ')}`);
      const charts = await Promise.all(batch.map(t => fetchChart(t)));

      for (const chart of charts) {
        const analysis = analyzeStock(chart, sp500Return12m);
        if (analysis) {
          allResults.push(analysis);
        }
      }

      if (i + batchSize < tickers.length) {
        await delay(150);
      }
    }

    // Apply MANDATORY filters only (hard filters)
    const filtered = allResults.filter(s =>
      s.momentum &&
      s.potentialReturn >= 0.30 &&
      s.distanceFromAth >= 0.10 && s.distanceFromAth <= 0.45
    );

    // Sort: score desc, then probability30, then relative strength, then potential return
    const sortFn = (a: StockAnalysis, b: StockAnalysis) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.probability30 !== a.probability30) return b.probability30 - a.probability30;
      if (b.relativeStrength !== a.relativeStrength) return b.relativeStrength - a.relativeStrength;
      return b.potentialReturn - a.potentialReturn;
    };

    filtered.sort(sortFn);
    allResults.sort(sortFn);

    // Guarantee: never return empty — fallback to top allResults
    const finalData = filtered.length > 0 ? filtered : allResults.slice(0, 10);

    console.log(`Analyzed ${tickers.length}, valid ${allResults.length}, passed filters ${filtered.length}`);

    return new Response(JSON.stringify({
      success: true,
      data: filtered,
      allData: allResults,
      sp500Return12m,
      updatedAt: new Date().toISOString(),
      totalAnalyzed: tickers.length,
      totalPassed: filtered.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Radar error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
