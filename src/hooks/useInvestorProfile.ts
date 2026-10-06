import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { profileEngine, type ProfileInput, type ProfileEngineResult } from "@/services/ProfileEngine";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useWealthGoals } from "@/hooks/useWealthGoals";

const STORAGE_KEY = "invest_vision_investor_profile";

export interface StoredInvestorProfile extends ProfileInput {
  result?: ProfileEngineResult;
  updatedAt?: string;
}

const DEFAULT_PROFILE_INPUT: ProfileInput = {
  investedAssets: 0,
  monthlyContribution: 0,
  monthlyIncome: 0,
  age: 35,
  investmentHorizonYears: 15,
  riskProfile: "Moderado",
};

export function useInvestorProfile() {
  const queryClient = useQueryClient();
  const { data: snapshots = [] } = useSnapshots();
  const { goals } = useWealthGoals();

  // Auto-derived defaults from application single sources of truth
  const defaultInvestedAssets = useMemo(() => {
    if (snapshots.length > 0) {
      const latest = snapshots[snapshots.length - 1];
      return latest.total || 0;
    }
    return 0;
  }, [snapshots]);

  const defaultMonthlyContribution = useMemo(() => {
    return goals?.target_aporte || 0;
  }, [goals]);

  const defaultMonthlyIncome = useMemo(() => {
    return goals?.monthly_income || 0;
  }, [goals]);

  // Load profile query
  const query = useQuery({
    queryKey: ["investor-profile"],
    queryFn: async (): Promise<StoredInvestorProfile> => {
      // 1. Try Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("user_investor_profile" as any)
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (data && !error) {
            return {
              investedAssets: Number((data as any).invested_assets) || 0,
              monthlyContribution: Number((data as any).monthly_contribution) || 0,
              monthlyIncome: Number((data as any).monthly_income) || 0,
              age: Number((data as any).age) || 35,
              investmentHorizonYears: Number((data as any).investment_horizon_years) || 15,
              riskProfile: (data as any).risk_profile || "Moderado",
              updatedAt: (data as any).updated_at,
            };
          }
        }
      } catch (err) {
        console.warn("[useInvestorProfile] Supabase table read fallback:", err);
      }

      // 2. Try localStorage fallback
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          return parsed;
        }
      } catch (e) {
        console.warn("[useInvestorProfile] localStorage read fallback:", e);
      }

      // 3. Fallback to derived defaults
      return {
        ...DEFAULT_PROFILE_INPUT,
        investedAssets: defaultInvestedAssets,
        monthlyContribution: defaultMonthlyContribution,
        monthlyIncome: defaultMonthlyIncome,
      };
    },
  });

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async (input: ProfileInput): Promise<StoredInvestorProfile> => {
      const calculatedResult = profileEngine.calculate(input);
      const updatedAt = new Date().toISOString();
      const payload: StoredInvestorProfile = {
        ...input,
        result: calculatedResult,
        updatedAt,
      };

      // 1. Save to LocalStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn("[useInvestorProfile] LocalStorage save error:", e);
      }

      // 2. Try saving to Supabase if authenticated
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("user_investor_profile" as any).upsert({
            user_id: user.id,
            invested_assets: input.investedAssets,
            monthly_contribution: input.monthlyContribution,
            monthly_income: input.monthlyIncome,
            age: input.age,
            investment_horizon_years: input.investmentHorizonYears,
            risk_profile: input.riskProfile,
            stage: calculatedResult.stage,
            accumulation_ratio: calculatedResult.accumulationRatio,
            annual_contribution: calculatedResult.annualContribution,
            main_priority: calculatedResult.mainPriority,
            engine_version: calculatedResult.engineVersion,
            calculated_at: calculatedResult.calculatedAt,
            updated_at: updatedAt,
          } as any);
        }
      } catch (err) {
        console.warn("[useInvestorProfile] Supabase upsert optional error:", err);
      }

      return payload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["investor-profile"], data);
    },
  });

  // Dynamically compute current result based on query data or fallback to auto-derived defaults
  const profileInput: ProfileInput = useMemo(() => {
    const qData = query.data;
    return {
      investedAssets: qData?.investedAssets ?? defaultInvestedAssets,
      monthlyContribution: qData?.monthlyContribution ?? defaultMonthlyContribution,
      monthlyIncome: qData?.monthlyIncome ?? defaultMonthlyIncome,
      age: qData?.age ?? 35,
      investmentHorizonYears: qData?.investmentHorizonYears ?? 15,
      riskProfile: qData?.riskProfile ?? "Moderado",
    };
  }, [query.data, defaultInvestedAssets, defaultMonthlyContribution, defaultMonthlyIncome]);

  const calculationResult: ProfileEngineResult = useMemo(() => {
    return profileEngine.calculate(profileInput);
  }, [profileInput]);

  return {
    profileInput,
    calculationResult,
    isLoading: query.isLoading,
    saveProfile: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    defaultInvestedAssets,
    defaultMonthlyContribution,
  };
}
