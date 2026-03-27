import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CSV_URL = "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

const BENCHMARKS: Record<string, number> = {
  IPCA: 5.5,
  PREFIXADO: 10.5,
};

function classifyType(name: string): string | null {
  if (name.startsWith("Tesouro Selic")) return "SELIC";
  if (name.startsWith("Tesouro IPCA+") || name.startsWith("Tesouro IPCA+ com Juros Semestrais")) return "IPCA";
  if (name.startsWith("Tesouro Prefixado")) return "PREFIXADO";
  if (name.startsWith("Tesouro Renda+") || name.startsWith("Tesouro Educa+") || name.startsWith("Tesouro IGPM+")) return null;
  return null;
}

function parseDate(ddmmyyyy: string): Date {
  const [d, m, y] = ddmmyyyy.split("/");
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function getStatus(score: number): { label: string; emoji: string } {
  if (score >= 1.20) return { label: "Strong Buy", emoji: "🟢" };
  if (score >= 1.05) return { label: "Buy", emoji: "🟡" };
  if (score >= 0.90) return { label: "Neutral", emoji: "⚪" };
  return { label: "Sell / Avoid", emoji: "🔴" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const res = await fetch(CSV_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      throw new Error(`Tesouro API returned ${res.status}`);
    }

    const text = await res.text();
    const lines = text.split("\n").filter(l => l.trim());
    
    // Find latest "Data Base" across ALL lines
    let latestDateStr = "";
    let latestDateMs = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      if (cols.length >= 7) {
        const dataBase = cols[2];
        const parsed = parseDate(dataBase);
        const ms = parsed.getTime();
        if (ms > latestDateMs) {
          latestDateMs = ms;
          latestDateStr = dataBase;
        }
      }
    }

    // Collect all entries for the latest date
    const latestEntries: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      if (cols.length >= 7 && cols[2] === latestDateStr) {
        latestEntries.push(lines[i]);
      }
    }

    const results: any[] = [];

    for (const line of latestEntries) {
      const cols = line.split(";");
      const name = cols[0];
      const maturityDateStr = cols[1];
      const buyRate = parseFloat(cols[3].replace(",", "."));
      const sellRate = parseFloat(cols[4].replace(",", "."));
      const priceBuy = parseFloat(cols[5].replace(",", "."));

      if (isNaN(buyRate) || buyRate === 0) continue;

      const type = classifyType(name);
      if (!type || type === "SELIC") continue;

      const benchmark = BENCHMARKS[type];
      const score = parseFloat((buyRate / benchmark).toFixed(4));
      const status = getStatus(score);

      const maturityDate = parseDate(maturityDateStr);
      const now = new Date();
      const maturityYears = parseFloat(((maturityDate.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(2));

      const fullName = `${name} ${maturityDateStr.split("/")[2]}`;

      results.push({
        name: fullName,
        type,
        maturityDate: maturityDate.toISOString(),
        maturityYears,
        buyRate,
        sellRate,
        price: priceBuy,
        score,
        statusLabel: status.label,
        statusEmoji: status.emoji,
      });
    }

    // Sort: highest score first, then highest yield
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.buyRate - a.buyRate;
    });

    const parsedLatest = parseDate(latestDateStr);

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        updatedAt: parsedLatest.toISOString(),
        total: results.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
