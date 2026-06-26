import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface QuoteResult {
  symbol: string;
  name?: string;
  price: number;
  currency: string;
  changePct?: number;
  provider: string;
}

async function fetchBrapi(symbol: string): Promise<QuoteResult | null> {
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(symbol)}?range=1d`);
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.results?.[0];
    if (!r?.regularMarketPrice) return null;
    return {
      symbol: r.symbol,
      name: r.longName || r.shortName,
      price: Number(r.regularMarketPrice),
      currency: 'BRL',
      changePct: r.regularMarketChangePercent != null ? Number(r.regularMarketChangePercent) : undefined,
      provider: 'brapi',
    };
  } catch {
    return null;
  }
}

async function fetchCoingecko(symbol: string): Promise<QuoteResult | null> {
  try {
    const s = symbol.toLowerCase();
    // Try as id first, then resolve by symbol via search
    const map: Record<string, string> = { btc: 'bitcoin', eth: 'ethereum', sol: 'solana', bnb: 'binancecoin', usdt: 'tether', usdc: 'usd-coin', ada: 'cardano', xrp: 'ripple', doge: 'dogecoin' };
    let id = map[s] || s;
    let res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=brl,usd&include_24hr_change=true`);
    let json = await res.json();
    if (!json[id]) {
      // search by symbol
      const search = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`).then(r => r.json()).catch(() => null);
      const hit = search?.coins?.find((c: any) => c.symbol?.toLowerCase() === s) || search?.coins?.[0];
      if (!hit) return null;
      id = hit.id;
      res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=brl,usd&include_24hr_change=true`);
      json = await res.json();
    }
    const entry = json[id];
    if (!entry) return null;
    return {
      symbol: symbol.toUpperCase(),
      name: id,
      price: Number(entry.brl ?? entry.usd),
      currency: entry.brl ? 'BRL' : 'USD',
      changePct: entry.brl_24h_change != null ? Number(entry.brl_24h_change) : undefined,
      provider: 'coingecko',
    };
  } catch {
    return null;
  }
}

async function fetchYahoo(symbol: string): Promise<QuoteResult | null> {
  try {
    const yahooSymbol = symbol.replace('.', '-');
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || symbol,
      price: Number(meta.regularMarketPrice),
      currency: meta.currency || 'USD',
      changePct: undefined,
      provider: 'yahoo',
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'quote') {
      const symbol = String(body.symbol || '').trim();
      const provider = String(body.provider || 'auto').toLowerCase();
      if (!symbol) {
        return new Response(JSON.stringify({ error: 'symbol required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let result: QuoteResult | null = null;
      if (provider === 'brapi') result = await fetchBrapi(symbol);
      else if (provider === 'coingecko' || provider === 'bybit' || provider === 'coinbase' || provider === 'binance') result = await fetchCoingecko(symbol);
      else if (provider === 'yahoo') result = await fetchYahoo(symbol);
      else {
        // auto detect
        result = await fetchBrapi(symbol) || await fetchYahoo(symbol) || await fetchCoingecko(symbol);
      }

      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'search') {
      const query = String(body.query || '').trim();
      if (!query) return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      // Lightweight: try yahoo finance search
      try {
        const r = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const j = await r.json();
        const results = (j?.quotes || []).map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname,
          exchange: q.exchange,
          type: q.quoteType,
        }));
        return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch {
        return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
