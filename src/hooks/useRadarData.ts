import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RadarStock {
  ticker: string;
  currentPrice: number;
  ath: number;
  athDate: string;
  distanceFromAth: number;
  potentialReturn: number;
  annualizedReturn: number;
  momentum: boolean;
  ma200: number;
  relativeStrength: number;
  revenueGrowth: number | null;
  probability30: number;
  score: number;
  volatility: number;
  avgVolume: number;
  sparklineData: number[];
  stockReturn12m: number;
  qualityBadge: string;
  opportunitySignal: string;
}

export interface RadarResponse {
  success: boolean;
  data: RadarStock[];
  allData: RadarStock[];
  sp500Return12m: number;
  updatedAt: string;
  totalAnalyzed: number;
  totalPassed: number;
  error?: string;
}

async function fetchRadar(tab: string): Promise<RadarResponse> {
  const { data, error } = await supabase.functions.invoke('radar-assimetria', {
    body: { tab },
  });
  if (error) throw new Error(error.message || 'Failed to invoke radar function');
  if (!data?.success) throw new Error(data?.error || 'Failed to fetch radar data');
  return data;
}

export function useRadarData(tab: string) {
  return useQuery({
    queryKey: ['radar', tab],
    queryFn: () => fetchRadar(tab),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
