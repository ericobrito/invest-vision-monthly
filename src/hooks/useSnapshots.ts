import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MonthlySnapshot, Investment, IncomeType, Region } from "@/data/investments";

function mapRow(row: any, investments: any[]): MonthlySnapshot {
  const mappedInvestments: Investment[] = investments
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((inv: any): Investment => ({
      name: inv.name,
      value: Number(inv.value),
      percentage: Number(inv.percentage),
      applied: inv.applied != null ? Number(inv.applied) : undefined,
      totalReturn: inv.total_return != null ? Number(inv.total_return) : undefined,
      annualReturn: inv.annual_return != null ? Number(inv.annual_return) : undefined,
      yearStarted: inv.year_started ?? undefined,
      incomeType: (inv.income_type as IncomeType) || 'fixed',
      region: (inv.region as Region) || 'brazil',
    }));

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
    investments: mappedInvestments,
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
    incomeType: IncomeType;
    region: Region;
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

  // Growth since Jan 2025
  const jan2025 = sorted.find(s => s.month === '2025-01');
  let growth2025: number | undefined;
  if (jan2025 && currentMonth >= '2025-01') {
    growth2025 = Number((total - jan2025.total).toFixed(2));
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
                income_type: inv.incomeType,
                region: inv.region,
                sort_order: i,
              }))
            )
            .throwOnError();
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
                income_type: inv.incomeType,
                region: inv.region,
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
