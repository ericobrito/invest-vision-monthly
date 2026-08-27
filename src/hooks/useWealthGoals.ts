import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WealthGoals {
  id?: string;
  user_id?: string;
  target_wealth: number;
  target_aporte: number;
  target_emergency_reserve: number;
  target_leisure: number;
  target_fixed_cost: number;
  monthly_income: number;
  years_horizon: number;
}

export interface WealthGoalRecord {
  id?: string;
  user_id?: string;
  month: string; // YYYY-MM
  actual_aporte: number | null;
  actual_fixed_cost: number | null;
  actual_leisure: number | null;
  actual_emergency_reserve: number | null;
}

export const DEFAULT_GOALS: WealthGoals = {
  target_wealth: 1023000,
  target_aporte: 2200,
  target_emergency_reserve: 66000,
  target_leisure: 3300,
  target_fixed_cost: 5500,
  monthly_income: 10000,
  years_horizon: 16,
};

export function useWealthGoals() {
  const queryClient = useQueryClient();

  // 1. Fetch Goals
  const goalsQuery = useQuery({
    queryKey: ["wealth-goals"],
    queryFn: async (): Promise<WealthGoals> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("wealth_goals" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching wealth goals:", error);
        return DEFAULT_GOALS;
      }

      return data || DEFAULT_GOALS;
    },
  });

  // 2. Fetch Records
  const recordsQuery = useQuery({
    queryKey: ["wealth-goal-records"],
    queryFn: async (): Promise<WealthGoalRecord[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("wealth_goal_records" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("month", { ascending: true });

      if (error) {
        console.error("Error fetching wealth goal records:", error);
        return [];
      }

      return data || [];
    },
  });

  // 3. Update Goals Mutation
  const updateGoalsMutation = useMutation({
    mutationFn: async (updatedGoals: Partial<WealthGoals>): Promise<WealthGoals> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const payload = {
        ...DEFAULT_GOALS,
        ...updatedGoals,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      // Remove database-generated fields if not updating an existing row
      if (!payload.id) {
        delete payload.id;
      }

      const { data, error } = await supabase
        .from("wealth_goals" as any)
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wealth-goals"] });
    },
  });

  // 4. Save Record Mutation
  const saveRecordMutation = useMutation({
    mutationFn: async (record: Partial<WealthGoalRecord> & { month: string }): Promise<WealthGoalRecord> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const payload = {
        ...record,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("wealth_goal_records" as any)
        .upsert(payload, { onConflict: "user_id,month" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wealth-goal-records"] });
    },
  });

  // 5. Delete Record Mutation
  const deleteRecordMutation = useMutation({
    mutationFn: async (month: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("wealth_goal_records" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("month", month);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wealth-goal-records"] });
    },
  });

  return {
    goals: goalsQuery.data || DEFAULT_GOALS,
    isLoadingGoals: goalsQuery.isLoading,
    records: recordsQuery.data || [],
    isLoadingRecords: recordsQuery.isLoading,
    updateGoals: updateGoalsMutation.mutateAsync,
    isUpdatingGoals: updateGoalsMutation.isPending,
    saveRecord: saveRecordMutation.mutateAsync,
    isSavingRecord: saveRecordMutation.isPending,
    deleteRecord: deleteRecordMutation.mutateAsync,
    isDeletingRecord: deleteRecordMutation.isPending,
  };
}
