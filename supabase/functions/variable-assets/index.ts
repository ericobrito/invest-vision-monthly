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

async function bybitSignedGet(
  key: string,
  secret: string,
  query: string,
  path = "/v5/account/wallet-balance",
): Promise<unknown> {
  const ts = Date.now().toString();
  const recv = "10000";
  const payload = ts + key + recv + query;
  const sig = toHex(await hmac("SHA-256", secret, payload));
  const res = await fetch(
    `https://api.bybit.com${path}?${query}`,
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
  return data;
}

type BybitCoinBalance = {
  coin: string;
  walletBalance?: string;
  locked?: string;
  transferBalance?: string;
  free?: string;
};

type BybitPosition = {
  symbol?: string;
  baseCoin?: string;
  size?: string;
  positionValue?: string;
  markPrice?: string;
};

async function fetchBybitCoinAccount(
  key: string,
  secret: string,
  accountType: string,
) : Promise<BybitCoinBalance[]> {
  const data = await bybitSignedGet(key, secret, `accountType=${accountType}`) as {
    result?: { list?: Array<{ coin: BybitCoinBalance[] }> };
  };
  const list = data.result?.list ?? [];
  const coins: BybitCoinBalance[] = [];
  for (const entry of list) {
    for (const c of entry.coin ?? []) coins.push(c);
  }
  return coins;
}

// fetchBybitFundingBalances removed — transfer endpoint returns transferable funds, not real balances

function extractBybitQuantity(balance: BybitCoinBalance): number {
  const wallet = parseFloat(balance.walletBalance ?? "0") || 0;
  const locked = parseFloat(balance.locked ?? "0") || 0;
  const transfer = parseFloat(balance.transferBalance ?? "0") || 0;
  const free = parseFloat(balance.free ?? "0") || 0;

  if (wallet > 0 || locked > 0) {
    return wallet + locked;
  } else if (transfer > 0) {
    return transfer;
  } else if (free > 0) {
    return free;
  }
  return 0;
}

function inferBybitBaseTicker(symbol?: string): string {
  const s = (symbol ?? "").toUpperCase();
  if (!s) return "";
  if (s.includes("-")) return s.split("-")[0] ?? "";
  for (const quote of ["USDT", "USDC", "USD", "BTC", "ETH", "EUR", "BRL"]) {
    if (s.endsWith(quote) && s.length > quote.length) return s.slice(0, -quote.length);
  }
  return s;
}

async function fetchBybitPositions(
  key: string,
  secret: string,
): Promise<BybitPosition[]> {
  const out: BybitPosition[] = [];

  for (const category of ["linear", "inverse", "option"] as const) {
    let cursor: string | undefined;
    do {
      const params = new URLSearchParams({ category, limit: "200" });
      if (category === "linear") params.set("settleCoin", "USDT");
      if (category === "inverse") params.set("settleCoin", "BTC");
      if (cursor) params.set("cursor", cursor);

      try {
        const data = await bybitSignedGet(
          key,
          secret,
          params.toString(),
          "/v5/position/list",
        ) as {
          result?: { list?: BybitPosition[]; nextPageCursor?: string };
        };
        out.push(...(data.result?.list ?? []));
        const nextCursor = data.result?.nextPageCursor?.trim();
        cursor = nextCursor && nextCursor !== cursor ? nextCursor : undefined;
      } catch (e) {
        console.warn(`Bybit ${category} positions fetch failed:`, e instanceof Error ? e.message : e);
        cursor = undefined;
      }
    } while (cursor);
  }

  return out;
}

async function fetchBybit(key: string, secret: string): Promise<NormalizedBalance[]> {
  // Aggregate across all account sources: wallet balances + funding + open derivatives positions.
  const aggregated = new Map<string, number>();

  const addCoins = (
    coins: BybitCoinBalance[],
  ) => {
    for (const c of coins) {
      const ticker = (c.coin ?? "").toUpperCase();
      if (!ticker) continue;
      const qty = extractBybitQuantity(c);
      if (qty <= 0) continue;
      aggregated.set(ticker, (aggregated.get(ticker) ?? 0) + qty);
    }
  };

  const addPositions = (positions: BybitPosition[]) => {
    for (const position of positions) {
      const explicitBase = (position.baseCoin ?? "").toUpperCase();
      const ticker = explicitBase || inferBybitBaseTicker(position.symbol);
      if (!ticker) continue;

      const size = Math.abs(parseFloat(position.size ?? "0") || 0);
      const positionValue = Math.abs(parseFloat(position.positionValue ?? "0") || 0);
      const markPrice = Math.abs(parseFloat(position.markPrice ?? "0") || 0);
      const exposure = size > 0 ? size : (positionValue > 0 && markPrice > 0 ? positionValue / markPrice : 0);
      if (exposure <= 0) continue;

      aggregated.set(ticker, (aggregated.get(ticker) ?? 0) + exposure);
    }
  };

  try {
    const unified = await fetchBybitCoinAccount(key, secret, "UNIFIED");
    console.log(`[Bybit] UNIFIED returned ${unified.length} coins`);
    addCoins(unified);
  } catch (e) {
    console.error("[Bybit] UNIFIED fetch failed:", e instanceof Error ? e.message : e);
  }

  // SPOT account (fallback for non-UNIFIED accounts)
  try {
    const spot = await fetchBybitCoinAccount(key, secret, "SPOT");
    console.log(`[Bybit] SPOT returned ${spot.length} coins`);
    addCoins(spot);
  } catch (e) {
    console.error("[Bybit] SPOT fetch failed:", e instanceof Error ? e.message : e);
  }

  // FUND account via wallet-balance endpoint (separate from UNIFIED/SPOT)
  try {
    const fundWallet = await fetchBybitCoinAccount(key, secret, "FUND");
    console.log(`[Bybit] FUND returned ${fundWallet.length} coins`);
    addCoins(fundWallet);
  } catch (e) {
    console.error("[Bybit] FUND fetch failed:", e instanceof Error ? e.message : e);
  }

  // Transfer endpoint removed — it returns transferable funds, not real balances

  try {
    const positions = await fetchBybitPositions(key, secret);
    console.log(`[Bybit] Derivative positions returned ${positions.length} entries`);
    addPositions(positions);
  } catch (e) {
    console.error("[Bybit] positions aggregation failed:", e instanceof Error ? e.message : e);
  }

  console.log(`[Bybit] Final aggregated tickers: ${JSON.stringify(Object.fromEntries(aggregated))}`);

  return Array.from(aggregated.entries())
    .map(([ticker, quantity]) => ({ ticker, quantity }))
    .filter((b) => b.quantity > 0);
}

// Base64URL helpers
function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const ab = buf instanceof Uint8Array ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf;
  return toBase64(ab).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function normalizePem(pem: string): string {
  // Forms often submit the PEM with literal "\n" sequences instead of newlines.
  return pem.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
}

function decodePemBody(pem: string): { type: string; bytes: Uint8Array } {
  const normalized = normalizePem(pem);
  const match = normalized.match(
    /-----BEGIN ([^-]+)-----([\s\S]+?)-----END \1-----/,
  );
  if (!match) {
    throw new Error("Invalid PEM: missing BEGIN/END markers");
  }
  const type = match[1].trim();
  const b64 = match[2].replace(/\s+/g, "");
  if (!b64) throw new Error("Invalid PEM: empty body");
  let bytes: Uint8Array;
  try {
    bytes = fromBase64(b64);
  } catch {
    throw new Error("Invalid PEM: base64 decode failed");
  }
  return { type, bytes };
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function encodeDerLength(length: number): Uint8Array {
  if (length < 0x80) return Uint8Array.of(length);
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

function encodeDer(tag: number, value: Uint8Array): Uint8Array {
  return concatBytes(Uint8Array.of(tag), encodeDerLength(value.length), value);
}

// Wrap a SEC1 EC private key (P-256) into a PKCS8 envelope so WebCrypto can import it.
function sec1ToPkcs8(sec1: Uint8Array): Uint8Array {
  // PKCS#8 PrivateKeyInfo ::= SEQUENCE {
  //   version                   INTEGER (0),
  //   privateKeyAlgorithm       AlgorithmIdentifier,
  //   privateKey                OCTET STRING
  // }
  const version = encodeDer(0x02, Uint8Array.of(0x00));
  const algorithm = encodeDer(
    0x30,
    concatBytes(
      encodeDer(0x06, Uint8Array.of(0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01)),
      encodeDer(0x06, Uint8Array.of(0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07)),
    ),
  );
  const privateKey = encodeDer(0x04, sec1);
  return encodeDer(0x30, concatBytes(version, algorithm, privateKey));
}

async function importEcPrivateKey(pem: string): Promise<CryptoKey> {
  const { type, bytes } = decodePemBody(pem);
  const upper = type.toUpperCase();
  let pkcs8: Uint8Array;
  if (upper.includes("EC PRIVATE KEY")) {
    pkcs8 = sec1ToPkcs8(bytes); // SEC1 → wrap into PKCS8
  } else if (upper.includes("PRIVATE KEY")) {
    pkcs8 = bytes; // Already PKCS8
  } else {
    throw new Error(`Unsupported PEM type: ${type}`);
  }
  return await crypto.subtle.importKey(
    "pkcs8",
    asBuffer(pkcs8),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function signES256(privateKeyPem: string, message: string): Promise<string> {
  const key = await importEcPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    asBuffer(message),
  );
  return toBase64Url(sig);
}

async function buildCoinbaseJwt(
  keyName: string,
  privateKeyPem: string,
  requestMethod: string,
  requestHost: string,
  requestPath: string,
): Promise<string> {
  const header = {
    alg: "ES256",
    kid: keyName,
    typ: "JWT",
    nonce: toHex(crypto.getRandomValues(new Uint8Array(16)).buffer),
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: keyName,
    iss: "cdp",
    nbf: now,
    exp: now + 120,
    uri: `${requestMethod.toUpperCase()} ${requestHost}${requestPath}`,
  };
  const encHeader = toBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;
  const sig = await signES256(privateKeyPem, signingInput);
  return `${signingInput}.${sig}`;
}

async function fetchCoinbase(
  key: string,
  secret: string,
  _passphrase: string,
): Promise<NormalizedBalance[]> {
  // key = organization key name (e.g. "organizations/{org_id}/apiKeys/{key_id}")
  // secret = EC PRIVATE KEY in PEM format
  const host = "api.coinbase.com";
  const path = "/api/v3/brokerage/accounts";
  const aggregated = new Map<string, number>();
  let cursor: string | undefined;

  do {
    const query = new URLSearchParams({ limit: "250" });
    if (cursor) query.set("cursor", cursor);
    const requestPath = query.toString() ? `${path}?${query.toString()}` : path;
    const jwt = await buildCoinbaseJwt(key, secret, "GET", host, path);
    const res = await fetch(`https://${host}${requestPath}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`Coinbase: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const accounts: Array<{
      currency: string;
      available_balance?: { value: string; currency: string };
      hold?: { value: string; currency: string };
      balance?: { value: string; currency: string };
      ready?: boolean;
    }> = data?.accounts ?? [];

    for (const account of accounts) {
      const ticker = (account.currency ?? account.available_balance?.currency ?? account.balance?.currency ?? "").toUpperCase();
      if (!ticker) continue;
      const available = parseFloat(account.available_balance?.value ?? "0") || 0;
      const hold = parseFloat(account.hold?.value ?? "0") || 0;
      const balance = parseFloat(account.balance?.value ?? "0") || 0;
      const quantity = Math.max(available + hold, balance, 0);
      if (quantity <= 0) continue;
      aggregated.set(ticker, (aggregated.get(ticker) ?? 0) + quantity);
    }

    const nextCursor = (data?.has_next && data?.cursor) ? String(data.cursor).trim() : "";
    cursor = nextCursor || undefined;
  } while (cursor);

  return Array.from(aggregated.entries()).map(([ticker, quantity]) => ({ ticker, quantity }));
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
      // Coinbase uses ES256 JWT: api_key = key name, api_secret = EC PRIVATE KEY (PEM). No passphrase required.

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
