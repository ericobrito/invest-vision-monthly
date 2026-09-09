import type { CryptoDisposal, CryptoTrade } from "./types";
import { getBrokerRegime } from "./cryptoOrderNormalizer";

export function isAlienationOperation(trade: CryptoTrade): boolean {
  // Purchases (BUY), Internal Transfers, Deposits, Withdrawals are NOT alienations
  if (trade.side === "BUY") return false;
  if (trade.transactionType === "TRANSFER") return false;
  if (trade.transactionType === "DEPOSIT") return false;
  if (trade.transactionType === "WITHDRAWAL") return false;

  // SELL, SWAP, CONVERSION are alienations
  if (trade.side === "SELL") return true;
  if (trade.transactionType === "SWAP" || trade.transactionType === "CONVERSION") return true;

  return false;
}

export function buildDisposalFromTrade(
  trade: CryptoTrade,
  allocatedCostBRL: number,
  defaultFxRateBRL = 5.0740
): CryptoDisposal {
  const fx = trade.fxRateBRL || defaultFxRateBRL;
  const grossProceedsUSD = trade.grossValue;
  const grossProceedsBRL = trade.grossValueBRL ?? (grossProceedsUSD * fx);
  const feeBRL = trade.feeValueBRL ?? (trade.fee * fx);

  // Note: For tax threshold evaluation, gross proceeds BRL is used.
  // Net proceeds = gross - fee.
  const netProceedsBRL = grossProceedsBRL - feeBRL;

  // Gain/Loss = Net Proceeds - Allocated Cost Basis
  const gainLossBRL = netProceedsBRL - allocatedCostBRL;
  const gainLossPct = allocatedCostBRL > 0 ? (gainLossBRL / allocatedCostBRL) * 100 : 0;

  const brokerMeta = getBrokerRegime(trade.broker);

  return {
    id: `disp_${trade.id}`,
    tradeId: trade.id,
    dateTime: trade.dateTime,
    asset: trade.asset.toUpperCase(),
    quantity: trade.quantity,
    broker: trade.broker,
    taxRegime: brokerMeta.regime,
    grossProceedsUSD,
    grossProceedsBRL,
    feeBRL,
    netProceedsBRL,
    allocatedCostBRL,
    gainLossBRL,
    gainLossPct,
    isExempt: brokerMeta.regime === "NATIONAL", // Will be refined by tax engine against monthly 35k limit
    auditTrail: {
      appliedLots: [
        {
          buyDate: trade.dateTime,
          quantityUsed: trade.quantity,
          unitCostBRL: trade.quantity > 0 ? allocatedCostBRL / trade.quantity : 0,
          totalCostBRL: allocatedCostBRL,
        },
      ],
    },
  };
}
