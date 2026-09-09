import type { CryptoTrade } from "./types";

export interface AutomatedTradingCluster {
  asset: string;
  broker: string;
  tradingType: "BOT_GRID" | "DAY_TRADE" | "HIGH_FREQUENCY";
  tradeCount: number;
  totalVolumeUSD: number;
  totalVolumeBRL: number;
  totalFeesBRL: number;
  startDate: string;
  endDate: string;
}

export function detectAutomatedTradingClusters(
  trades: CryptoTrade[],
  defaultFxRateBRL = 5.0740
): AutomatedTradingCluster[] {
  const clusters: AutomatedTradingCluster[] = [];
  const sellTrades = trades.filter((t) => t.side === "SELL" || t.transactionType === "SWAP");

  // Group trades by asset and date (YYYY-MM-DD)
  const groupedByDayAsset = new Map<string, CryptoTrade[]>();

  sellTrades.forEach((t) => {
    const dayKey = `${t.asset.toUpperCase()}_${t.dateTime.slice(0, 10)}_${t.broker}`;
    const list = groupedByDayAsset.get(dayKey) || [];
    list.push(t);
    groupedByDayAsset.set(dayKey, list);
  });

  groupedByDayAsset.forEach((dayTrades, key) => {
    if (dayTrades.length >= 5) {
      // 5 or more sell executions in a single day indicates bot/grid/day trade
      const [asset, day, broker] = key.split("_");
      const totalVolUSD = dayTrades.reduce((s, t) => s + t.grossValue, 0);
      const totalVolBRL = dayTrades.reduce((s, t) => s + (t.grossValueBRL ?? (t.grossValue * (t.fxRateBRL || defaultFxRateBRL))), 0);
      const totalFeesBRL = dayTrades.reduce((s, t) => s + (t.feeValueBRL ?? (t.fee * (t.fxRateBRL || defaultFxRateBRL))), 0);

      const times = dayTrades.map((t) => t.dateTime).sort();

      clusters.push({
        asset,
        broker,
        tradingType: dayTrades.length >= 20 ? "HIGH_FREQUENCY" : "BOT_GRID",
        tradeCount: dayTrades.length,
        totalVolumeUSD: totalVolUSD,
        totalVolumeBRL: totalVolBRL,
        totalFeesBRL: totalFeesBRL,
        startDate: times[0],
        endDate: times[times.length - 1],
      });
    }
  });

  return clusters;
}
