import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MonthlySnapshot, Investment, IncomeType, Region, Position, InvestmentMode } from "@/data/investments";
import { resolveInvestmentTotals } from "@/data/investments";
import { fetchFxRatesToBRL, getFxRate, type FxRates } from "@/lib/fx";
import { MarketDataService } from "@/services/MarketDataService";

function mapRow(row: any, investments: any[], positionsByInvestment: Map<string, Position[]>, fxRates: FxRates): MonthlySnapshot {
  const mappedInvestments: Investment[] = investments
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((inv: any): Investment => {
      const positions = positionsByInvestment.get(inv.id) || undefined;
      const mode = (inv.mode as InvestmentMode) || 'CONSOLIDATED';
      const totals = resolveInvestmentTotals(
        {
          mode,
          value: Number(inv.value),
          applied: inv.applied != null ? Number(inv.applied) : undefined,
          positions,
          currency: inv.currency || 'BRL',
        },
        undefined,
        fxRates,
      );
      // eslint-disable-next-line no-console
      console.debug("[audit/investment]", {
        investmentName: inv.name,
        mode,
        valueNative: totals.value,
        valueBRL: totals.valueBRL,
      });
      return {
        id: inv.id,
        name: inv.name,
        value: totals.value,
        valueBRL: totals.valueBRL,
        appliedBRL: totals.appliedBRL,
        currency: inv.currency || 'BRL',
        percentage: Number(inv.percentage),
        applied: totals.applied,
        totalReturn: inv.total_return != null ? Number(inv.total_return) : undefined,
        annualReturn: inv.annual_return != null ? Number(inv.annual_return) : undefined,
        yearStarted: inv.year_started ? (inv.year_started.length === 4 ? `${inv.year_started}-01-01` : inv.year_started) : undefined,
        incomeType: (inv.income_type as IncomeType) || 'fixed',
        region: (inv.region as Region) || 'brazil',
        flags: {
          includeInVariablePositions: inv.include_in_variable_positions === true,
        },
        mode,
        institution: inv.institution ?? undefined,
        connectionId: inv.connection_id ?? undefined,
        positions,
        valueMode: (inv.value_mode as any) || 'MANUAL',
        linkedAsset: inv.linked_provider && inv.linked_symbol
          ? { provider: inv.linked_provider, symbol: inv.linked_symbol }
          : undefined,
        quantity: inv.quantity != null ? Number(inv.quantity) : undefined,
        averagePrice: inv.average_price != null ? Number(inv.average_price) : undefined,
        currentPrice: inv.current_price != null ? Number(inv.current_price) : undefined,
        investedAmount: inv.invested_amount != null ? Number(inv.invested_amount) : undefined,
        lastPriceAt: inv.last_price_at ?? undefined,
      };
    });

  // Portfolio aggregation MUST use BRL-normalized values.
  const totalBRL = mappedInvestments.reduce((s, i) => s + (i.valueBRL ?? i.value), 0);
  // eslint-disable-next-line no-console
  console.debug("[audit/portfolio]", { month: row.month, totalPortfolioBRL: totalBRL, storedTotal: Number(row.total) });

  return {
    month: row.month,
    label: row.label,
    total: totalBRL > 0 ? totalBRL : Number(row.total),
    change: row.change_value != null ? { value: Number(row.change_value), percentage: Number(row.change_percentage) } : undefined,
    fixedIncome: row.fixed_income != null ? Number(row.fixed_income) : undefined,
    variableIncome: row.variable_income != null ? Number(row.variable_income) : undefined,
    brazil: row.brazil != null ? Number(row.brazil) : undefined,
    exterior: row.exterior != null ? Number(row.exterior) : undefined,
    growth2025: row.growth_2025 != null ? Number(row.growth_2025) : undefined,
    investments: mappedInvestments,
  };
}

