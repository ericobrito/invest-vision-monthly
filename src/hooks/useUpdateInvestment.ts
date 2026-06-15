import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Investment, MonthlySnapshot } from "@/data/investments";
import { resolveInvestmentTotals } from "@/data/investments";
import { computeDerivedFields } from "@/hooks/useSnapshots";
import { fetchFxRatesToBRL, getFxRate } from "@/lib/fx";

interface UpdateParams {
  investmentName: string;
  snapshotMonth: string;
  updated: Investment;
  allSnapshots: MonthlySnapshot[];
}

export function useUpdateInvestment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ investmentName, snapshotMonth, updated, allSnapshots }: UpdateParams) => {
      const fxRates = await fetchFxRatesToBRL();

      const { data: snap } = await supabase
        .from("monthly_snapshots")
        .select("id")
        .eq("month", snapshotMonth)
        .single();
      if (!snap) throw new Error("Snapshot not found");

      const { data: invRows } = await supabase
        .from("investments")
        .select("*")
        .eq("snapshot_id", snap.id)
        .eq("name", investmentName);
      if (!invRows || invRows.length === 0) throw new Error("Investment not found");

      const invRow = invRows[0];
      const mode = updated.mode || "CONSOLIDATED";

      // Pre-compute BRL values on each position so DB is the audit source of truth.
      const nowIso = new Date().toISOString();
      const positionsWithBRL = (updated.positions ?? []).map((p) => {
        const rate = getFxRate(p.currency, fxRates);
        return {
          ...p,
          fxRate: rate,
          fxRateAt: nowIso,
          currentValueBRL: (Number(p.currentValue) || 0) * rate,
          appliedAmountBRL: (Number(p.appliedAmount) || 0) * rate,
        };
      });

      // Resolve effective totals based on mode (BRL-normalized).
      const totals = resolveInvestmentTotals(
        {
          mode,
          value: updated.value,
          applied: updated.applied,
          positions: positionsWithBRL,
          currency: updated.currency || "BRL",
        },
        undefined,
        fxRates,
      );

      await supabase
        .from("investments")
        .update({
          name: updated.name,
          // Persist BRL-normalized value for portfolio aggregation.
          value: totals.valueBRL,
          applied: totals.appliedBRL ?? null,
          currency: updated.currency || "BRL",
          year_started: updated.yearStarted ?? null,
          total_return: updated.totalReturn ?? null,
          annual_return: updated.annualReturn ?? null,
          income_type: updated.incomeType || "fixed",
          region: updated.region || "brazil",
          include_in_variable_positions: updated.flags?.includeInVariablePositions === true,
          mode,
          institution: updated.institution ?? null,
          connection_id: updated.connectionId ?? null,
          value_mode: updated.valueMode || "MANUAL",
          linked_provider: updated.linkedAsset?.provider ?? null,
          linked_symbol: updated.linkedAsset?.symbol ?? null,
          quantity: updated.quantity ?? null,
          average_price: updated.averagePrice ?? null,
          current_price: updated.currentPrice ?? null,
          invested_amount: updated.investedAmount ?? null,
          last_price_at: updated.lastPriceAt ?? null,
        } as any)
        .eq("id", invRow.id)
        .throwOnError();

      // Sync positions for DETAILED mode (delete all + reinsert is simpler/safer).
      await (supabase as any)
        .from("investment_positions")
        .delete()
        .eq("investment_id", invRow.id);

      if (mode === "DETAILED" && positionsWithBRL.length > 0) {
        await (supabase as any)
          .from("investment_positions")
          .insert(
            positionsWithBRL.map((p, i) => ({
              investment_id: invRow.id,
              symbol: p.symbol,
              name: p.name ?? null,
              quantity: p.quantity,
              average_price: p.averagePrice,
              current_price: p.currentPrice,
              applied_amount: p.appliedAmount,
              current_value: p.currentValue,
              currency: p.currency || "BRL",
              current_value_brl: p.currentValueBRL,
              applied_amount_brl: p.appliedAmountBRL,
              fx_rate: p.fxRate,
              fx_rate_at: p.fxRateAt,
              provider: p.provider ?? null,
              sort_order: i,
              last_price_at: p.lastPriceAt ?? null,
            }))
          )
          .throwOnError();
      }

      // Recalculate snapshot totals using BRL values stored on investments.value
      const { data: allInvs } = await supabase
        .from("investments")
        .select("*")
        .eq("snapshot_id", snap.id);
      if (!allInvs) return;

      const total = allInvs.reduce((s, i) => s + Number(i.value), 0);

      for (const inv of allInvs) {
        const pct = total > 0 ? Number(((Number(inv.value) / total) * 100).toFixed(2)) : 0;
        await supabase.from("investments").update({ percentage: pct }).eq("id", inv.id).throwOnError();
      }

      const invData = allInvs.map(inv => ({
        name: inv.name,
        value: Number(inv.value),
        percentage: 0,
        applied: inv.applied != null ? Number(inv.applied) : undefined,
        totalReturn: inv.total_return != null ? Number(inv.total_return) : undefined,
        annualReturn: inv.annual_return != null ? Number(inv.annual_return) : undefined,
        yearStarted: inv.year_started ?? undefined,
        incomeType: (inv.income_type as "fixed" | "variable") || "fixed",
        region: (inv.region as "brazil" | "exterior") || "brazil",
      }));

      const derived = computeDerivedFields(invData, allSnapshots, snapshotMonth);

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
        .eq("id", snap.id)
        .throwOnError();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}

