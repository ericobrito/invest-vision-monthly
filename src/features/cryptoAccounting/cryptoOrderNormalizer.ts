import type { CryptoTrade, OrderSide, TaxRegime, TransactionType } from "./types";

export interface RawOrderRow {
  date?: string;
  dateTime?: string;
  broker?: string;
  exchange?: string;
  asset?: string;
  pair?: string;
  symbol?: string;
  side?: string;
  type?: string;
  quantity?: number | string;
  price?: number | string;
  total?: number | string;
  grossValue?: number | string;
  fee?: number | string;
  feeAsset?: string;
  orderId?: string;
  tradeId?: string;
  country?: string;
}

export const KNOWN_BROKERS_TAX_REGIME: Record<string, { regime: TaxRegime; country: string }> = {
  mercado_bitcoin: { regime: "NATIONAL", country: "BR" },
  mercadobitcoin: { regime: "NATIONAL", country: "BR" },
  foxbit: { regime: "NATIONAL", country: "BR" },
  novadax: { regime: "NATIONAL", country: "BR" },
  b3: { regime: "NATIONAL", country: "BR" },
  xp: { regime: "NATIONAL", country: "BR" },
  btg: { regime: "NATIONAL", country: "BR" },
  binance: { regime: "INTERNATIONAL", country: "CZ" },
  bybit: { regime: "INTERNATIONAL", country: "AE" },
  coinbase: { regime: "INTERNATIONAL", country: "US" },
  okx: { regime: "INTERNATIONAL", country: "SC" },
  kucoin: { regime: "INTERNATIONAL", country: "SC" },
  gateio: { regime: "INTERNATIONAL", country: "KY" },
  kraken: { regime: "INTERNATIONAL", country: "US" },
  avenue: { regime: "INTERNATIONAL", country: "US" },
};

export function getBrokerRegime(brokerName?: string): { regime: TaxRegime; country: string } {
  if (!brokerName) return { regime: "UNKNOWN", country: "XX" };
  const key = brokerName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return KNOWN_BROKERS_TAX_REGIME[key] || { regime: "UNKNOWN", country: "XX" };
}

export function normalizeTicker(sym?: string): string {
  if (!sym) return "UNKNOWN";
  let s = sym.trim().toUpperCase();
  s = s.replace(/[-_]?(USDT|USDC|BRL|USD|EUR|BTC)$/i, "");
  if (!s) return sym.trim().toUpperCase();
  return s;
}