export function useSnapshots() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["snapshots"],
    queryFn: async (): Promise<MonthlySnapshot[]> => {
      const [{ data: snapshots, error: sErr }, { data: investments, error: iErr }, fxRates] = await Promise.all([
        supabase.from("monthly_snapshots").select("*").order("month"),
        supabase.from("investments").select("*"),
        fetchFxRatesToBRL(),
      ]);
      if (sErr) throw sErr;
      if (iErr) throw iErr;

      const investmentIds = (investments || []).map((i: any) => i.id);
      const positionsByInvestment = new Map<string, Position[]>();
      let fetchedPositions: any[] = [];
      if (investmentIds.length > 0) {
        const { data: positions } = await (supabase as any)
          .from("investment_positions")
          .select("*")
          .in("investment_id", investmentIds);
        fetchedPositions = positions || [];
      }

      const invBySnapshot = new Map<string, any[]>();
      for (const inv of investments) {
        const list = invBySnapshot.get(inv.snapshot_id) || [];
        list.push(inv);
        invBySnapshot.set(inv.snapshot_id, list);
      }

      // Fetch live data for the latest snapshot's symbols and USD/BRL FX rate
      let liveQuotes: Record<string, number> = {};
      let liveUsdBrl = 0;
      const latestDbSnapshot = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

      if (latestDbSnapshot) {
        const latestInvestments = invBySnapshot.get(latestDbSnapshot.id) || [];
        const latestInvestmentIds = new Set(latestInvestments.map((i: any) => i.id));
        
        const latestSymbols = fetchedPositions
          .filter((p: any) => latestInvestmentIds.has(p.investment_id) && p.symbol)
          .map((p: any) => p.symbol.toUpperCase());
          
        if (latestSymbols.length > 0 || latestInvestments.some((inv: any) => inv.currency === "USD")) {
          try {
            const [quotesRes, usdBrlRes] = await Promise.all([
              MarketDataService.getMultipleQuotes(latestSymbols),
              MarketDataService.getUsdBrl()
            ]);
            liveQuotes = quotesRes;
            liveUsdBrl = usdBrlRes;
          } catch (e) {
            console.error("Failed to load live market data:", e);
          }
        }
      }

      for (const p of fetchedPositions) {
        const list = positionsByInvestment.get(p.investment_id) || [];
        const isLatest = latestDbSnapshot && p.investment_id && (() => {
          const latestInvestments = invBySnapshot.get(latestDbSnapshot.id) || [];
          return latestInvestments.some((inv: any) => inv.id === p.investment_id);
        })();

        let currentPrice = Number(p.current_price);
        let fxRate = p.fx_rate != null ? Number(p.fx_rate) : undefined;
        let currentValue = Number(p.current_value);
        let currentValueBRL = p.current_value_brl != null ? Number(p.current_value_brl) : undefined;
        let appliedAmountBRL = p.applied_amount_brl != null ? Number(p.applied_amount_brl) : undefined;

        if (isLatest) {
          const sym = (p.symbol || "").toUpperCase();
          const livePrice = liveQuotes[sym];
          if (livePrice !== undefined && livePrice > 0) {
            currentPrice = livePrice;
            currentValue = Number(p.quantity) * livePrice;
          }
          if (p.currency === "USD" && liveUsdBrl > 0) {
            fxRate = liveUsdBrl;
            currentValueBRL = currentValue * liveUsdBrl;
            appliedAmountBRL = Number(p.applied_amount) * liveUsdBrl;
          }
        }

        list.push({
          id: p.id,
          symbol: p.symbol,
          name: p.name ?? undefined,
          quantity: Number(p.quantity),
          averagePrice: Number(p.average_price),
          currentPrice,
          appliedAmount: Number(p.applied_amount),
          currentValue,
          currency: p.currency || 'BRL',
          currentValueBRL,
          appliedAmountBRL,
          fxRate,
          fxRateAt: p.fx_rate_at ?? undefined,
          provider: p.provider ?? undefined,
          lastPriceAt: p.last_price_at ?? undefined,
        });
        positionsByInvestment.set(p.investment_id, list);
      }

      return snapshots.map((s) => {
        const isLatest = latestDbSnapshot && s.id === latestDbSnapshot.id;
        const currentFxRates = isLatest && liveUsdBrl > 0 
          ? { ...fxRates, USD: liveUsdBrl } 
          : fxRates;
        return mapRow(s, invBySnapshot.get(s.id) || [], positionsByInvestment, currentFxRates);
      });
    },
  });

  const monthlyData = query.data;

  useEffect(() => {
    if (!monthlyData || monthlyData.length === 0) return;
    const latest = monthlyData[monthlyData.length - 1];
    const connectedInvs = latest.investments.filter(
      (inv) => inv.mode === "CONNECTED" && inv.connectionId
    );

    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    connectedInvs.forEach(async (inv) => {
      const lastSync = inv.lastPriceAt ? new Date(inv.lastPriceAt).getTime() : 0;
      if (now - lastSync > FIVE_MINUTES_MS) {
        console.log(`[useSnapshots] Background syncing connected investment: ${inv.name}`);
        try {
          await supabase.functions.invoke("variable-assets", {
            body: { action: "sync", connection_id: inv.connectionId },
          });
          await propagateConnectionValues(inv.connectionId);
          queryClient.invalidateQueries({ queryKey: ["snapshots"] });
        } catch (e) {
          console.error(`[useSnapshots] Failed to background sync ${inv.name}:`, e);
        }
      }
    });
  }, [monthlyData, queryClient]);

  return query;
}



