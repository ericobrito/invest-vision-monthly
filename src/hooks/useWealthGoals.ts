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
  target_urgent_expense: number;
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

export interface WealthBudgetItem {
  id?: string;
  user_id?: string;
  month: string; // YYYY-MM
  category: "aporte" | "fixed_cost" | "leisure" | "urgent_expense";
  description: string;
  value: number;
  created_at?: string;
}

export const DEFAULT_GOALS: WealthGoals = {
  target_wealth: 1023000,
  target_aporte: 2200,
  target_emergency_reserve: 66000,
  target_leisure: 3300,
  target_fixed_cost: 5500,
  target_urgent_expense: 0,
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
        .from("wealth_goals")
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
        .from("wealth_goal_records")
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

  // 3. Fetch Budget Items
  const budgetItemsQuery = useQuery({
    queryKey: ["wealth-budget-items"],
    queryFn: async (): Promise<WealthBudgetItem[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("wealth_budget_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching wealth budget items:", error);
        return [];
      }

      return (data || []) as WealthBudgetItem[];
    },
  });

  // 4. Update Goals Mutation
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
        .from("wealth_goals")
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

  // 5. Save Record Mutation
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
        .from("wealth_goal_records")
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

  // 6. Delete Record Mutation
  const deleteRecordMutation = useMutation({
    mutationFn: async (month: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("wealth_goal_records")
        .delete()
        .eq("user_id", user.id)
        .eq("month", month);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wealth-goal-records"] });
    },
  });

  // 7. Save Budget Item Mutation
  const saveBudgetItemMutation = useMutation({
    mutationFn: async (item: Partial<WealthBudgetItem> & { month: string; category: string; description: string; value: number }): Promise<WealthBudgetItem> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const payload = {
        ...item,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("wealth_budget_items")
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as WealthBudgetItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wealth-budget-items"] });
    },
  });

  // 8. Delete Budget Item Mutation
  const deleteBudgetItemMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("wealth_budget_items")
        .delete()
        .eq("user_id", user.id)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wealth-budget-items"] });
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
    budgetItems: budgetItemsQuery.data || [],
    isLoadingBudgetItems: budgetItemsQuery.isLoading,
    saveBudgetItem: saveBudgetItemMutation.mutateAsync,
    isSavingBudgetItem: saveBudgetItemMutation.isPending,
    deleteBudgetItem: deleteBudgetItemMutation.mutateAsync,
    isDeletingBudgetItem: deleteBudgetItemMutation.isPending,
  };
}
