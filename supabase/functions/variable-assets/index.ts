// Variable Assets backend: connects to real exchanges, fetches balances,
// resolves prices, and persists positions. NO MOCK DATA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Provider =
  | "binance"
  | "bybit"
  | "coinbase"
  | "kraken"
  | "mercado_bitcoin";

interface NormalizedBalance {
  ticker: string;
  quantity: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// ---------- Crypto helpers ----------
function asBuffer(input: string | Uint8Array): ArrayBuffer {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

async function hmac(
  algo: "SHA-256" | "SHA-512",
  secret: string | Uint8Array,
  message: string,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    asBuffer(secret),
    { name: "HMAC", hash: algo },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", key, asBuffer(message));
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- Adapters ----------
async function fetchBinance(key: string, secret: string): Promise<NormalizedBalance[]> {
  const ts = Date.now();
  const query = `timestamp=${ts}&recvWindow=10000`;
  const sig = toHex(await hmac("SHA-256", secret, query));
  const res = await fetch(
    `https://api.binance.com/api/v3/account?${query}&signature=${sig}`,
    { headers: { "X-MBX-APIKEY": key } },
  );
  if (!res.ok) throw new Error(`Binance: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.balances ?? [])
    .map((b: { asset: string; free: string; locked: string }) => ({
      ticker: b.asset.toUpperCase(),
      quantity: parseFloat(b.free) + parseFloat(b.locked),
    }))
    .filter((b: NormalizedBalance) => b.quantity > 0);
}

async function fetchBybit(key: string, secret: string): Promise<NormalizedBalance[]> {
  const ts = Date.now().toString();
  const recv = "10000";
  const query = "accountType=UNIFIED";
  const payload = ts + key + recv + query;
  const sig = toHex(await hmac("SHA-256", secret, payload));
  const res = await fetch(
    `https://api.bybit.com/v5/account/wallet-balance?${query}`,
    {
      headers: {
        "X-BAPI-API-KEY": key,
        "X-BAPI-TIMESTAMP": ts,
        "X-BAPI-RECV-WINDOW": recv,
        "X-BAPI-SIGN": sig,
      },
    },
  );
  if (!res.ok) throw new Error(`Bybit: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (data.retCode !== 0) throw new Error(`Bybit: ${data.retMsg}`);
  const list = data.result?.list?.[0]?.coin ?? [];
  return list
    .map((c: { coin: string; walletBalance: string }) => ({
      ticker: c.coin.toUpperCase(),
      quantity: parseFloat(c.walletBalance),
    }))
    .filter((b: NormalizedBalance) => b.quantity > 0);
}

async function fetchCoinbase(
  key: string,
  secret: string,
  passphrase: string,
): Promise<NormalizedBalance[]> {
  const ts = (Date.now() / 1000).toString();
  const path = "/accounts";
  const message = ts + "GET" + path;
  const secretBytes = fromBase64(secret);
  const sig = toBase64(await hmac("SHA-256", secretBytes, message));
  const res = await fetch(`https://api.exchange.coinbase.com${path}`, {
    headers: {
      "CB-ACCESS-KEY": key,
      "CB-ACCESS-SIGN": sig,
      "CB-ACCESS-TIMESTAMP": ts,
      "CB-ACCESS-PASSPHRASE": passphrase,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Coinbase: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data ?? [])
    .map((a: { currency: string; balance: string }) => ({
      ticker: a.currency.toUpperCase(),
      quantity: parseFloat(a.balance),
    }))
    .filter((b: NormalizedBalance) => b.quantity > 0);
}

async function fetchKraken(key: string, secret: string): Promise<NormalizedBalance[]> {
  const path = "/0/private/Balance";
  const nonce = Date.now().toString();
  const postData = `nonce=${nonce}`;
  const sha256Buf = await crypto.subtle.digest(
    "SHA-256",
    asBuffer(nonce + postData),
  );
  const pathBytes = new TextEncoder().encode(path);
  const messageBytes = new Uint8Array(pathBytes.length + sha256Buf.byteLength);
  messageBytes.set(pathBytes, 0);
  messageBytes.set(new Uint8Array(sha256Buf), pathBytes.length);
  const secretBytes = fromBase64(secret);
  const k = await crypto.subtle.importKey(
    "raw",
    asBuffer(secretBytes),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", k, asBuffer(messageBytes));
  const sig = toBase64(sigBuf);
  const res = await fetch(`https://api.kraken.com${path}`, {
    method: "POST",
    headers: {
      "API-Key": key,
      "API-Sign": sig,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: postData,
  });
  if (!res.ok) throw new Error(`Kraken: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (data.error?.length) throw new Error(`Kraken: ${data.error.join(", ")}`);
  const result = data.result ?? {};
  return Object.entries(result)
    .map(([ticker, qty]) => ({
      ticker: normalizeKrakenTicker(ticker),
      quantity: parseFloat(qty as string),
    }))
    .filter((b) => b.quantity > 0);
}

function normalizeKrakenTicker(t: string): string {
  let s = t.toUpperCase();
  if (s === "XXBT" || s === "XBT") return "BTC";
  if (s === "XETH") return "ETH";
  if (s === "ZUSD") return "USD";
  if (s === "ZBRL") return "BRL";
  if (s.startsWith("X") && s.length === 4) s = s.slice(1);
  if (s.startsWith("Z") && s.length === 4) s = s.slice(1);
  return s;
}

async function fetchMercadoBitcoin(
  key: string,
  secret: string,
): Promise<NormalizedBalance[]> {
  const auth = await fetch("https://api.mercadobitcoin.net/api/v4/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: key, password: secret }),
  });
  if (!auth.ok) throw new Error(`MB auth: ${auth.status} ${await auth.text()}`);
  const { access_token } = await auth.json();
  const accRes = await fetch("https://api.mercadobitcoin.net/api/v4/accounts", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!accRes.ok) throw new Error(`MB accounts: ${accRes.status}`);
  const accounts = await accRes.json();
  const accountId = accounts?.[0]?.id;
  if (!accountId) return [];
  const balRes = await fetch(
    `https://api.mercadobitcoin.net/api/v4/accounts/${accountId}/balances`,
    { headers: { Authorization: `Bearer ${access_token}` } },
  );
  if (!balRes.ok) throw new Error(`MB balances: ${balRes.status}`);
  const balances = await balRes.json();
  return (balances ?? [])
    .map((b: { symbol: string; total: string }) => ({
      ticker: b.symbol.toUpperCase(),
      quantity: parseFloat(b.total),
    }))
    .filter((b: NormalizedBalance) => b.quantity > 0);
}

function getAdapter(provider: Provider) {
  switch (provider) {
    case "binance": return fetchBinance;
    case "bybit": return fetchBybit;
    case "coinbase": return fetchCoinbase;
    case "kraken": return fetchKraken;
    case "mercado_bitcoin": return fetchMercadoBitcoin;
  }
}

// ---------- Price resolver (USDT pair → BRL via USDT/BRL) ----------
const STABLES = new Set(["USDT", "USDC", "BUSD", "DAI", "TUSD", "FDUSD"]);

let priceCache: { data: Map<string, number>; ts: number } | null = null;
async function getBinancePrices(): Promise<Map<string, number>> {
  if (priceCache && Date.now() - priceCache.ts < 30_000) return priceCache.data;
  const res = await fetch("https://api.binance.com/api/v3/ticker/price");
  if (!res.ok) throw new Error("Binance price feed failed");
  const arr: { symbol: string; price: string }[] = await res.json();
  const map = new Map<string, number>();
  for (const t of arr) map.set(t.symbol, parseFloat(t.price));
  priceCache = { data: map, ts: Date.now() };
  return map;
}

function priceInBRL(
  ticker: string,
  prices: Map<string, number>,
  usdtBrl: number,
): number {
  const t = ticker.toUpperCase();
  if (t === "BRL") return 1;
  if (STABLES.has(t)) return usdtBrl;
  const brlPair = prices.get(`${t}BRL`);
  if (brlPair) return brlPair;
  const usdtPair = prices.get(`${t}USDT`);
  if (usdtPair) return usdtPair * usdtBrl;
  const btcPair = prices.get(`${t}BTC`);
  const btcUsdt = prices.get("BTCUSDT");
  if (btcPair && btcUsdt) return btcPair * btcUsdt * usdtBrl;
  return 0;
}

async function resolvePrices(
  tickers: string[],
): Promise<Map<string, number>> {
  const prices = await getBinancePrices();
  const usdtBrl = prices.get("USDTBRL") ?? 0;
  if (!usdtBrl) throw new Error("USDTBRL price unavailable");
  const out = new Map<string, number>();
  for (const t of tickers) out.set(t, priceInBRL(t, prices, usdtBrl));
  return out;
}

// ---------- Actions ----------
type Action =
  | { action: "list" }
  | { action: "connect"; provider: Provider; label?: string; api_key: string; api_secret: string; passphrase?: string }
  | { action: "sync"; connection_id: string }
  | { action: "sync_all" }
  | { action: "disconnect"; connection_id: string }
  | { action: "add_manual"; ticker: string; quantity: number; broker?: string }
  | { action: "remove_position"; id: string };

async function syncConnection(connectionId: string) {
  const { data: conn, error: cErr } = await admin
    .from("va_connections")
    .select("id, provider")
    .eq("id", connectionId)
    .maybeSingle();
  if (cErr || !conn) throw new Error("Connection not found");

  const { data: cred, error: credErr } = await admin
    .from("va_credentials")
    .select("api_key, api_secret, passphrase")
    .eq("connection_id", connectionId)
    .maybeSingle();
  if (credErr || !cred) throw new Error("Credentials not found");

  const adapter = getAdapter(conn.provider as Provider);
  let balances: NormalizedBalance[];
  try {
    if (conn.provider === "coinbase") {
      balances = await (adapter as typeof fetchCoinbase)(
        cred.api_key, cred.api_secret, cred.passphrase ?? "",
      );
    } else {
      balances = await (adapter as typeof fetchBinance)(cred.api_key, cred.api_secret);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("va_connections").update({
      status: "error", last_error: msg, last_sync: new Date().toISOString(),
    }).eq("id", connectionId);
    throw e;
  }

  const prices = await resolvePrices(balances.map((b) => b.ticker));
  const now = new Date().toISOString();

  await admin.from("va_positions").delete().eq("connection_id", connectionId);
  if (balances.length > 0) {
    const rows = balances.map((b) => ({
      ticker: b.ticker,
      quantity: b.quantity,
      current_value: b.quantity * (prices.get(b.ticker) ?? 0),
      asset_type: "crypto",
      broker: conn.provider,
      source: "aggregator",
      provider: conn.provider,
      connection_id: connectionId,
      last_sync: now,
    }));
    await admin.from("va_positions").insert(rows);
  }

  await admin.from("va_connections").update({
    status: "active", last_error: null, last_sync: now,
  }).eq("id", connectionId);

  return { count: balances.length };
}

async function handle(body: Action) {
  switch (body.action) {
    case "list": {
      const [conns, positions] = await Promise.all([
        admin.from("va_connections").select("id, provider, label, status, last_sync, last_error, created_at").order("created_at"),
        admin.from("va_positions").select("*").order("current_value", { ascending: false }),
      ]);
      if (conns.error) throw conns.error;
      if (positions.error) throw positions.error;
      return { connections: conns.data, positions: positions.data };
    }
    case "connect": {
      const { provider, label, api_key, api_secret, passphrase } = body;
      if (!["binance","bybit","coinbase","kraken","mercado_bitcoin"].includes(provider)) {
        throw new Error("Unsupported provider");
      }
      if (!api_key || !api_secret) throw new Error("Missing credentials");
      if (provider === "coinbase" && !passphrase) throw new Error("Coinbase requires passphrase");

      const { data: conn, error } = await admin
        .from("va_connections")
        .insert({ provider, label: label ?? null, status: "active" })
        .select("id")
        .single();
      if (error) throw error;

      const { error: cErr } = await admin
        .from("va_credentials")
        .insert({
          connection_id: conn.id,
          api_key,
          api_secret,
          passphrase: passphrase ?? null,
        });
      if (cErr) {
        await admin.from("va_connections").delete().eq("id", conn.id);
        throw cErr;
      }

      try {
        await syncConnection(conn.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { connection_id: conn.id, sync_error: msg };
      }
      return { connection_id: conn.id };
    }
    case "sync": {
      return await syncConnection(body.connection_id);
    }
    case "sync_all": {
      const { data: conns } = await admin.from("va_connections").select("id");
      const results: Record<string, unknown> = {};
      for (const c of conns ?? []) {
        try { results[c.id] = await syncConnection(c.id); }
        catch (e) { results[c.id] = { error: e instanceof Error ? e.message : String(e) }; }
      }
      return results;
    }
    case "disconnect": {
      const { error } = await admin.from("va_connections").delete().eq("id", body.connection_id);
      if (error) throw error;
      return { ok: true };
    }
    case "add_manual": {
      const ticker = body.ticker.trim().toUpperCase();
      if (!ticker) throw new Error("Ticker required");
      if (!(body.quantity > 0)) throw new Error("Quantity must be > 0");
      const prices = await resolvePrices([ticker]);
      const price = prices.get(ticker) ?? 0;
      const { data, error } = await admin.from("va_positions").insert({
        ticker,
        quantity: body.quantity,
        current_value: body.quantity * price,
        asset_type: "crypto",
        broker: body.broker?.trim() || "manual",
        source: "manual",
        last_sync: new Date().toISOString(),
      }).select("*").single();
      if (error) throw error;
      return { position: data, price };
    }
    case "remove_position": {
      const { error } = await admin.from("va_positions").delete().eq("id", body.id);
      if (error) throw error;
      return { ok: true };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const result = await handle(body);
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