export interface SnapshotFormData {
  month: string;
  label: string;
  total: number;
  changeValue?: number;
  changePercentage?: number;
  fixedIncome?: number;
  variableIncome?: number;
  brazil?: number;
  exterior?: number;
  growth2025?: number;
  investments: {
    name: string;
    value: number;
    percentage: number;
    applied?: number;
    totalReturn?: number;
    annualReturn?: number;
    yearStarted?: string;
    incomeType: IncomeType;
    region: Region;
    flags?: { includeInVariablePositions?: boolean };
    mode?: InvestmentMode;
    valueMode?: string;
    connectionId?: string;
    linkedAsset?: { provider: string; symbol: string };
    quantity?: number;
    averagePrice?: number;
    currentPrice?: number;
    investedAmount?: number;
    lastPriceAt?: string;
    currency?: string;
    positions?: Position[];
  }[];
}

/** Auto-calculate derived snapshot fields from investments and previous month */
export function computeDerivedFields(
  investments: SnapshotFormData['investments'],
  allSnapshots: MonthlySnapshot[],
  currentMonth: string
): Pick<SnapshotFormData, 'total' | 'changeValue' | 'changePercentage' | 'fixedIncome' | 'variableIncome' | 'brazil' | 'exterior' | 'growth2025'> {
  const total = investments.reduce((sum, inv) => sum + inv.value, 0);

  // Percentages by type
  const fixedTotal = investments.filter(i => i.incomeType === 'fixed').reduce((s, i) => s + i.value, 0);
  const variableTotal = investments.filter(i => i.incomeType === 'variable').reduce((s, i) => s + i.value, 0);
  const brazilTotal = investments.filter(i => i.region === 'brazil').reduce((s, i) => s + i.value, 0);
  const exteriorTotal = investments.filter(i => i.region === 'exterior').reduce((s, i) => s + i.value, 0);

  const fixedIncome = total > 0 ? Number(((fixedTotal / total) * 100).toFixed(2)) : undefined;
  const variableIncome = total > 0 ? Number(((variableTotal / total) * 100).toFixed(2)) : undefined;
  const brazil = total > 0 ? Number(((brazilTotal / total) * 100).toFixed(2)) : undefined;
  const exterior = total > 0 ? Number(((exteriorTotal / total) * 100).toFixed(2)) : undefined;

  // Change from previous month
  const sorted = [...allSnapshots].sort((a, b) => a.month.localeCompare(b.month));
  const prevMonths = sorted.filter(s => s.month < currentMonth);
  const prev = prevMonths.length > 0 ? prevMonths[prevMonths.length - 1] : undefined;

  let changeValue: number | undefined;
  let changePercentage: number | undefined;
  if (prev) {
    changeValue = Number((total - prev.total).toFixed(2));
    changePercentage = prev.total > 0 ? Number(((changeValue / prev.total) * 100).toFixed(2)) : undefined;
  }

  // Growth since Jan 2024
  const jan2024 = sorted.find(s => s.month === '2024-01');
  let growth2025: number | undefined;
  if (jan2024 && currentMonth >= '2024-01') {
    growth2025 = Number((total - jan2024.total).toFixed(2));
  }

  return { total, changeValue, changePercentage, fixedIncome, variableIncome, brazil, exterior, growth2025 };
}

