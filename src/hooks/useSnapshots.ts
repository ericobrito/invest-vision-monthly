import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MonthlySnapshot, Investment } from "@/data/investments";

function mapRow(row: any, investments: any[]): MonthlySnapshot {
  return {
    month: row.month,
    label: row.label,
    total: Number(row.total),
    change: row.change_value != null ? { value: Number(row.change_value), percentage: Number(row.change_percentage) } : undefined,
    fixedIncome: row.fixed_income != null ? Number(row.fixed_income) : undefined,
    variableIncome: row.variable_income != null ? Number(row.variable_income) : undefined,
    brazil: row.brazil != null ? Number(row.brazil) : undefined,
    exterior: row.exterior != null ? Number(row.exterior) : undefined,
    growth2025: row.growth_2025 != null ? Number(row.growth_2025) : undefined,
    investments: investments
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((inv: any): Investment => ({
        name: inv.name,
        value: Number(inv.value),
        percentage: Number(inv.percentage),
        applied: inv.applied != null ? Number(inv.applied) : undefined,
        totalReturn: inv.total_return != null ? Number(inv.total_return) : undefined,
        annualReturn: inv.annual_return != null ? Number(inv.annual_return) : undefined,
        yearStarted: inv.year_started ?? undefined,
      })),
  };
}

export function useSnapshots() {
  return useQuery({
    queryKey: ["snapshots"],
    queryFn: async (): Promise<MonthlySnapshot[]> => {
      const { data: snapshots, error: sErr } = await supabase
        .from("monthly_snapshots")
        .select("*")
        .order("month");
      if (sErr) throw sErr;

      const { data: investments, error: iErr } = await supabase
        .from("investments")
        .select("*");
      if (iErr) throw iErr;

      const invBySnapshot = new Map<string, any[]>();
      for (const inv of investments) {
        const list = invBySnapshot.get(inv.snapshot_id) || [];
        list.push(inv);
        invBySnapshot.set(inv.snapshot_id, list);
      }

      return snapshots.map((s) => mapRow(s, invBySnapshot.get(s.id) || []));
    },
  });
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
  }[];
}

export function useSaveSnapshot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, existingMonth }: { data: SnapshotFormData; existingMonth?: string }) => {
      // Upsert snapshot
      if (existingMonth) {
        // Update existing
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

        // Delete old investments
        await supabase.from("investments").delete().eq("snapshot_id", existing.id).throwOnError();

        // Insert new investments
        if (data.investments.length > 0) {
          await supabase
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
                sort_order: i,
              }))
            )
            .throwOnError();
        }
      } else {
        // Insert new
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
          await supabase
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
                sort_order: i,
              }))
            )
            .throwOnError();
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