export function parseCSVText(csvText: string, defaultBroker = "Binance"): CryptoTrade[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const header = lines[0].toLowerCase().split(/[,;\t]/);
  const findColIndex = (...keywords: string[]): number => {
    return header.findIndex((h) => keywords.some((kw) => h.includes(kw)));
  };

  const dateIdx = findColIndex("date", "data", "time", "horario");
  const assetIdx = findColIndex("asset", "ativo", "symbol", "pair", "moeda", "coin");
  const sideIdx = findColIndex("side", "operacao", "tipo", "type", "buy/sell");
  const qtyIdx = findColIndex("quantity", "qtd", "quantidade", "amount", "executado");
  const priceIdx = findColIndex("price", "preco", "cotacao", "rate");
  const feeIdx = findColIndex("fee", "taxa", "comissao");
  const totalIdx = findColIndex("total", "valor", "gross", "bruto", "net");

  const trades: CryptoTrade[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (row.length < 2) continue;

    const rawDate = dateIdx >= 0 ? row[dateIdx] : new Date().toISOString();
    const rawAsset = assetIdx >= 0 ? row[assetIdx] : "BTC";
    const rawSide = sideIdx >= 0 ? row[sideIdx]?.toUpperCase() : "BUY";
    const rawQty = qtyIdx >= 0 ? parseFloat(row[qtyIdx].replace(",", ".")) : 0;
    const rawPrice = priceIdx >= 0 ? parseFloat(row[priceIdx].replace(",", ".")) : 0;
    const rawFee = feeIdx >= 0 ? parseFloat(row[feeIdx].replace(",", ".")) : 0;
    const rawTotal = totalIdx >= 0 ? parseFloat(row[totalIdx].replace(",", ".")) : rawQty * rawPrice;

    if (Number.isNaN(rawQty) || rawQty <= 0) continue;

    const side: OrderSide = rawSide.includes("SELL") || rawSide.includes("VENDA") ? "SELL" : "BUY";
    const asset = normalizeTicker(rawAsset);
    const price = !Number.isNaN(rawPrice) && rawPrice > 0 ? rawPrice : rawTotal / rawQty;
    const grossValue = !Number.isNaN(rawTotal) && rawTotal > 0 ? rawTotal : rawQty * price;
    const fee = !Number.isNaN(rawFee) ? rawFee : 0;
    const netValue = side === "BUY" ? grossValue + fee : grossValue - fee;

    const brokerMeta = getBrokerRegime(defaultBroker);

    trades.push({
      id: `trade_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
      broker: defaultBroker,
      dateTime: new Date(rawDate).toString() !== "Invalid Date" ? new Date(rawDate).toISOString() : new Date().toISOString(),
      asset,
      quantity: rawQty,
      side,
      price,
      grossValue,
      fee,
      feeAsset: "USD",
      netValue,
      quoteCurrency: "USD",
      transactionType: "SPOT",
      country: brokerMeta.country,
      source: "CSV",
    });
  }

  return trades;
}

export function normalizeRawTrade(raw: RawOrderRow, fallbackBroker = "Exchange"): CryptoTrade {
  const broker = raw.broker || raw.exchange || fallbackBroker;
  const side: OrderSide = (raw.side || raw.type || "").toUpperCase().includes("SELL") || (raw.side || "").includes("VENDA") ? "SELL" : "BUY";

  const qty = typeof raw.quantity === "number" ? raw.quantity : parseFloat(String(raw.quantity || 0).replace(",", ".")) || 0;
  const price = typeof raw.price === "number" ? raw.price : parseFloat(String(raw.price || 0).replace(",", ".")) || 0;
  const fee = typeof raw.fee === "number" ? raw.fee : parseFloat(String(raw.fee || 0).replace(",", ".")) || 0;
  const gross = typeof raw.grossValue === "number" ? raw.grossValue : typeof raw.total === "number" ? raw.total : parseFloat(String(raw.total || raw.grossValue || 0).replace(",", ".")) || qty * price;

  const asset = normalizeTicker(raw.asset || raw.symbol || raw.pair || "BTC");
  const brokerMeta = getBrokerRegime(broker);

  let txType: TransactionType = "SPOT";
  const rawTypeUpper = (raw.type || "").toUpperCase();
  if (rawTypeUpper.includes("SWAP")) txType = "SWAP";
  else if (rawTypeUpper.includes("CONVERT") || rawTypeUpper.includes("CONVERSAO")) txType = "CONVERSION";
  else if (rawTypeUpper.includes("TRANSFER")) txType = "TRANSFER";
  else if (rawTypeUpper.includes("DEPOSIT")) txType = "DEPOSIT";
  else if (rawTypeUpper.includes("WITHDRAW")) txType = "WITHDRAWAL";
  else if (rawTypeUpper.includes("STAKING")) txType = "STAKING";
  else if (rawTypeUpper.includes("AIRDROP")) txType = "AIRDROP";
  else if (rawTypeUpper.includes("MINING")) txType = "MINING";

  return {
    id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    broker,
    dateTime: raw.dateTime || raw.date ? new Date(raw.dateTime || raw.date!).toISOString() : new Date().toISOString(),
    asset,
    quantity: qty,
    side,
    price,
    grossValue: gross,
    fee,
    feeAsset: raw.feeAsset || "USD",
    netValue: side === "BUY" ? gross + fee : gross - fee,
    quoteCurrency: "USD",
    orderId: raw.orderId,
    tradeId: raw.tradeId,
    transactionType: txType,
    country: raw.country || brokerMeta.country,
    source: "MANUAL",
  };
}
