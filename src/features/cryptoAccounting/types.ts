export type OrderSide = "BUY" | "SELL";

export type TransactionType =
  | "SPOT"
  | "SWAP"
  | "CONVERSION"
  | "TRANSFER"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "STAKING"
  | "AIRDROP"
  | "MINING"
  | "LIQUIDITY"
  | "OTHER";

export type TaxRegime = "NATIONAL" | "INTERNATIONAL" | "UNKNOWN";

export type TaxRuleVersionId = "BR_CRYPTO_35K_2026" | "BR_CRYPTO_FOREIGN_2026";

export interface TaxRuleVersion {
  id: TaxRuleVersionId;
  name: string;
  jurisdiction: "BR";
  regime: TaxRegime;
  monthlyDisposalReference: number; // 35000 for National, 0 for International
  effectiveFrom: string;
  effectiveUntil: string | null;
  description: string;
}

export interface CryptoTrade {
  id: string;
  broker: string;
  account?: string;
  dateTime: string; // ISO string
  asset: string;
  quantity: number;
  side: OrderSide;
  price: number;
  grossValue: number;
  fee: number;
  feeAsset: string;
  feeValueBRL?: number;
  netValue: number;
  quoteCurrency: string;
  orderId?: string;
  tradeId?: string;
  transactionType: TransactionType;
  market?: string;
  country?: string;
  source: "CSV" | "XLSX" | "API" | "N8N" | "MANUAL";
  sourceWallet?: string;
  destinationWallet?: string;
  fxRateBRL?: number;
  grossValueBRL?: number;
  costValueBRL?: number;
  notes?: string;
}

export interface CryptoPositionStock {
  asset: string;
  quantity: number;
  totalCostBRL: number;
  averagePriceUSD: number;
  averageCostBRL: number;
  currentPriceUSD?: number;
  currentValueUSD?: number;
  currentValueBRL?: number;
  unrealizedProfitBRL?: number;
  unrealizedProfitPct?: number;
  sources: string[];
  lastTransactionAt?: string;
}

export interface CryptoDisposal {
  id: string;
  tradeId: string;
  dateTime: string;
  asset: string;
  quantity: number;
  broker: string;
  taxRegime: TaxRegime;
  grossProceedsUSD: number;
  grossProceedsBRL: number;
  feeBRL: number;
  netProceedsBRL: number;
  allocatedCostBRL: number;
  gainLossBRL: number;
  gainLossPct: number;
  isExempt: boolean;
  notes?: string;
  auditTrail: {
    appliedLots: Array<{
      buyTradeId?: string;
      buyDate: string;
      quantityUsed: number;
      unitCostBRL: number;
      totalCostBRL: number;
    }>;
  };
}

export interface CryptoTaxMonthSummary {
  month: string; // YYYY-MM
  nationalDisposalsBRL: number;
  nationalExemptLimitBRL: number; // 35000
  nationalLimitUsedPct: number;
  nationalRemainingLimitBRL: number;
  nationalGainsBRL: number;
  nationalLossesBRL: number;
  nationalNetResultBRL: number;
  nationalTaxableGainBRL: number;
  nationalEstimatedTaxBRL: number;
  
  internationalDisposalsBRL: number;
  internationalGainsBRL: number;
  internationalLossesBRL: number;
  internationalNetResultBRL: number;
  internationalTaxableGainBRL: number;
  internationalEstimatedTaxBRL: number;
  
  lossesCarriedForwardBRL: number;
  status: "OK" | "WARNING_50" | "WARNING_70" | "WARNING_90" | "LIMIT_REACHED" | "EXCEEDED";
  taxRuleVersion: TaxRuleVersion;
  disposalsCount: number;
  unknownRegimeCount: number;
}

export interface CryptoTaxAlert {
  id: string;
  month: string;
  severity: "INFO" | "WARNING" | "DANGER";
  title: string;
  message: string;
  code:
    | "THRESHOLD_50"
    | "THRESHOLD_70"
    | "THRESHOLD_90"
    | "THRESHOLD_100"
    | "THRESHOLD_EXCEEDED"
    | "FEE_ARTIFICIAL_DEDUCTION"
    | "INTERNATIONAL_REGIME"
    | "UNKNOWN_REGIME"
    | "AUTOMATED_TRADING_DETECTED";
  timestamp: string;
}

export interface SimulationResult {
  simulatedSaleAsset: string;
  simulatedQuantity: number;
  simulatedPriceUSD: number;
  simulatedPriceBRL: number;
  grossProceedsBRL: number;
  allocatedCostBRL: number;
  estimatedGainLossBRL: number;
  currentMonthDisposalsBRL: number;
  newMonthDisposalsBRL: number;
  limitBRL: number;
  limitRemainingBeforeBRL: number;
  limitRemainingAfterBRL: number;
  wouldExceedLimit: boolean;
  estimatedTaxBRL: number;
  status: "GREEN" | "YELLOW" | "RED";
  message: string;
}

export interface RebalanceItem {
  asset: string;
  action: "BUY" | "SELL";
  quantity: number;
  priceUSD: number;
}

export interface RebalanceSimulationResult {
  items: RebalanceItem[];
  totalDisposalsBRL: number;
  totalPurchasesBRL: number;
  netCashBRL: number;
  estimatedGainLossBRL: number;
  remainingLimitBRL: number;
  status: "GREEN" | "YELLOW" | "RED";
  summaryMessage: string;
}

export interface CostResetSimulationResult {
  asset: string;
  currentQuantity: number;
  currentAvgCostBRL: number;
  currentTotalCostBRL: number;
  simulatedSellPriceUSD: number;
  simulatedSellPriceBRL: number;
  grossProceedsBRL: number;
  realizedGainLossBRL: number;
  newAvgCostBRL: number;
  newTotalCostBRL: number;
  futureTaxShieldBRL: number;
  disclaimer: string;
}

export interface HybridBuybackSimulationResult {
  asset: string;
  totalSaleValueBRL: number;
  splitImmediatePct: number;
  splitReservePct: number;
  sellPriceUSD: number;
  sellPriceBRL: number;
  totalSaleQty: number;
  
  // Fatia A: Recompra Imediata
  immediateAmountBRL: number;
  immediateQtyRebought: number;
  newAvgCostBRL: number;
  upsideProtectionPct: number;

  // Fatia B: Caixa Tático & Limit Orders
  reserveAmountBRL: number;
  target1DropPct: number;
  target1PriceUSD: number;
  target1PriceBRL: number;
  target1QtyRebought: number;
  target2DropPct: number;
  target2PriceUSD: number;
  target2PriceBRL: number;
  target2QtyRebought: number;

  // Comparison & Savings
  totalQtyIfImmediateOnly: number;
  totalQtyIfHybridDropExecuted: number;
  extraCryptoQtyGained: number;
  extraCryptoGainedPct: number;
  projectedReserveYieldMonthlyBRL: number;
}

export interface CryptoReconciliationResult {
  confidenceScorePct: number;
  totalOrders: number;
  totalVolumeBRL: number;
  reconciledAssetsCount: number;
  issues: Array<{
    id: string;
    asset: string;
    type:
      | "NEGATIVE_QUANTITY"
      | "MISSING_BUY"
      | "UNLINKED_TRANSFER"
      | "MISSING_PRICE"
      | "MISSING_COUNTRY"
      | "DUPLICATE_ORDER";
    severity: "LOW" | "MEDIUM" | "HIGH";
    description: string;
    suggestedAction: string;
  }>;
}
