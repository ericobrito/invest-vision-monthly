import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TESOURO_API = "https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybonds.json";

const BENCHMARKS: Record<string, number> = {
  IPCA: 5.5,
  PREFIXADO: 10.5,
};

interface TesouroBond {
  nm: string;
  mtrtyDt: string;
  indxNm: string;
  anulInvstmtRate: number;
  anulRedRate: number;
  untrInvstmtVal: number;
  isSttmnMsg: boolean;
}

function classifyType(indexName: string): string | null {
  if (indexName.includes("IPCA")) return "IPCA";
  if (indexName.includes("Prefixado") || indexName.includes("PRE")) return "PREFIXADO";
  if (indexName.includes("Selic") || indexName.includes("SELIC")) return "SELIC";
  return null;
}

function classifyTypeFromName(name: string): string | null {
  if (name.includes("IPCA")) return "IPCA";
  if (name.includes("Prefixado") || name.includes("Pré")) return "PREFIXADO";
  if (name.includes("Selic")) return "SELIC";
  return null;
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
    const res = await fetch(TESOURO_API, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Tesouro API returned ${res.status}`);
    }

    const json = await res.json();
    const bonds: any[] = json?.response?.TrsrBdTradgList ?? [];

    const results = bonds
      .map((b: any) => {
        const bond = b.TrsrBd;
        if (!bond) return null;

        const name: string = bond.nm ?? "";
        const maturityDate: string = bond.mtrtyDt ?? "";
        const indexName: string = bond.indxNm ?? name;
        const buyRate: number = bond.anulInvstmtRate ?? 0;
        const sellRate: number = bond.anulRedRate ?? 0;
        const price: number = bond.untrInvstmtVal ?? 0;
        const unavailable: boolean = bond.isSttmnMsg ?? false;

        if (unavailable || buyRate === 0) return null;

        let type = classifyType(indexName);
        if (!type) type = classifyTypeFromName(name);
        if (!type || type === "SELIC") return null;

        const benchmark = BENCHMARKS[type];
        const score = parseFloat((buyRate / benchmark).toFixed(4));
        const status = getStatus(score);

        const maturityMs = new Date(maturityDate).getTime();
        const nowMs = Date.now();
        const maturityYears = parseFloat(((maturityMs - nowMs) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(2));

        return {
          name,
          type,
          maturityDate,
          maturityYears,
          buyRate,
          sellRate,
          price,
          score,
          statusLabel: status.label,
          statusEmoji: status.emoji,
        };
      })
      .filter(Boolean);

    results.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.buyRate - a.buyRate;
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        updatedAt: new Date().toISOString(),
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
