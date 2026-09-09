import type { CryptoPositionStock, CryptoReconciliationResult, CryptoTrade } from "./types";

export function reconcileCryptoAccounting(
  trades: CryptoTrade[],
  stocks: CryptoPositionStock[],
  defaultFxRateBRL = 5.0740
): CryptoReconciliationResult {
  const issues: CryptoReconciliationResult["issues"] = [];
  let totalScorePenalty = 0;

  const totalOrders = trades.length;
  const totalVolumeBRL = trades.reduce(
    (sum, t) => sum + (t.grossValueBRL ?? (t.grossValue * (t.fxRateBRL || defaultFxRateBRL))),
    0
  );

  // 1. Check for negative stocks
  stocks.forEach((st) => {
    if (st.quantity < -0.00000001) {
      totalScorePenalty += 20;
      issues.push({
        id: `rec_neg_${st.asset}`,
        asset: st.asset,
        type: "NEGATIVE_QUANTITY",
        severity: "HIGH",
        description: `Estoque negativo detectado no ativo ${st.asset} (${st.quantity.toFixed(6)}). Há vendas/saques registrados sem a respectiva ordem de compra anterior.`,
        suggestedAction: "Importe o histórico de compras inicial deste ativo ou registre a aquisição com o preço médio correto.",
      });
    }
  });

  // 2. Check for missing purchase orders when alienations exist
  const assetsSold = new Set(trades.filter((t) => t.side === "SELL").map((t) => t.asset.toUpperCase()));
  const assetsBought = new Set(trades.filter((t) => t.side === "BUY" || t.transactionType === "DEPOSIT").map((t) => t.asset.toUpperCase()));

  assetsSold.forEach((asset) => {
    if (!assetsBought.has(asset)) {
      totalScorePenalty += 15;
      issues.push({
        id: `rec_nobuy_${asset}`,
        asset,
        type: "MISSING_BUY",
        severity: "HIGH",
        description: `Venda registrada no ativo ${asset}, porém nenhuma ordem de compra foi encontrada no livro contábil.`,
        suggestedAction: "Importe o arquivo de ordens originais contendo a aquisição do ativo.",
      });
    }
  });

  // 3. Check for unlinked transfers
  const transfers = trades.filter((t) => t.transactionType === "TRANSFER");
  transfers.forEach((tr) => {
    if (!tr.destinationWallet && !tr.sourceWallet) {
      totalScorePenalty += 5;
      issues.push({
        id: `rec_tr_${tr.id}`,
        asset: tr.asset,
        type: "UNLINKED_TRANSFER",
        severity: "LOW",
        description: `Transferência de ${tr.quantity} ${tr.asset} em ${tr.dateTime.slice(0, 10)} sem vínculo de carteira de destino.`,
        suggestedAction: "Vincule a carteira de destino para confirmar que a movimentação foi entre custódias próprias.",
      });
    }
  });

  // 4. Check for trades without country/regime identification
  const unknownCountryTrades = trades.filter((t) => !t.country || t.country === "XX");
  if (unknownCountryTrades.length > 0) {
    totalScorePenalty += 10;
    issues.push({
      id: "rec_unknown_country",
      asset: "VÁRIOS",
      type: "MISSING_COUNTRY",
      severity: "MEDIUM",
      description: `Existem ${unknownCountryTrades.length} operações sem identificação do país da corretora.`,
      suggestedAction: "Verifique a jurisdição da corretora para classificar como Nacional ou Internacional.",
    });
  }

  // Calculate confidence score (0 to 100%)
  const confidenceScorePct = Math.max(0, Math.min(100, 100 - totalScorePenalty));

  return {
    confidenceScorePct,
    totalOrders,
    totalVolumeBRL,
    reconciledAssetsCount: stocks.length,
    issues,
  };
}
