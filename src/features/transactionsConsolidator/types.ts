export type OrderType = "BUY" | "SELL" | "TRANSFER" | "SPLIT" | "DIVIDEND";
export type AssetCategory = "stocks_us" | "crypto" | "stocks_br" | "fixed_income";

export interface ConsolidatedOrder {
  id: string;
  dateTime: string;
  orderType: OrderType;
  ticker: string;
  assetName: string;
  category: AssetCategory;
  broker: string;
  quantity: number;
  unitPriceUSD?: number;
  unitPriceBRL: number;
  fxRate: number;
  grossValueBRL: number;
  grossValueUSD?: number;
  feeBRL: number;
  feeUSD?: number;
  netValueBRL: number;
  netValueUSD?: number;
  weightedAvgPriceBeforeUSD?: number;
  weightedAvgPriceBeforeBRL?: number;
  weightedAvgPriceAfterUSD?: number;
  weightedAvgPriceAfterBRL: number;
  realizedProfitBRL?: number;
  realizedProfitPct?: number;
  source: "API_BINANCE" | "API_COINBASE" | "API_BYBIT" | "API_MERCADO_BITCOIN" | "AVENUE_SYNC" | "MANUAL";
  notes?: string;
}

export interface AssetAveragePriceSummary {
  ticker: string;
  assetName: string;
  category: AssetCategory;
  brokers: string[];
  totalQuantity: number;
  averagePriceUSD?: number;
  averagePriceBRL: number;
  currentPriceUSD?: number;
  currentPriceBRL: number;
  totalInvestedBRL: number;
  currentValueBRL: number;
  unrealizedProfitBRL: number;
  unrealizedProfitPct: number;
  totalRealizedProfitBRL: number;
  buyOrdersCount: number;
  sellOrdersCount: number;
  firstOrderDate: string;
  lastOrderDate: string;
}

export interface OrderFilterState {
  searchQuery: string;
  category: "all" | AssetCategory;
  broker: string;
  orderType: "all" | OrderType;
  year?: "all" | string;
  sortBy: "date_desc" | "date_asc" | "value_desc" | "realized_desc";
}

export interface TaxEstimationItem {
  orderId: string;
  dateTime: string;
  ticker: string;
  assetName: string;
  broker: string;
  category: AssetCategory;
  grossProceedsBRL: number;
  costBRL: number;
  profitBRL: number;
  taxRatePct: number;
  estimatedTaxBRL: number;
  taxRegime: "OFFSHORE_DAA_15" | "CRYPTO_EXEMPT_35K" | "CRYPTO_TAXABLE_15" | "STOCKS_BR_SWING_15" | "STOCKS_BR_EXEMPT_20K";
  dueYear: string;
  filingLabel: string;
  legalBasis: string;
}

export interface YearTaxSummary {
  year: string;
  totalRealizedSalesBRL: number;
  totalRealizedProfitBRL: number;
  totalOffshoreProfitBRL: number;
  totalOffshoreTaxBRL: number;
  totalCryptoGainsBRL: number;
  totalCryptoTaxBRL: number;
  totalStocksBRGainsBRL: number;
  totalStocksBRTaxBRL: number;
  totalEstimatedTaxBRL: number;
  items: TaxEstimationItem[];
}
