import type { CryptoPositionStock, CryptoReconciliationResult, CryptoTrade } from "./types";

export function reconcileCryptoAccounting(
  trades: CryptoTrade[],
  stocks: CryptoPositionStock[],
  defaultFxRateBRL = 5.0740,
  portfolioPositions?: Array<{ asset: string; quantity: number; averagePriceUSD?: number }>
): CryptoReconciliationResult {
  const issues: CryptoReconciliationResult["issues"] = [];
  let totalScorePenalty = 0;

  const totalOrders = trades.length;
  const totalVolumeUSD = trades.reduce((sum, t) => sum + (t.grossValue || 0), 0);
  const totalFeesUSD = trades.reduce((sum, t) => sum + (t.fee || 0), 0);
  const totalVolumeBRL = trades.reduce(
    (sum, t) => sum + (t.grossValueBRL ?? (t.grossValue * (t.fxRateBRL || defaultFxRateBRL))),
    0
  );

  // Default target portfolio positions from Invest Vision portfolio if not provided
  const targetPortfolio = portfolioPositions || [
    { asset: "BTC", quantity: 0.159621, averagePriceUSD: 29882.78 },
    { asset: "USDT", quantity: 8614.105652, averagePriceUSD: 1.00 },
    { asset: "ETH", quantity: 3.116321, averagePriceUSD: 2160.00 },
  ];

  // Build stock lookup map
  const stockMap = new Map<string, CryptoPositionStock>();
  stocks.forEach((st) => stockMap.set(st.asset.toUpperCase(), st));

  // 1. Portfolio Comparison & Fiscal Incoherency Detection
  const portfolioComparison: NonNullable<CryptoReconciliationResult["portfolioComparison"]> = [];

  targetPortfolio.forEach((p) => {
    const asset = p.asset.toUpperCase();
    const st = stockMap.get(asset);
    const bookQty = st ? st.quantity : 0;
    const bookAvgPriceUSD = st ? st.averagePriceUSD : 0;
    const diffQty = Math.abs(bookQty - p.quantity);

    let status: "MATCH" | "MISMATCH_QTY" | "MISMATCH_PM" = "MATCH";

    if (diffQty > 0.0001) {
      status = "MISMATCH_QTY";
      totalScorePenalty += 25;
      issues.push({
        id: `rec_port_mismatch_${asset}`,
        asset,
        type: "PORTFOLIO_MISMATCH",
        severity: "HIGH",
        description: `INCOERÊNCIA FISCAL: O livro contábil possui ${bookQty.toFixed(6)} ${asset}, mas sua carteira de Investimentos possui ${p.quantity.toFixed(6)} ${asset} (${(p.quantity - bookQty > 0 ? "+" : "")}${(p.quantity - bookQty).toFixed(6)} ${asset} de diferença).`,
        suggestedAction: `Importe os extratos de compra restantes de ${asset} para que o Fisco não tribute com custo zero (R$ 0,00) em vendas futuras.`,
      });
    } else if (p.averagePriceUSD && Math.abs(bookAvgPriceUSD - p.averagePriceUSD) > 5) {
      status = "MISMATCH_PM";
      totalScorePenalty += 10;
      issues.push({
        id: `rec_pm_mismatch_${asset}`,
        asset,
        type: "AVERAGE_PRICE_MISMATCH",
        severity: "MEDIUM",
        description: `Divergência de Custo Médio: O Preço Médio no Livro é US$ ${bookAvgPriceUSD.toFixed(2)}, mas nos Investimentos é US$ ${p.averagePriceUSD.toFixed(2)}.`,
        suggestedAction: `Verifique se o valor de aquisição das ordens está atualizado para manter o escudo fiscal exato.`,
      });
    }

    portfolioComparison.push({
      asset,
      bookQuantity: bookQty,
      portfolioQuantity: p.quantity,
      diffQuantity: p.quantity - bookQty,
      bookAvgPriceUSD,
      portfolioAvgPriceUSD: p.averagePriceUSD || 0,
      status,
    });
  });

  // 2. Check for false alienation in custody transfers (Bybit -> Coinbase marked as SELL)
  trades.forEach((t) => {
    if (t.side === "SELL" && (t.transactionType === "TRANSFER" || t.notes?.toLowerCase().includes("transfer"))) {
      totalScorePenalty += 15;
      issues.push({
        id: `rec_false_disposal_${t.id}`,
        asset: t.asset,
        type: "FALSE_DISPOSAL_TRANSFER",
        severity: "HIGH",
        description: `INCOERÊNCIA FISCAL: Movimentação entre carteiras próprias (${t.broker}) em ${t.dateTime.slice(0, 10)} está rotulada como "Venda". Pela IN 1888 da Receita Federal, transferências de custódia NÃO são alienações.`,
        suggestedAction: `Classifique o tipo da operação como "TRANSFERÊNCIA" sem alienação para evitar apuração indevida de imposto.`,
      });
    }
  });

  // 3. Check for negative stocks
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

  // 4. Check for missing purchase orders when alienations exist
  const assetsSold = new Set(trades.filter((t) => t.side === "SELL" && t.transactionType !== "TRANSFER").map((t) => t.asset.toUpperCase()));
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

  // 5. Check for unlinked transfers
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

  // 6. Check for trades without country/regime identification
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
    totalVolumeUSD,
    totalFeesUSD,
    reconciledAssetsCount: stocks.length,
    portfolioComparison,
    issues,
  };
}
