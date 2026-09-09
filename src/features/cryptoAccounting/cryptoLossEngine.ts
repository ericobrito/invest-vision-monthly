import type { TaxRegime } from "./types";

export interface TaxLossRecord {
  id: string;
  month: string; // YYYY-MM
  regime: TaxRegime;
  originalLossBRL: number;
  remainingLossBRL: number;
}

export class CryptoLossEngine {
  private lossesByRegime: Map<TaxRegime, TaxLossRecord[]> = new Map();

  constructor() {
    this.lossesByRegime.set("NATIONAL", []);
    this.lossesByRegime.set("INTERNATIONAL", []);
  }

  public registerLoss(month: string, regime: TaxRegime, lossAmountBRL: number) {
    if (lossAmountBRL <= 0) return;
    const records = this.lossesByRegime.get(regime) || [];
    records.push({
      id: `loss_${regime}_${month}_${Date.now()}`,
      month,
      regime,
      originalLossBRL: lossAmountBRL,
      remainingLossBRL: lossAmountBRL,
    });
    this.lossesByRegime.set(regime, records);
  }

  public offsetGain(regime: TaxRegime, gainAmountBRL: number): { netGainBRL: number; offsetUsedBRL: number } {
    if (gainAmountBRL <= 0) return { netGainBRL: 0, offsetUsedBRL: 0 };
    const records = this.lossesByRegime.get(regime) || [];

    let remainingGain = gainAmountBRL;
    let offsetUsedBRL = 0;

    for (const record of records) {
      if (remainingGain <= 0) break;
      if (record.remainingLossBRL <= 0) continue;

      const offsetAmount = Math.min(remainingGain, record.remainingLossBRL);
      record.remainingLossBRL -= offsetAmount;
      remainingGain -= offsetAmount;
      offsetUsedBRL += offsetAmount;
    }

    return { netGainBRL: Math.max(0, remainingGain), offsetUsedBRL };
  }

  public getAvailableLoss(regime: TaxRegime): number {
    const records = this.lossesByRegime.get(regime) || [];
    return records.reduce((sum, r) => sum + r.remainingLossBRL, 0);
  }

  public reset() {
    this.lossesByRegime.get("NATIONAL")!.length = 0;
    this.lossesByRegime.get("INTERNATIONAL")!.length = 0;
  }
}
