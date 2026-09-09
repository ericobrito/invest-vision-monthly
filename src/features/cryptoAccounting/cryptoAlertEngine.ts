import type { CryptoTaxAlert, CryptoTaxMonthSummary, CryptoTrade } from "./types";

export function generateCryptoTaxAlerts(
  summary: CryptoTaxMonthSummary,
  trades: CryptoTrade[] = []
): CryptoTaxAlert[] {
  const alerts: CryptoTaxAlert[] = [];
  const now = new Date().toISOString();
  const month = summary.month;

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // 1. Progressive Threshold Alerts
  if (summary.nationalDisposalsBRL > summary.nationalExemptLimitBRL) {
    alerts.push({
      id: `alert_exceeded_${month}`,
      month,
      severity: "DANGER",
      title: "🔴 Limite Mensal Ultrapassado",
      message: `O limite mensal de R$ 35.000,00 foi ultrapassado (${fmtBRL(summary.nationalDisposalsBRL)}). Revise o ganho de capital e eventual tributação de 15%.`,
      code: "THRESHOLD_EXCEEDED",
      timestamp: now,
    });
  } else if (summary.nationalDisposalsBRL === summary.nationalExemptLimitBRL) {
    alerts.push({
      id: `alert_100_${month}`,
      month,
      severity: "WARNING",
      title: "🟠 Limite Mensal Atingido",
      message: "Você atingiu exatamente o limite mensal de R$ 35.000,00 em alienações nas corretoras nacionais.",
      code: "THRESHOLD_100",
      timestamp: now,
    });
  } else if (summary.nationalLimitUsedPct >= 90) {
    alerts.push({
      id: `alert_90_${month}`,
      month,
      severity: "WARNING",
      title: "⚠️ Alerta de Proximidade (90%)",
      message: `Restam apenas ${fmtBRL(summary.nationalRemainingLimitBRL)} de alienações até o limite mensal de R$ 35.000,00.`,
      code: "THRESHOLD_90",
      timestamp: now,
    });
  } else if (summary.nationalLimitUsedPct >= 70) {
    alerts.push({
      id: `alert_70_${month}`,
      month,
      severity: "INFO",
      title: "🟡 Alerta de Uso (70%)",
      message: `Você utilizou ${summary.nationalLimitUsedPct.toFixed(1)}% do limite mensal de R$ 35.000,00 (${fmtBRL(summary.nationalDisposalsBRL)}).`,
      code: "THRESHOLD_70",
      timestamp: now,
    });
  } else if (summary.nationalLimitUsedPct >= 50) {
    alerts.push({
      id: `alert_50_${month}`,
      month,
      severity: "INFO",
      title: "ℹ️ Alerta de Acompanhamento (50%)",
      message: `Você já realizou ${fmtBRL(summary.nationalDisposalsBRL)} em alienações neste mês.`,
      code: "THRESHOLD_50",
      timestamp: now,
    });
  }

  // 2. Fee Artificial Deduction Alert (Requirement #14)
  const monthTrades = trades.filter((t) => t.dateTime.startsWith(month) && t.side === "SELL");
  monthTrades.forEach((t) => {
    if (t.fee > 0 && t.grossValue > 35000 && t.netValue <= 35000) {
      alerts.push({
        id: `alert_fee_${t.id}`,
        month,
        severity: "WARNING",
        title: "⚠️ Alerta de Abatimento de Taxa",
        message: `A alienação de ${fmtBRL(t.grossValue * (t.fxRateBRL || 5.074))} possui taxa de ${fmtBRL(t.fee * (t.fxRateBRL || 5.074))}. O valor bruto da alienação ultrapassa R$ 35.000. A taxa não deve ser utilizada para artificialmente reduzir o valor bruto para enquadramento na isenção.`,
        code: "FEE_ARTIFICIAL_DEDUCTION",
        timestamp: now,
      });
    }
  });

  // 3. International Regime Alert (Requirement #10)
  if (summary.internationalDisposalsBRL > 0) {
    alerts.push({
      id: `alert_intl_${month}`,
      month,
      severity: "INFO",
      title: "🌎 Regime de Operações Internacionais",
      message: `Você possui ${fmtBRL(summary.internationalDisposalsBRL)} em alienações internacionais neste mês. O tratamento tributário segue o regime de bens no exterior e a isenção mensal de R$ 35.000 não se aplica automaticamente.`,
      code: "INTERNATIONAL_REGIME",
      timestamp: now,
    });
  }

  // 4. Unknown Regime Alert (Requirement #10)
  if (summary.unknownRegimeCount > 0) {
    alerts.push({
      id: `alert_unknown_${month}`,
      month,
      severity: "WARNING",
      title: "⚠️ Regime Tributário Não Identificado",
      message: `Existem ${summary.unknownRegimeCount} operações com corretoras/custódias não identificadas. Revise o cadastro antes de concluir a apuração fiscal.`,
      code: "UNKNOWN_REGIME",
      timestamp: now,
    });
  }

  return alerts;
}
