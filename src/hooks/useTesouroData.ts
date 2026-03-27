import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TesouroBond {
  name: string;
  type: "IPCA" | "PREFIXADO";
  maturityDate: string;
  maturityYears: number;
  buyRate: number;
  sellRate: number;
  price: number;
  score: number;
  statusLabel: string;
  statusEmoji: string;
}

export interface TesouroResponse {
  success: boolean;
  data: TesouroBond[];
  updatedAt: string;
  total: number;
  error?: string;
}

async function fetchTesouro(): Promise<TesouroResponse> {
  const { data, error } = await supabase.functions.invoke("radar-tesouro");
  if (error) throw new Error(error.message || "Failed to invoke tesouro function");
  if (!data?.success) throw new Error(data?.error || "Failed to fetch tesouro data");
  return data;
}

export function useTesouroData() {
  return useQuery({
    queryKey: ["radar-tesouro"],
    queryFn: fetchTesouro,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
