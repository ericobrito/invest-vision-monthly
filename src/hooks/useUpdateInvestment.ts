import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Investment } from "@/data/investments";
import { computeDerivedFields } from "@/hooks/useSnapshots";
import type { MonthlySnapshot } from "@/data/investments";

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
      // Get snapshot id
      const { data: snap } = await supabase
        .from("monthly_snapshots")
        .select("id")
        .eq("month", snapshotMonth)
        .single();
      if (!snap) throw new Error("Snapshot not found");

      // Get the investment row by name + snapshot
      const { data: invRows } = await supabase
        .from("investments")
        .select("*")
        .eq("snapshot_id", snap.id)
        .eq("name", investmentName);
      if (!invRows || invRows.length === 0) throw new Error("Investment not found");

      const invRow = invRows[0];

      // Update the investment
      await supabase
        .from("investments")
        .update({
          name: updated.name,
          value: updated.value,
          applied: updated.applied ?? null,
          year_started: updated.yearStarted ?? null,
          total_return: updated.totalReturn ?? null,
          annual_return: updated.annualReturn ?? null,
          income_type: updated.incomeType || "fixed",
          region: updated.region || "brazil",
        })
        .eq("id", invRow.id)
        .throwOnError();

      // Recalculate snapshot totals: fetch all investments for this snapshot
      const { data: allInvs } = await supabase
        .from("investments")
        .select("*")
        .eq("snapshot_id", snap.id);
      if (!allInvs) return;

      const total = allInvs.reduce((s, i) => s + Number(i.value), 0);

      // Update percentages
      for (const inv of allInvs) {
        const pct = total > 0 ? Number(((Number(inv.value) / total) * 100).toFixed(2)) : 0;
        await supabase.from("investments").update({ percentage: pct }).eq("id", inv.id).throwOnError();
      }

      // Recompute snapshot derived fields
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
