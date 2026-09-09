import type {
  CryptoDisposal,
  CryptoTaxMonthSummary,
  TaxRuleVersion,
} from "./types";
import { CryptoLossEngine } from "./cryptoLossEngine";

export const DEFAULT_TAX_RULE_VERSION: TaxRuleVersion = {
  id: "BR_CRYPTO_35K_2026",
  name: "Instrução Normativa RFB nº 1.888 + Isenção Mensal R$ 35.000 (Nacional)",
  jurisdiction: "BR",
  regime: "NATIONAL",
  monthlyDisposalReference: 35000,
  effectiveFrom: "2026-01-01",
  effectiveUntil: null,
  description:
    "Isenção mensal de IR para alienações de criptoativos até R$ 35.000,00 acumulados no mês civil (01 ao último dia do mês) exclusivamente para exchanges nacionais. Operações internacionais são regidas pelo regime de ativos no exterior.",
};

export class CryptoTaxEngine {
  private lossEngine: CryptoLossEngine;
  private taxRuleVersion: TaxRuleVersion;

  constructor(lossEngine = new CryptoLossEngine(), taxRuleVersion = DEFAULT_TAX_RULE_VERSION) {
    this.lossEngine = lossEngine;
    this.taxRuleVersion = taxRuleVersion;
  }

  public setTaxRuleVersion(rule: TaxRuleVersion) {
    this.taxRuleVersion = rule;
  }

  public getTaxRuleVersion(): TaxRuleVersion {
    return this.taxRuleVersion;
  }

  public calculateMonthlySummary(month: string, disposals: CryptoDisposal[]): CryptoTaxMonthSummary {
    // Filter disposals for target month (YYYY-MM)
    const monthDisposals = disposals.filter((d) => d.dateTime.startsWith(month));

    const nationalDisposals = monthDisposals.filter((d) => d.taxRegime === "NATIONAL");
    const internationalDisposals = monthDisposals.filter((d) => d.taxRegime === "INTERNATIONAL");
    const unknownDisposals = monthDisposals.filter((d) => d.taxRegime === "UNKNOWN");

    // 1. NATIONAL DISPOSALS SUM (01 to last day of month)
    // Use GROSS PROCEEDS for threshold evaluation as per requirement #14
    const nationalDisposalsGrossBRL = nationalDisposals.reduce((sum, d) => sum + d.grossProceedsBRL, 0);
    const limitBRL = this.taxRuleVersion.monthlyDisposalReference; // 35000
    const limitUsedPct = (nationalDisposalsGrossBRL / limitBRL) * 100;
    const remainingLimitBRL = Math.max(0, limitBRL - nationalDisposalsGrossBRL);

    const nationalGainsBRL = nationalDisposals.filter((d) => d.gainLossBRL > 0).reduce((s, d) => s + d.gainLossBRL, 0);
    const nationalLossesBRL = nationalDisposals.filter((d) => d.gainLossBRL < 0).reduce((s, d) => s + Math.abs(d.gainLossBRL), 0);
    const nationalNetResultBRL = nationalGainsBRL - nationalLossesBRL;

    let nationalTaxableGainBRL = 0;
    let nationalEstimatedTaxBRL = 0;

    if (nationalDisposalsGrossBRL > limitBRL) {
      // Exceeded 35k limit: Entire net gain becomes taxable for national exchanges
      if (nationalNetResultBRL > 0) {
        const { netGainBRL } = this.lossEngine.offsetGain("NATIONAL", nationalNetResultBRL);
        nationalTaxableGainBRL = netGainBRL;
        nationalEstimatedTaxBRL = nationalTaxableGainBRL * 0.15; // 15% IR
      } else if (nationalNetResultBRL < 0) {
        this.lossEngine.registerLoss(month, "NATIONAL", Math.abs(nationalNetResultBRL));
      }
    } else {
      // Exempt: Under 35k limit
      // Mark all national disposals as exempt
      nationalDisposals.forEach((d) => {
        d.isExempt = true;
      });
    }

    // 2. INTERNATIONAL DISPOSALS SUM
    const internationalDisposalsGrossBRL = internationalDisposals.reduce((sum, d) => sum + d.grossProceedsBRL, 0);
    const internationalGainsBRL = internationalDisposals.filter((d) => d.gainLossBRL > 0).reduce((s, d) => s + d.gainLossBRL, 0);
    const internationalLossesBRL = internationalDisposals.filter((d) => d.gainLossBRL < 0).reduce((s, d) => s + Math.abs(d.gainLossBRL), 0);
    const internationalNetResultBRL = internationalGainsBRL - internationalLossesBRL;

    let internationalTaxableGainBRL = 0;
    let internationalEstimatedTaxBRL = 0;

    if (internationalNetResultBRL > 0) {
      const { netGainBRL } = this.lossEngine.offsetGain("INTERNATIONAL", internationalNetResultBRL);
      internationalTaxableGainBRL = netGainBRL;
      internationalEstimatedTaxBRL = internationalTaxableGainBRL * 0.15; // 15% IR
    } else if (internationalNetResultBRL < 0) {
      this.lossEngine.registerLoss(month, "INTERNATIONAL", Math.abs(internationalNetResultBRL));
    }

    // Determine Status
    let status: CryptoTaxMonthSummary["status"] = "OK";
    if (nationalDisposalsGrossBRL > limitBRL) {
      status = "EXCEEDED";
    } else if (nationalDisposalsGrossBRL === limitBRL) {
      status = "LIMIT_REACHED";
    } else if (limitUsedPct >= 90) {
      status = "WARNING_90";
    } else if (limitUsedPct >= 70) {
      status = "WARNING_70";
    } else if (limitUsedPct >= 50) {
      status = "WARNING_50";
    }

    return {
      month,
      nationalDisposalsBRL: nationalDisposalsGrossBRL,
      nationalExemptLimitBRL: limitBRL,
      nationalLimitUsedPct: Math.min(100, limitUsedPct),
      nationalRemainingLimitBRL: remainingLimitBRL,
      nationalGainsBRL,
      nationalLossesBRL,
      nationalNetResultBRL,
      nationalTaxableGainBRL,
      nationalEstimatedTaxBRL,
      internationalDisposalsBRL: internationalDisposalsGrossBRL,
      internationalGainsBRL,
      internationalLossesBRL,
      internationalNetResultBRL,
      internationalTaxableGainBRL,
      internationalEstimatedTaxBRL,
      lossesCarriedForwardBRL:
        this.lossEngine.getAvailableLoss("NATIONAL") + this.lossEngine.getAvailableLoss("INTERNATIONAL"),
      status,
      taxRuleVersion: this.taxRuleVersion,
      disposalsCount: monthDisposals.length,
      unknownRegimeCount: unknownDisposals.length,
    };
  }
}