export function useSaveSnapshot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, existingMonth }: { data: SnapshotFormData; existingMonth?: string }) => {
      if (existingMonth) {
        const { data: existing } = await supabase
          .from("monthly_snapshots")
          .select("id")
          .eq("month", existingMonth)
          .single();
        if (!existing) throw new Error("Snapshot not found");

        await supabase
          .from("monthly_snapshots")
          .update({
            month: data.month,
            label: data.label,
            total: data.total,
            change_value: data.changeValue ?? null,
            change_percentage: data.changePercentage ?? null,
            fixed_income: data.fixedIncome ?? null,
            variable_income: data.variableIncome ?? null,
            brazil: data.brazil ?? null,
            exterior: data.exterior ?? null,
            growth_2025: data.growth2025 ?? null,
          })
          .eq("id", existing.id)
          .throwOnError();

        await supabase.from("investments").delete().eq("snapshot_id", existing.id).throwOnError();

        if (data.investments.length > 0) {
          const { data: insertedInvs, error: insErr } = await supabase
            .from("investments")
            .insert(
              data.investments.map((inv, i) => ({
                snapshot_id: existing.id,
                name: inv.name,
                value: inv.value,
                percentage: inv.percentage,
                applied: inv.applied ?? null,
                total_return: inv.totalReturn ?? null,
                annual_return: inv.annualReturn ?? null,
                year_started: inv.yearStarted ?? null,
                income_type: inv.incomeType,
                region: inv.region,
                include_in_variable_positions: inv.flags?.includeInVariablePositions === true,
                sort_order: i,
                connection_id: inv.connectionId ?? null,
                mode: inv.mode ?? 'CONSOLIDATED',
                value_mode: inv.valueMode ?? 'MANUAL',
                linked_provider: inv.linkedAsset?.provider ?? null,
                linked_symbol: inv.linkedAsset?.symbol ?? null,
                quantity: inv.quantity ?? null,
                average_price: inv.averagePrice ?? null,
                current_price: inv.currentPrice ?? null,
                invested_amount: inv.investedAmount ?? null,
                last_price_at: inv.lastPriceAt ?? null,
                currency: inv.currency ?? 'BRL',
              }))
            )
            .select("id, name");
          if (insErr) throw insErr;

          // Insert detailed positions for any investments that have them!
          const positionsToInsert: any[] = [];
          for (const inv of data.investments) {
            if (inv.positions && inv.positions.length > 0) {
              const matchedDbInv = insertedInvs?.find((dbInv) => dbInv.name === inv.name);
              if (matchedDbInv) {
                for (const pos of inv.positions) {
                  positionsToInsert.push({
                    investment_id: matchedDbInv.id,
                    symbol: pos.symbol,
                    name: pos.name ?? null,
                    quantity: pos.quantity,
                    average_price: pos.averagePrice,
                    current_price: pos.currentPrice,
                    applied_amount: pos.appliedAmount,
                    current_value: pos.currentValue,
                    currency: pos.currency,
                    current_value_brl: pos.currentValueBRL ?? null,
                    applied_amount_brl: pos.appliedAmountBRL ?? null,
                    fx_rate: pos.fxRate ?? null,
                    fx_rate_at: pos.fxRateAt ?? null,
                    provider: pos.provider ?? null,
                    last_price_at: pos.lastPriceAt ?? null,
                  });
                }
              }
            }
          }
          if (positionsToInsert.length > 0) {
            const { error: posErr } = await supabase
              .from("investment_positions")
              .insert(positionsToInsert);
            if (posErr) throw posErr;
          }
        }
      } else {
        const { data: snap, error } = await supabase
          .from("monthly_snapshots")
          .insert({
            month: data.month,
            label: data.label,
            total: data.total,
            change_value: data.changeValue ?? null,
            change_percentage: data.changePercentage ?? null,
            fixed_income: data.fixedIncome ?? null,
            variable_income: data.variableIncome ?? null,
            brazil: data.brazil ?? null,
            exterior: data.exterior ?? null,
            growth_2025: data.growth2025 ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;

        if (data.investments.length > 0) {
          const { data: insertedInvs, error: insErr } = await supabase
            .from("investments")
            .insert(
              data.investments.map((inv, i) => ({
                snapshot_id: snap.id,
                name: inv.name,
                value: inv.value,
                percentage: inv.percentage,
                applied: inv.applied ?? null,
                total_return: inv.totalReturn ?? null,
                annual_return: inv.annualReturn ?? null,
                year_started: inv.yearStarted ?? null,
                income_type: inv.incomeType,
                region: inv.region,
                include_in_variable_positions: inv.flags?.includeInVariablePositions === true,
                sort_order: i,
                connection_id: inv.connectionId ?? null,
                mode: inv.mode ?? 'CONSOLIDATED',
                value_mode: inv.valueMode ?? 'MANUAL',
                linked_provider: inv.linkedAsset?.provider ?? null,
                linked_symbol: inv.linkedAsset?.symbol ?? null,
                quantity: inv.quantity ?? null,
                average_price: inv.averagePrice ?? null,
                current_price: inv.currentPrice ?? null,
                invested_amount: inv.investedAmount ?? null,
                last_price_at: inv.lastPriceAt ?? null,
                currency: inv.currency ?? 'BRL',
              }))
            )
            .select("id, name");
          if (insErr) throw insErr;

          // Insert detailed positions for any investments that have them!
          const positionsToInsert: any[] = [];
          for (const inv of data.investments) {
            if (inv.positions && inv.positions.length > 0) {
              const matchedDbInv = insertedInvs?.find((dbInv) => dbInv.name === inv.name);
              if (matchedDbInv) {
                for (const pos of inv.positions) {
                  positionsToInsert.push({
                    investment_id: matchedDbInv.id,
                    symbol: pos.symbol,
                    name: pos.name ?? null,
                    quantity: pos.quantity,
                    average_price: pos.averagePrice,
                    current_price: pos.currentPrice,
                    applied_amount: pos.appliedAmount,
                    current_value: pos.currentValue,
                    currency: pos.currency,
                    current_value_brl: pos.currentValueBRL ?? null,
                    applied_amount_brl: pos.appliedAmountBRL ?? null,
                    fx_rate: pos.fxRate ?? null,
                    fx_rate_at: pos.fxRateAt ?? null,
                    provider: pos.provider ?? null,
                    last_price_at: pos.lastPriceAt ?? null,
                  });
                }
              }
            }
          }
          if (positionsToInsert.length > 0) {
            const { error: posErr } = await supabase
              .from("investment_positions")
              .insert(positionsToInsert);
            if (posErr) throw posErr;
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (month: string) => {
      const { data: existing } = await supabase
        .from("monthly_snapshots")
        .select("id")
        .eq("month", month)
        .single();
      if (!existing) throw new Error("Not found");

      await supabase.from("monthly_snapshots").delete().eq("id", existing.id).throwOnError();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}

export async function propagateConnectionValues(connectionId: string) {
  try {
    const { data: positions, error: pErr } = await supabase
      .from("va_positions")
      .select("current_value")
      .eq("connection_id", connectionId);
    if (pErr) throw pErr;

    const totalBrl = (positions || []).reduce((sum, p) => sum + (Number(p.current_value) || 0), 0);

    const { data: latestSnap, error: snapErr } = await supabase
      .from("monthly_snapshots")
      .select("id, month")
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snapErr) throw snapErr;
    if (!latestSnap) return;

    // Update the investment in the DB
    const { error: invErr } = await supabase
      .from("investments")
      .update({
        value: totalBrl,
        last_price_at: new Date().toISOString(),
      })
      .eq("connection_id", connectionId)
      .eq("snapshot_id", latestSnap.id);
    if (invErr) throw invErr;

    // Recalculate snapshot totals and weights using BRL values
    const { data: allInvs, error: allErr } = await supabase
      .from("investments")
      .select("*")
      .eq("snapshot_id", latestSnap.id);
    if (allErr) throw allErr;
    if (!allInvs) return;

    const fxRates = await fetchFxRatesToBRL();
    
    // Map each investment to its BRL-normalized value
    const invsWithBRL = allInvs.map(inv => {
      const rate = getFxRate(inv.currency, fxRates);
      const valBRL = Number(inv.value) * rate;
      return {
        ...inv,
        valBRL,
      };
    });

    const totalBRLSum = invsWithBRL.reduce((s, i) => s + i.valBRL, 0);

    for (const inv of invsWithBRL) {
      const pct = totalBRLSum > 0 ? Number(((inv.valBRL / totalBRLSum) * 100).toFixed(2)) : 0;
      await supabase.from("investments").update({ percentage: pct }).eq("id", inv.id);
    }

    const { data: allSnapshots, error: snapListErr } = await supabase
      .from("monthly_snapshots")
      .select("*")
      .order("month");
    if (snapListErr) throw snapListErr;

    // Adapt allInvs for computeDerivedFields using BRL values!
    const invData = invsWithBRL.map(inv => {
      const rate = getFxRate(inv.currency, fxRates);
      const appliedBRL = inv.applied != null ? Number(inv.applied) * rate : undefined;
      return {
        name: inv.name,
        value: inv.valBRL, // Must pass BRL-normalized value here!
        percentage: 0,
        applied: appliedBRL,
        totalReturn: inv.total_return != null ? Number(inv.total_return) : undefined,
        annualReturn: inv.annual_return != null ? Number(inv.annual_return) : undefined,
        yearStarted: inv.year_started ?? undefined,
        incomeType: (inv.income_type as any) || "fixed",
        region: (inv.region as any) || "brazil",
      };
    });

    const derived = computeDerivedFields(invData, allSnapshots as any[], latestSnap.month);

    await supabase
      .from("monthly_snapshots")
      .update({
        total: derived.total,
        change_value: derived.changeValue ?? null,
        change_percentage: derived.changePercentage ?? null,
        fixed_income: derived.fixedIncome ?? null,
        variable_income: derived.variableIncome ?? null,
        brazil: derived.brazil ?? null,
        exterior: derived.exterior ?? null,
        growth_2025: derived.growth2025 ?? null,
      })
      .eq("id", latestSnap.id);

    console.log(`[propagate] Successfully updated database for connection ${connectionId}: Total=${totalBrl} (Native), BRL Sum=${totalBRLSum}`);
  } catch (e) {
    console.error("[propagate] Error propagating connection values:", e);
  }
}
