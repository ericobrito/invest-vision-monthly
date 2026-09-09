import type { CryptoPositionStock, CryptoTrade } from "./types";

export interface CostBasisLot {
  tradeId: string;
  dateTime: string;
  asset: string;
  quantityRemaining: number;
  unitCostBRL: number;
  totalCostBRL: number;
  broker: string;
}

export class CryptoCostBasisEngine {
  private lotsByAsset: Map<string, CostBasisLot[]> = new Map();
  private defaultFxRateBRL = 5.0740;

  constructor(fxRateBRL = 5.0740) {
    this.defaultFxRateBRL = fxRateBRL;
  }

  public setFxRate(fxRateBRL: number) {
    this.defaultFxRateBRL = fxRateBRL;
  }

  public processTrade(trade: CryptoTrade): { allocatedCostBRL: number; costBasisBRL: number } {
    const fx = trade.fxRateBRL || this.defaultFxRateBRL;
    const assetKey = trade.asset.toUpperCase().trim();

    const grossBRL = trade.grossValueBRL ?? (trade.grossValue * fx);
    const feeBRL = trade.feeValueBRL ?? (trade.fee * fx);

    if (trade.side === "BUY" || trade.transactionType === "DEPOSIT" || trade.transactionType === "AIRDROP" || trade.transactionType === "STAKING") {
      // BUY or Inflow: Fees ADD to acquisition cost
      const totalCostBRL = grossBRL + feeBRL;
      const unitCostBRL = trade.quantity > 0 ? totalCostBRL / trade.quantity : 0;

      const lots = this.lotsByAsset.get(assetKey) || [];
      lots.push({
        tradeId: trade.id,
        dateTime: trade.dateTime,
        asset: assetKey,
        quantityRemaining: trade.quantity,
        unitCostBRL,
        totalCostBRL,
        broker: trade.broker,
      });
      this.lotsByAsset.set(assetKey, lots);

      return { allocatedCostBRL: 0, costBasisBRL: unitCostBRL };
    }

    if (trade.side === "SELL" || trade.transactionType === "WITHDRAWAL") {
      // SELL or Outflow: Consume cost basis using Moving Average / FIFO
      let qtyToDeduct = trade.quantity;
      let allocatedCostBRL = 0;
      const lots = this.lotsByAsset.get(assetKey) || [];

      // Calculate overall average cost before deduction
      const currentPos = this.getPositionStock(assetKey);
      const avgCostUnitBRL = currentPos.averageCostBRL;

      if (lots.length === 0 || currentPos.quantity <= 0) {
        // Fallback for short positions or untracked legacy purchases
        allocatedCostBRL = trade.quantity * avgCostUnitBRL;
        return { allocatedCostBRL, costBasisBRL: avgCostUnitBRL };
      }

      // FIFO lot deduction
      for (const lot of lots) {
        if (qtyToDeduct <= 0) break;
        if (lot.quantityRemaining <= 0) continue;

        const takeQty = Math.min(qtyToDeduct, lot.quantityRemaining);
        const takeCost = takeQty * lot.unitCostBRL;

        lot.quantityRemaining -= takeQty;
        lot.totalCostBRL -= takeCost;
        allocatedCostBRL += takeCost;
        qtyToDeduct -= takeQty;
      }

      // Cleanup depleted lots
      this.lotsByAsset.set(
        assetKey,
        lots.filter((l) => l.quantityRemaining > 0.00000001)
      );

      return { allocatedCostBRL, costBasisBRL: avgCostUnitBRL };
    }

    return { allocatedCostBRL: 0, costBasisBRL: 0 };
  }

  public getPositionStock(asset: string, currentPriceUSD?: number): CryptoPositionStock {
    const assetKey = asset.toUpperCase().trim();
    const lots = this.lotsByAsset.get(assetKey) || [];

    let totalQty = 0;
    let totalCostBRL = 0;
    const sourcesSet = new Set<string>();
    let lastTransactionAt: string | undefined;

    for (const lot of lots) {
      totalQty += lot.quantityRemaining;
      totalCostBRL += lot.totalCostBRL;
      if (lot.broker) sourcesSet.add(lot.broker);
      if (!lastTransactionAt || lot.dateTime > lastTransactionAt) {
        lastTransactionAt = lot.dateTime;
      }
    }

    const averageCostBRL = totalQty > 0 ? totalCostBRL / totalQty : 0;
    const averagePriceUSD = averageCostBRL / this.defaultFxRateBRL;

    const currPUSD = currentPriceUSD || averagePriceUSD;
    const currentValueUSD = totalQty * currPUSD;
    const currentValueBRL = currentValueUSD * this.defaultFxRateBRL;
    const unrealizedProfitBRL = currentValueBRL - totalCostBRL;
    const unrealizedProfitPct = totalCostBRL > 0 ? (unrealizedProfitBRL / totalCostBRL) * 100 : 0;

    return {
      asset: assetKey,
      quantity: totalQty,
      totalCostBRL,
      averageCostBRL,
      averagePriceUSD,
      currentPriceUSD: currPUSD,
      currentValueUSD,
      currentValueBRL,
      unrealizedProfitBRL,
      unrealizedProfitPct,
      sources: Array.from(sourcesSet),
      lastTransactionAt,
    };
  }

  public getAllPositionStocks(liveQuotesUSD: Record<string, number> = {}): CryptoPositionStock[] {
    const assets = Array.from(this.lotsByAsset.keys());
    return assets
      .map((asset) => this.getPositionStock(asset, liveQuotesUSD[asset] || liveQuotesUSD[`${asset}-USD`]))
      .filter((pos) => pos.quantity > 0.00000001 || pos.totalCostBRL > 0.01);
  }

  public reset() {
    this.lotsByAsset.clear();
  }
}
