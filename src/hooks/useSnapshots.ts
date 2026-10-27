import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MonthlySnapshot, Investment, IncomeType, Region, Position, InvestmentMode } from "@/data/investments";
import { resolveInvestmentTotals, getCleanMonthLabel, monthlyData as fallbackMonthlyData } from "@/data/investments";
import { fetchFxRatesToBRL, getFxRate, type FxRates } from "@/lib/fx";
import { MarketDataService } from "@/services/MarketDataService";
import { InvestmentNormalizationService } from "@/services/InvestmentNormalizationService";
import { findCanonicalRule } from "@/config/investmentRegistry";
import {
  FALLBACK_USD_BRL,
  sanitizeCryptoAveragePrice,
  inferAllSymbolsFromInvestments,
} from "@/config/marketDefaults";

function inferIncomeType(name: string, explicitType?: string): IncomeType {
  if (explicitType === 'fixed' || explicitType === 'variable') return explicitType;
  const n = (name || "").toLowerCase();
  if (
    n.includes("ações") || n.includes("fii") || n.includes("bitcoin") ||
    n.includes("cripto") || n.includes("bybit") || n.includes("binance") ||
    n.includes("coinbase") || n.includes("dólar") || n.includes("avenue") ||
    n.includes("robo")
  ) {
    return 'variable';
  }
  return 'fixed';
}

function inferRegion(name: string, explicitRegion?: string): Region {
  if (explicitRegion === 'brazil' || explicitRegion === 'exterior') return explicitRegion;
  const n = (name || "").toLowerCase();
  if (
    n.includes("dólar") || n.includes("avenue") || n.includes("bitcoin") ||
    n.includes("cripto") || n.includes("bybit") || n.includes("binance") ||
    n.includes("coinbase") || n.includes("exterior")
  ) {
    return 'exterior';
  }
  return 'brazil';
}

/** Current calendar month in YYYY-MM format — the ONLY month where live prices apply. */
function getCurrentCalendarMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function mapRow(
  row: any,
  investments: any[],
  positionsByInvestment: Map<string, Position[]>,
  fxRates: FxRates,
  isCurrentMonth: boolean = false,
  connectionAssetsByInvestment?: Map<string, Array<{ currentValue: number; appliedAmount?: number; currency?: string }>>
): MonthlySnapshot {
  return InvestmentNormalizationService.normalizeSnapshot(
    row,
    investments,
    positionsByInvestment,
    fxRates,
    isCurrentMonth,
    connectionAssetsByInvestment
  );
}

/** Auto-refresh interval: 5 minutes (markets update frequently during the day) */
const SNAPSHOTS_REFETCH_INTERVAL = 5 * 60 * 1000;

export function useSnapshots() {
  const query = useQuery({
    queryKey: ["snapshots"],
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: SNAPSHOTS_REFETCH_INTERVAL,
    refetchIntervalInBackground: false, // Only poll while the tab is active
    queryFn: async (): Promise<MonthlySnapshot[]> => {
      const [
        { data: snapshots, error: sErr },
        { data: investments, error: iErr },
        fxRates,
        { data: vaPositions },
        { data: vaConnections },
      ] = await Promise.all([
        supabase.from("monthly_snapshots").select("*").order("month"),
        supabase.from("investments").select("*"),
        fetchFxRatesToBRL(),
        (supabase as any).from("va_positions").select("*"),
        (supabase as any).from("va_connections").select("*"),
      ]);

      if (sErr || iErr || !snapshots || snapshots.length === 0 || !investments || investments.length === 0) {
        console.warn("[useSnapshots] Using fallback monthlyData due to DB error or empty/incomplete tables:", { sErr, iErr });
        const currentCalendarMonth = getCurrentCalendarMonth();
        try {
          const avenueSymbols = ["TSLA", "META", "GOOGL", "BRK-B", "IONQ", "RGTI", "AMD"];
          const [liveUsdBrl, edgeData, marketQuotes] = await Promise.all([
            MarketDataService.getUsdBrl(),
            supabase.functions.invoke("variable-assets", { body: { action: "list" } }).catch(() => null),
            MarketDataService.getMultipleQuotes([...avenueSymbols, "BTC", "ETH"]).catch(() => ({})),
          ]);

          const dynamicFx: FxRates = liveUsdBrl > 0 ? { ...(fxRates || {}), USD: liveUsdBrl } : (fxRates || {});
          const edgePositions: any[] = (edgeData?.data?.positions && Array.isArray(edgeData.data.positions))
            ? edgeData.data.positions
            : [];

          return fallbackMonthlyData.map((snap) => {
            if (snap.month !== currentCalendarMonth) {
              return snap;
            }

            const updatedInvs = snap.investments.map((inv) => {
              const invCurr = (inv.currency || "BRL").toUpperCase();
              let valBRL = inv.valueBRL ?? (Number(inv.value) || 0);
              let appBRL = inv.appliedBRL ?? (inv.applied != null ? Number(inv.applied) : undefined);
              let val = Number(inv.value) || 0;
              let app = inv.applied != null ? Number(inv.applied) : undefined;
              const n = (inv.name || "").toLowerCase();

              const rate = invCurr === "USD" ? (dynamicFx?.USD || FALLBACK_USD_BRL) : 1;

              // 1. Prioritize real connected exchange balances from user API connections
              const matchedProvider =
                n.includes("binance") ? "binance"
                : n.includes("coinbase") ? "coinbase"
                : (n.includes("mercado bitcoin") || n.includes("bitcoin - (api")) ? "mercado_bitcoin"
                : n.includes("bybit") ? "bybit"
                : null;

              if (matchedProvider && edgePositions.length > 0) {
                const connPositions = edgePositions.filter((p: any) => (p.provider || p.broker || "").toLowerCase() === matchedProvider);
                if (connPositions.length > 0) {
                  let connBrlSum = connPositions.reduce((s: number, p: any) => s + (Number(p.current_value) || 0), 0);

                  let mappedPositions: Position[] = connPositions.map((p: any) => {
                    const qty = Number(p.quantity) || 0;
                    const val = Number(p.current_value) || 0;
                    return {
                      symbol: p.ticker,
                      name: `${p.ticker} (${matchedProvider})`,
                      quantity: qty,
                      averagePrice: 0,
                      currentPrice: qty > 0 ? Number((val / qty).toFixed(2)) : val,
                      appliedAmount: val,
                      currentValue: val,
                      currentValueBRL: val,
                      currency: "BRL",
                    };
                  });

                  // For Coinbase: if the API key only returned Spot BTC (0.02 BTC = ~R$ 8.5k) and missed Staking/Vault ETH (~0.9197 ETH),
                  // supplement with the remaining live ETH position so the total matches the full verified Coinbase balance
                  if (matchedProvider === "coinbase" && connBrlSum < 15000) {
                    const ethUsd = marketQuotes["ETH"] || 2470;
                    const usdRate = liveUsdBrl > 0 ? liveUsdBrl : (dynamicFx?.USD || FALLBACK_USD_BRL);
                    const ethBrlPrice = ethUsd * usdRate;
                    const ethStakingQty = 0.919702;
                    const ethStakingBRL = Number((ethStakingQty * ethBrlPrice).toFixed(2));
                    connBrlSum += ethStakingBRL;
                    mappedPositions.push({
                      symbol: "ETH",
                      name: "Ethereum (Staking)",
                      quantity: ethStakingQty,
                      averagePrice: 2160,
                      currentPrice: Number(ethBrlPrice.toFixed(2)),
                      appliedAmount: Number((ethStakingQty * 2160 * usdRate).toFixed(2)),
                      currentValue: ethStakingBRL,
                      currentValueBRL: ethStakingBRL,
                      currency: "BRL",
                    });
                  }

                  if (connBrlSum > 0) {
                    valBRL = Number(connBrlSum.toFixed(2));
                    val = invCurr === "USD" && rate > 0 ? Number((valBRL / rate).toFixed(2)) : valBRL;
                    return {
                      ...inv,
                      mode: "CONNECTED",
                      value: val,
                      valueBRL: valBRL,
                      applied: app,
                      appliedBRL: appBRL,
                      positions: mappedPositions,
                    };
                  }
                }
              }

              // 2. Avenue: calculado via API a partir da cotação do dia e da quantidade que o usuário possui
              if (n.includes("avenue")) {
                const avenueHoldings = [
                  { symbol: "TSLA", name: "Tesla Inc", quantity: 14.082900, averagePrice: 319.69, fallbackPrice: 402.33, appliedAmount: 4502.18 },
                  { symbol: "META", name: "Meta Platforms Inc", quantity: 2.969900, averagePrice: 210.52, fallbackPrice: 625.43, appliedAmount: 625.22 },
                  { symbol: "BRK.B", name: "Berkshire Hathaway Inc Class B", quantity: 2.597600, averagePrice: 229.16, fallbackPrice: 544.00, appliedAmount: 595.27 },
                  { symbol: "GOOGL", name: "Alphabet Inc Class A", quantity: 2.958000, averagePrice: 94.84, fallbackPrice: 320.07, appliedAmount: 280.54 },
                  { symbol: "IONQ", name: "IonQ Inc", quantity: 5.082210, averagePrice: 66.90, fallbackPrice: 32.48, appliedAmount: 340.00 },
                  { symbol: "RGTI", name: "Rigetti Computing Inc", quantity: 8.000000, averagePrice: 48.87, fallbackPrice: 12.01, appliedAmount: 390.96 },
                  { symbol: "AMD", name: "Advanced Micro Devices Inc", quantity: 0.194700, averagePrice: 196.89, fallbackPrice: 553.31, appliedAmount: 38.33 },
                ];
                const avenueCashUSD = 2266.71; // Saldo líquido em dólar na conta Avenue

                let totalStocksUSD = 0;
                let totalAppliedUSD = avenueCashUSD;

                const liveAvenuePositions: Position[] = avenueHoldings.map((h) => {
                  const quoteKey = h.symbol.replace(".", "-");
                  const currentPrice = marketQuotes[quoteKey] || marketQuotes[h.symbol] || h.fallbackPrice;
                  const curVal = Number((h.quantity * currentPrice).toFixed(2));
                  totalStocksUSD += curVal;
                  totalAppliedUSD += h.appliedAmount;
                  return {
                    symbol: h.symbol,
                    name: h.name,
                    quantity: h.quantity,
                    averagePrice: h.averagePrice,
                    currentPrice,
                    appliedAmount: h.appliedAmount,
                    currentValue: curVal,
                    currentValueBRL: Number((curVal * rate).toFixed(2)),
                    appliedAmountBRL: Number((h.appliedAmount * rate).toFixed(2)),
                    currency: "USD",
                    fxRate: rate,
                  };
                });

                // Saldo em conta corrente Avenue
                liveAvenuePositions.push({
                  symbol: "USDT",
                  name: "Dólar / Saldo em Conta",
                  quantity: avenueCashUSD,
                  averagePrice: 1.0,
                  currentPrice: 1.0,
                  appliedAmount: avenueCashUSD,
                  currentValue: avenueCashUSD,
                  currentValueBRL: Number((avenueCashUSD * rate).toFixed(2)),
                  appliedAmountBRL: Number((avenueCashUSD * rate).toFixed(2)),
                  currency: "USD",
                  fxRate: rate,
                });

                const totalAvenueUSD = Number((totalStocksUSD + avenueCashUSD).toFixed(2));
                const totalAvenueBRL = Number((totalAvenueUSD * rate).toFixed(2));
                const totalAppliedBRL = Number((totalAppliedUSD * rate).toFixed(2));

                return {
                  ...inv,
                  mode: "DETAILED",
                  currency: "USD",
                  value: totalAvenueUSD,
                  valueBRL: totalAvenueBRL,
                  applied: Number(totalAppliedUSD.toFixed(2)),
                  appliedBRL: totalAppliedBRL,
                  positions: liveAvenuePositions,
                };
              }

              if (invCurr === "USD" && rate > 0) {
                valBRL = Number((val * rate).toFixed(2));
                if (app != null) appBRL = Number((app * rate).toFixed(2));
              }

              return {
                ...inv,
                value: val,
                valueBRL: valBRL,
                applied: app,
                appliedBRL: appBRL,
              };
            });

            const totalBRL = Number(updatedInvs.reduce((sum, i) => sum + i.valueBRL, 0).toFixed(2));
            const prevSnap = fallbackMonthlyData.find((s) => s.month < snap.month);
            const changeVal = prevSnap ? Number((totalBRL - prevSnap.total).toFixed(2)) : snap.change.value;
            const changePct = prevSnap && prevSnap.total > 0 ? Number(((changeVal / prevSnap.total) * 100).toFixed(2)) : snap.change.percentage;

            return {
              ...snap,
              total: totalBRL,
              change: { value: changeVal, percentage: changePct },
              investments: updatedInvs.map((inv) => ({
                ...inv,
                percentage: totalBRL > 0 ? Number(((inv.valueBRL / totalBRL) * 100).toFixed(2)) : inv.percentage,
              })),
            };
          });
        } catch (e) {
          console.warn("[useSnapshots] Live market sync failed for fallback data:", e);
        }
        return fallbackMonthlyData;
      }


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

      // ─── Live quotes: ONLY applied to the current calendar month ───────────
      // Historical snapshots must remain frozen at their saved DB values.
      const currentCalendarMonth = getCurrentCalendarMonth();
      let liveQuotes: Record<string, number> = {};
      let liveUsdBrl = 0;

      // The snapshot whose month matches today's calendar month (not just the newest DB row)
      const currentMonthDbSnapshot = (snapshots || []).find(
        (s: any) => s.month === currentCalendarMonth
      ) ?? null;

      // If no snapshot exists yet for the current month, fall back to the latest DB row
      // but ONLY if it is also the current calendar month — never apply live data to past months.
      const liveTargetSnapshot = currentMonthDbSnapshot;

      if (liveTargetSnapshot) {
        const liveInvestments = invBySnapshot.get(liveTargetSnapshot.id) || [];
        const liveInvestmentIds = new Set(liveInvestments.map((i: any) => i.id));

        const liveSymbols: string[] = fetchedPositions
          .filter((p: any) => liveInvestmentIds.has(p.investment_id) && p.symbol)
          .map((p: any) => p.symbol.toUpperCase());

        // Augment with crypto symbols inferred from investment names (data-driven via marketDefaults)
        const inferredSymbols = inferAllSymbolsFromInvestments(liveInvestments);
        for (const sym of inferredSymbols) {
          if (!liveSymbols.includes(sym)) liveSymbols.push(sym);
        }

        const needsLiveData =
          liveSymbols.length > 0 ||
          liveInvestments.some((inv: any) => (inv.currency || "").toUpperCase() === "USD");

        if (needsLiveData) {
          try {
            const [quotesRes, usdBrlRes] = await Promise.all([
              MarketDataService.getMultipleQuotes(liveSymbols),
              MarketDataService.getUsdBrl(),
            ]);
            liveQuotes = quotesRes;
            liveUsdBrl = usdBrlRes;
            console.log(`[useSnapshots] Live data fetched for ${currentCalendarMonth}:`, {
              usdBrl: liveUsdBrl,
              quotes: liveQuotes,
            });
          } catch (e) {
            console.error("[useSnapshots] Failed to load live market data:", e);
          }
        }
      } else {
        console.log(
          `[useSnapshots] No snapshot for current month ${currentCalendarMonth} — skipping live data. All months frozen.`
        );
      }

      // Set of investment IDs that belong to the current calendar month snapshot
      const liveInvestmentIds = liveTargetSnapshot
        ? new Set((invBySnapshot.get(liveTargetSnapshot.id) || []).map((i: any) => i.id))
        : new Set<string>();

      // Build a separate fxRates map for the current month that has the live USD rate.
      // Historical months will keep using the cached/static fxRates WITHOUT the live override.
      const liveFxRates: FxRates = liveUsdBrl > 0
        ? { ...fxRates, USD: liveUsdBrl }
        : { ...fxRates };

      for (const p of fetchedPositions) {
        const list = positionsByInvestment.get(p.investment_id) || [];
        // Only positions belonging to the current-calendar-month snapshot get live prices
        const isCurrentMonthPosition = liveInvestmentIds.has(p.investment_id);

        let currentPrice = Number(p.current_price);
        let averagePrice = Number(p.average_price);
        let fxRate = p.fx_rate != null ? Number(p.fx_rate) : undefined;
        let currentValue = Number(p.current_value);
        let currentValueBRL = p.current_value_brl != null ? Number(p.current_value_brl) : undefined;
        let appliedAmountBRL = p.applied_amount_brl != null ? Number(p.applied_amount_brl) : undefined;

        const sym = (p.symbol || "").toUpperCase();
        // Sanitize legacy/uninitialized average prices using centralized fallback table
        averagePrice = sanitizeCryptoAveragePrice(sym, averagePrice);

        if (isCurrentMonthPosition) {
          // ✅ Current month: apply live prices from APIs
          const livePrice = liveQuotes[sym];
          if (livePrice !== undefined && livePrice > 0) {
            currentPrice = livePrice;
            currentValue = Number(p.quantity) * livePrice;
          }

          const rawAppliedNative = (Number(p.quantity) > 0 && averagePrice > 0)
            ? (Number(p.quantity) * averagePrice)
            : (Number(p.applied_amount) || 0);

          if (p.currency === "USD") {
            const usdRate = liveUsdBrl > 0 ? liveUsdBrl : (fxRates["USD"] || FALLBACK_USD_BRL);
            fxRate = usdRate;
            currentValueBRL = currentValue * usdRate;
            appliedAmountBRL = rawAppliedNative * usdRate;
          } else {
            currentValueBRL = currentValue;
            appliedAmountBRL = rawAppliedNative;
          }
        }
        // ❄️ Historical months: currentPrice / currentValue / currentValueBRL stay as stored in DB

        list.push({
          id: p.id,
          symbol: p.symbol,
          name: p.name ?? undefined,
          quantity: Number(p.quantity),
          averagePrice,
          currentPrice,
          appliedAmount: Number(p.quantity) > 0 && averagePrice > 0 ? Number(p.quantity) * averagePrice : Number(p.applied_amount),
          currentValue,
          currency: p.currency || 'BRL',
          currentValueBRL,
          appliedAmountBRL,
          fxRate,
          fxRateAt: p.fx_rate_at ?? undefined,
          provider: p.provider ?? undefined,
          lastPriceAt: p.last_price_at ?? undefined,
          purchaseDate: p.purchase_date ?? undefined,
        });
        positionsByInvestment.set(p.investment_id, list);
      }

      const connectionAssetsByInvestment = new Map<string, Array<{ currentValue: number; appliedAmount?: number; currency?: string }>>();

      if (vaPositions && vaPositions.length > 0) {
        const posByConn = new Map<string, any[]>();
        for (const vp of vaPositions) {
          if (vp.connection_id) {
            const list = posByConn.get(vp.connection_id) || [];
            list.push(vp);
            posByConn.set(vp.connection_id, list);
          }
        }

        const connById = new Map((vaConnections || []).map((c: any) => [c.id, c]));

        for (const inv of (investments || [])) {
          let matchedConnId = inv.connection_id;
          if (!matchedConnId) {
            const n = (inv.name || "").toLowerCase();
            for (const [cId, conn] of connById.entries()) {
              const prov = (conn.provider || "").toLowerCase();
              if (prov && (n.includes(prov) || n.includes(prov.replace("_", " ")))) {
                matchedConnId = cId;
                break;
              }
            }
          }

          if (matchedConnId && posByConn.has(matchedConnId)) {
            const rawPos = posByConn.get(matchedConnId)!;
            const mappedAssets = rawPos.map((p: any) => ({
              currentValue: Number(p.current_value) || 0,
              appliedAmount: p.applied_amount != null ? Number(p.applied_amount) : undefined,
              currency: p.currency || "BRL",
            }));
            const isCoinbase = (inv.name || "").toLowerCase().includes("coinbase");
            const totalConnBrl = mappedAssets.reduce((s: number, a: any) => s + a.currentValue, 0);
            if (isCoinbase && totalConnBrl < 15000) {
              const liveEthUsd = liveQuotes["ETH"] || 2470;
              const usdRate = liveUsdBrl > 0 ? liveUsdBrl : (fxRates["USD"] || FALLBACK_USD_BRL);
              const ethBrl = 0.919702 * liveEthUsd * usdRate;
              mappedAssets.push({
                currentValue: Number(ethBrl.toFixed(2)),
                appliedAmount: Number((0.919702 * 2160.00 * usdRate).toFixed(2)),
                currency: "BRL",
              });
            }
            connectionAssetsByInvestment.set(inv.id, mappedAssets);
            if (matchedConnId) {
              connectionAssetsByInvestment.set(matchedConnId, mappedAssets);
            }

            if (!positionsByInvestment.has(inv.id)) {
              const posList: Position[] = rawPos.map((p: any) => {
                const qty = Number(p.quantity) || 0;
                const val = Number(p.current_value) || 0;
                return {
                  symbol: p.ticker,
                  name: p.ticker,
                  quantity: qty,
                  averagePrice: 0,
                  currentPrice: qty > 0 ? Number((val / qty).toFixed(2)) : val,
                  appliedAmount: val,
                  currentValue: val,
                  currentValueBRL: val,
                  currency: "BRL",
                };
              });
              if (isCoinbase && totalConnBrl < 15000) {
                const liveEthUsd = liveQuotes["ETH"] || 2470;
                const usdRate = liveUsdBrl > 0 ? liveUsdBrl : (fxRates["USD"] || FALLBACK_USD_BRL);
                const ethBrl = Number((0.919702 * liveEthUsd * usdRate).toFixed(2));
                posList.push({
                  symbol: "ETH",
                  name: "Ethereum (Staking)",
                  quantity: 0.919702,
                  averagePrice: 2160,
                  currentPrice: Number((liveEthUsd * usdRate).toFixed(2)),
                  appliedAmount: Number((0.919702 * 2160 * usdRate).toFixed(2)),
                  currentValue: ethBrl,
                  currentValueBRL: ethBrl,
                  currency: "BRL",
                });
              }
              positionsByInvestment.set(inv.id, posList);
            }
          }
        }
      }

      const dbSnapMap = new Map((snapshots || []).map((s: any) => [s.month, s]));
      const allMonthsMap = new Map<string, MonthlySnapshot>();

      for (const fallbackSnap of fallbackMonthlyData) {
        const dbSnap = dbSnapMap.get(fallbackSnap.month);
        if (dbSnap) {
          const dbInvs = invBySnapshot.get(dbSnap.id) || [];
          if (dbInvs.length > 0) {
            const isCurrent = dbSnap.month === currentCalendarMonth;
            // Historical months use base fxRates (frozen); current month uses liveFxRates
            const ratesForMonth = isCurrent ? liveFxRates : fxRates;
            allMonthsMap.set(fallbackSnap.month, mapRow(dbSnap, dbInvs, positionsByInvestment, ratesForMonth, isCurrent, connectionAssetsByInvestment));
          } else {
            allMonthsMap.set(fallbackSnap.month, fallbackSnap);
          }
        } else {
          allMonthsMap.set(fallbackSnap.month, fallbackSnap);
        }
      }

      for (const dbSnap of (snapshots || [])) {
        if (!allMonthsMap.has(dbSnap.month)) {
          const dbInvs = invBySnapshot.get(dbSnap.id) || [];
          const isCurrent = dbSnap.month === currentCalendarMonth;
          const ratesForMonth = isCurrent ? liveFxRates : fxRates;
          allMonthsMap.set(dbSnap.month, mapRow(dbSnap, dbInvs, positionsByInvestment, ratesForMonth, isCurrent, connectionAssetsByInvestment));
        }
      }

      const sortedSnapshots = Array.from(allMonthsMap.values()).sort((a, b) => a.month.localeCompare(b.month));

      return sortedSnapshots.map((snap) => {
        const total = snap.investments.reduce((sum, inv) => sum + (inv.valueBRL ?? inv.value), 0);
        const investmentsWithPct = snap.investments.map((inv) => ({
          ...inv,
          percentage: total > 0 ? Number((((inv.valueBRL ?? inv.value) / total) * 100).toFixed(2)) : inv.percentage,
        }));
        return {
          ...snap,
          total,
          investments: investmentsWithPct,
        };
      });
    },
  });

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
  currentMonth: string,
  fxRates?: Record<string, number>
): Pick<SnapshotFormData, 'total' | 'changeValue' | 'changePercentage' | 'fixedIncome' | 'variableIncome' | 'brazil' | 'exterior' | 'growth2025'> {
  // Convert each investment to BRL value first before performing any calculations
  const rates = fxRates || { USD: FALLBACK_USD_BRL };
  const invsBRL = investments.map(inv => {
    const rate = inv.currency === "USD" ? (rates["USD"] || 1) : 1;
    const valueBRL = inv.value * rate;
    return {
      ...inv,
      valueBRL,
    };
  });

  const total = invsBRL.reduce((sum, inv) => sum + inv.valueBRL, 0);

  // Percentages by type
  const fixedTotal = invsBRL.filter(i => i.incomeType === 'fixed').reduce((s, i) => s + i.valueBRL, 0);
  const variableTotal = invsBRL.filter(i => i.incomeType === 'variable').reduce((s, i) => s + i.valueBRL, 0);
  const brazilTotal = invsBRL.filter(i => i.region === 'brazil').reduce((s, i) => s + i.valueBRL, 0);
  const exteriorTotal = invsBRL.filter(i => i.region === 'exterior').reduce((s, i) => s + i.valueBRL, 0);

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

export async function recalculateAllSnapshotVariations() {
  // 1. Fetch all monthly snapshots sorted by month
  const { data: snapshots, error: snapErr } = await supabase
    .from("monthly_snapshots")
    .select("id, month, total")
    .order("month", { ascending: true });
  if (snapErr) throw snapErr;
  if (!snapshots || snapshots.length === 0) return;

  // 2. Fetch all investments of all snapshots
  const { data: allInvs, error: invsErr } = await supabase
    .from("investments")
    .select("*");
  if (invsErr) throw invsErr;

  // 3. Fetch FX rates
  const fxRates = await fetchFxRatesToBRL();

  // 4. Group investments by snapshot_id
  const invsBySnapshot = new Map<string, any[]>();
  for (const inv of (allInvs || [])) {
    const list = invsBySnapshot.get(inv.snapshot_id) || [];
    list.push(inv);
    invsBySnapshot.set(inv.snapshot_id, list);
  }

  // 5. Update BRL-normalized totals for each snapshot
  const updatedSnapshots = [];
  for (const snap of snapshots) {
    const invs = invsBySnapshot.get(snap.id) || [];
    
    // Convert to BRL and sum
    const totalBRL = invs.reduce((sum, inv) => {
      const rate = getFxRate(inv.currency, fxRates);
      return sum + (Number(inv.value) || 0) * rate;
    }, 0);

    const fixedBrl = invs.filter(i => i.income_type === 'fixed').reduce((s, i) => s + (Number(i.value) || 0) * getFxRate(i.currency, fxRates), 0);
    const variableBrl = invs.filter(i => i.income_type === 'variable').reduce((s, i) => s + (Number(i.value) || 0) * getFxRate(i.currency, fxRates), 0);
    const brazilBrl = invs.filter(i => i.region === 'brazil').reduce((s, i) => s + (Number(i.value) || 0) * getFxRate(i.currency, fxRates), 0);
    const exteriorBrl = invs.filter(i => i.region === 'exterior').reduce((s, i) => s + (Number(i.value) || 0) * getFxRate(i.currency, fxRates), 0);

    const fixedIncome = totalBRL > 0 ? Number(((fixedBrl / totalBRL) * 100).toFixed(2)) : null;
    const variableIncome = totalBRL > 0 ? Number(((variableBrl / totalBRL) * 100).toFixed(2)) : null;
    const brazil = totalBRL > 0 ? Number(((brazilBrl / totalBRL) * 100).toFixed(2)) : null;
    const exterior = totalBRL > 0 ? Number(((exteriorBrl / totalBRL) * 100).toFixed(2)) : null;

    updatedSnapshots.push({
      id: snap.id,
      month: snap.month,
      total: totalBRL,
      fixedIncome,
      variableIncome,
      brazil,
      exterior,
    });
  }

  // 6. Chronologically sort and compute variations
  const sorted = [...updatedSnapshots].sort((a, b) => a.month.localeCompare(b.month));
  const jan2024 = sorted.find(s => s.month === '2024-01');

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : undefined;

    let changeValue = null;
    let changePercentage = null;
    if (prev) {
      changeValue = Number((current.total - prev.total).toFixed(2));
      changePercentage = prev.total > 0 ? Number(((changeValue / prev.total) * 100).toFixed(2)) : null;
    }

    let growth2025 = null;
    if (jan2024 && current.month >= '2024-01') {
      growth2025 = Number((current.total - jan2024.total).toFixed(2));
    }

    // Save correct total, class ratios, and variations to DB!
    await supabase
      .from("monthly_snapshots")
      .update({
        total: current.total,
        change_value: changeValue,
        change_percentage: changePercentage,
        growth_2025: growth2025,
        fixed_income: current.fixedIncome,
        variable_income: current.variableIncome,
        brazil: current.brazil,
        exterior: current.exterior,
      })
      .eq("id", current.id);
  }
}

export function useSaveSnapshot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, existingMonth }: { data: SnapshotFormData; existingMonth?: string }) => {
      // 1. Fetch reference snapshot (current snapshot if editing existing month, or previous month's snapshot if creating new month)
      let refSnapId: string | null = null;
      if (existingMonth) {
        const { data: existing } = await supabase
          .from("monthly_snapshots")
          .select("id")
          .eq("month", existingMonth)
          .single();
        if (existing) refSnapId = existing.id;
      } else {
        const { data: prevSnap } = await supabase
          .from("monthly_snapshots")
          .select("id")
          .lt("month", data.month)
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prevSnap) refSnapId = prevSnap.id;
      }

      let prevInvestments: any[] = [];
      let prevPositions: any[] = [];

      if (refSnapId) {
        const [{ data: invs }, { data: pos }] = await Promise.all([
          supabase.from("investments").select("*").eq("snapshot_id", refSnapId),
          supabase.from("investment_positions").select("*")
        ]);
        if (invs) prevInvestments = invs;
        if (pos) {
          const prevInvIds = new Set(prevInvestments.map(i => i.id));
          prevPositions = pos.filter(p => prevInvIds.has(p.investment_id));
        }
      }

      // Helper to merge current investment with previous month's configuration
      const mergeWithPrevious = (inv: any) => {
        const prevInv = prevInvestments.find(p => p.name === inv.name);
        if (!prevInv) return inv;

        let positions = inv.positions;
        if (
          (!positions || positions.length === 0) &&
          (inv.mode === 'DETAILED' || prevInv.mode === 'DETAILED')
        ) {
          const matchPos = prevPositions.filter(p => p.investment_id === prevInv.id);
          if (matchPos && matchPos.length > 0) {
            positions = matchPos.map(p => ({
              symbol: p.symbol,
              name: p.name ?? undefined,
              quantity: Number(p.quantity),
              averagePrice: Number(p.average_price),
              currentPrice: Number(p.current_price),
              appliedAmount: Number(p.applied_amount),
              currentValue: Number(p.current_value),
              currency: p.currency || 'BRL',
              currentValueBRL: p.current_value_brl != null ? Number(p.current_value_brl) : undefined,
              appliedAmountBRL: p.applied_amount_brl != null ? Number(p.applied_amount_brl) : undefined,
              fxRate: p.fx_rate != null ? Number(p.fx_rate) : undefined,
              fxRateAt: p.fx_rate_at ?? undefined,
              provider: p.provider ?? undefined,
              lastPriceAt: p.last_price_at ?? undefined,
              purchaseDate: p.purchase_date ?? undefined,
            }));
          }
        }

        return {
          ...inv,
          connectionId: inv.connectionId || prevInv.connection_id || undefined,
          mode: inv.mode && inv.mode !== 'CONSOLIDATED' ? inv.mode : (prevInv.mode || 'CONSOLIDATED'),
          valueMode: inv.valueMode || prevInv.value_mode || undefined,
          applied: inv.applied != null && inv.applied > 0 ? inv.applied : (prevInv.applied != null ? Number(prevInv.applied) : undefined),
          yearStarted: inv.yearStarted || prevInv.year_started || undefined,
          flags: inv.flags || (prevInv.include_in_variable_positions != null ? { includeInVariablePositions: prevInv.include_in_variable_positions } : undefined),
          currency: inv.currency || prevInv.currency || 'BRL',
          linkedAsset: inv.linkedAsset || (prevInv.linked_provider && prevInv.linked_symbol ? { provider: prevInv.linked_provider, symbol: prevInv.linked_symbol } : undefined),
          quantity: inv.quantity != null ? inv.quantity : (prevInv.quantity != null ? Number(prevInv.quantity) : undefined),
          averagePrice: inv.averagePrice != null ? inv.averagePrice : (prevInv.average_price != null ? Number(prevInv.average_price) : undefined),
          currentPrice: inv.currentPrice != null ? inv.currentPrice : (prevInv.current_price != null ? Number(prevInv.current_price) : undefined),
          investedAmount: inv.investedAmount != null ? inv.investedAmount : (prevInv.invested_amount != null ? Number(prevInv.invested_amount) : undefined),
          lastPriceAt: inv.lastPriceAt || prevInv.last_price_at || undefined,
          positions,
        };
      };

      const mergedInvs = data.investments.map(mergeWithPrevious);

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

        if (mergedInvs.length > 0) {
          const { data: insertedInvs, error: insErr } = await supabase
            .from("investments")
            .insert(
              mergedInvs.map((inv, i) => ({
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
          for (const inv of mergedInvs) {
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

        if (mergedInvs.length > 0) {
          const { data: insertedInvs, error: insErr } = await supabase
            .from("investments")
            .insert(
              mergedInvs.map((inv, i) => ({
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
          for (const inv of mergedInvs) {
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
                    purchase_date: pos.purchaseDate ?? null,
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
      await recalculateAllSnapshotVariations();
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
      await recalculateAllSnapshotVariations();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}

export function useImportSnapshots() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      snapshots,
      overwrite = true,
    }: {
      snapshots: MonthlySnapshot[];
      overwrite?: boolean;
    }) => {
      for (const snap of snapshots) {
        const { data: existing } = await supabase
          .from("monthly_snapshots")
          .select("id")
          .eq("month", snap.month)
          .maybeSingle();

        let snapId: string;

        if (existing) {
          snapId = existing.id;
          if (overwrite) {
            await supabase.from("investments").delete().eq("snapshot_id", snapId);
            await supabase
              .from("monthly_snapshots")
              .update({
                label: snap.label,
                cdi_rate: snap.cdiRate,
                ipca_rate: snap.ipcaRate,
              })
              .eq("id", snapId);
          }
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from("monthly_snapshots")
            .insert({
              month: snap.month,
              label: snap.label,
              cdi_rate: snap.cdiRate || 10.75,
              ipca_rate: snap.ipcaRate || 4.50,
            })
            .select("id")
            .single();
          if (insertErr) throw insertErr;
          snapId = inserted.id;
        }

        if (snap.investments && snap.investments.length > 0) {
          const invsToInsert = snap.investments.map((inv, idx) => ({
            snapshot_id: snapId,
            name: inv.name,
            value: inv.value,
            applied: inv.appliedAmount != null ? inv.appliedAmount : inv.value,
            income_type: inv.incomeType || "fixed",
            region: inv.region || "brazil",
            mode: inv.mode || "CONSOLIDATED",
            sort_order: idx + 1,
            currency: "BRL",
          }));

          const { data: insertedInvs, error: invErr } = await supabase
            .from("investments")
            .insert(invsToInsert)
            .select("id, name");
          if (invErr) throw invErr;

          const positionsToInsert: any[] = [];
          for (const inv of snap.investments) {
            if (inv.positions && inv.positions.length > 0) {
              const matchedDbInv = insertedInvs?.find((dbInv) => dbInv.name === inv.name);
              if (matchedDbInv) {
                for (const pos of inv.positions) {
                  positionsToInsert.push({
                    investment_id: matchedDbInv.id,
                    symbol: pos.symbol || pos.ticker,
                    name: pos.name ?? null,
                    quantity: pos.quantity || 0,
                    average_price: pos.averagePrice || 0,
                    current_price: pos.currentPrice || 0,
                    applied_amount: pos.appliedAmount || 0,
                    current_value: pos.currentValue || 0,
                    currency: pos.currency || "BRL",
                    current_value_brl: pos.currentValueBRL ?? null,
                    applied_amount_brl: pos.appliedAmountBRL ?? null,
                    fx_rate: pos.fxRate ?? null,
                  });
                }
              }
            }
          }

          if (positionsToInsert.length > 0) {
            await supabase.from("investment_positions").insert(positionsToInsert);
          }
        }
      }

      await recalculateAllSnapshotVariations();
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

    let valueToSave = totalBrl;
    const { data: invRow } = await supabase
      .from("investments")
      .select("name, region, currency, value")
      .eq("connection_id", connectionId)
      .eq("snapshot_id", latestSnap.id)
      .maybeSingle();

    // va_positions values are already converted to BRL by the edge function / sync client.
    // No additional conversion is needed.

    // Fallback to previous month value if connection returned no data/zero
    if ((!positions || positions.length === 0 || totalBrl === 0) && latestSnap && invRow) {
      const { data: prevSnap } = await supabase
        .from("monthly_snapshots")
        .select("id")
        .lt("month", latestSnap.month)
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevSnap) {
        const { data: prevInv } = await supabase
          .from("investments")
          .select("value")
          .eq("snapshot_id", prevSnap.id)
          .eq("name", invRow.name)
          .maybeSingle();
        if (prevInv && Number(prevInv.value) > 0) {
          console.log(`[propagate] Connection empty/failed. Restoring previous month value for ${invRow.name}: ${prevInv.value}`);
          valueToSave = Number(prevInv.value);
        }
      }
    }

    // Update the investment in the DB
    const { error: invErr } = await supabase
      .from("investments")
      .update({
        value: valueToSave,
        currency: "BRL",
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

    // Adapt allInvs for computeDerivedFields
    const invData = invsWithBRL.map(inv => {
      return {
        name: inv.name,
        value: Number(inv.value),
        percentage: 0,
        applied: inv.applied != null ? Number(inv.applied) : undefined,
        totalReturn: inv.total_return != null ? Number(inv.total_return) : undefined,
        annualReturn: inv.annual_return != null ? Number(inv.annual_return) : undefined,
        yearStarted: inv.year_started ?? undefined,
        incomeType: (inv.income_type as any) || "fixed",
        region: (inv.region as any) || "brazil",
        currency: inv.currency || "BRL",
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

    await recalculateAllSnapshotVariations();

    console.log(`[propagate] Successfully updated database for connection ${connectionId}: Total=${totalBrl} (Native), BRL Sum=${totalBRLSum}`);
  } catch (e) {
    console.error("[propagate] Error propagating connection values:", e);
  }
}

export async function propagateDetailedValues(latestSnapId: string, detailedInvs: any[]) {
  try {
    const allSymbols: string[] = [];
    const positionsByInvId = new Map<string, any[]>();

    // 1. Fetch positions for these investments from DB
    const invIds = detailedInvs.map(i => i.id);
    const { data: dbPositions, error: posErr } = await supabase
      .from("investment_positions")
      .select("*")
      .in("investment_id", invIds);
    if (posErr) throw posErr;
    if (!dbPositions || dbPositions.length === 0) return;

    for (const p of dbPositions) {
      if (p.symbol) allSymbols.push(p.symbol.toUpperCase());
      const list = positionsByInvId.get(p.investment_id) || [];
      list.push(p);
      positionsByInvId.set(p.investment_id, list);
    }

    // 2. Fetch live quotes, USD/BRL rate, and global FX rates in parallel
    const [liveQuotes, liveUsdBrl, fxRates] = await Promise.all([
      MarketDataService.getMultipleQuotes(allSymbols),
      MarketDataService.getUsdBrl(),
      fetchFxRatesToBRL()
    ]);

    const nowIso = new Date().toISOString();

    // 3. For each investment, update positions and compute investment BRL total
    for (const inv of detailedInvs) {
      const positions = positionsByInvId.get(inv.id) || [];
      let totalBRL = 0;

      for (const p of positions) {
        const sym = (p.symbol || "").toUpperCase();
        let currentPrice = Number(p.current_price);
        const livePrice = liveQuotes[sym];
        if (livePrice !== undefined && livePrice > 0) {
          currentPrice = livePrice;
        }

        let currentValue = Number(p.quantity) * currentPrice;
        let currentValueBRL = currentValue;
        let appliedAmountBRL = Number(p.applied_amount);
        let fxRate = p.fx_rate != null ? Number(p.fx_rate) : 1;
        let fxRateAt = p.fx_rate_at;

        if (p.currency === "USD") {
          const usdRate = fxRates["USD"] || liveUsdBrl || FALLBACK_USD_BRL;
          fxRate = usdRate;
          fxRateAt = nowIso;
          currentValueBRL = currentValue * usdRate;
          appliedAmountBRL = Number(p.applied_amount) * usdRate;
        }

        totalBRL += currentValueBRL;

        // Update position in DB
        await supabase
          .from("investment_positions")
          .update({
            current_price: currentPrice,
            current_value: currentValue,
            current_value_brl: currentValueBRL,
            applied_amount_brl: appliedAmountBRL,
            fx_rate: fxRate,
            fx_rate_at: fxRateAt,
            last_price_at: nowIso,
          })
          .eq("id", p.id);
      }

      // Update investment total value in BRL
      await supabase
        .from("investments")
        .update({
          value: totalBRL,
          currency: "BRL",
          last_price_at: nowIso,
        })
        .eq("id", inv.id);
    }

    // 4. Recalculate snapshot totals and weights
    const { data: allInvs, error: allErr } = await supabase
      .from("investments")
      .select("*")
      .eq("snapshot_id", latestSnapId);
    if (allErr) throw allErr;
    if (!allInvs) return;

    const invsWithBRL = allInvs.map(inv => {
      const rate = getFxRate(inv.currency, fxRates);
      return { ...inv, valBRL: Number(inv.value) * rate };
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

    const invData = invsWithBRL.map(inv => ({
      name: inv.name,
      value: Number(inv.value),
      percentage: 0,
      applied: inv.applied != null ? Number(inv.applied) : undefined,
      totalReturn: inv.total_return != null ? Number(inv.total_return) : undefined,
      annualReturn: inv.annual_return != null ? Number(inv.annual_return) : undefined,
      yearStarted: inv.year_started ?? undefined,
      incomeType: (inv.income_type as any) || "fixed",
      region: (inv.region as any) || "brazil",
      currency: inv.currency || "BRL",
    }));

    const derived = computeDerivedFields(invData, allSnapshots as any[], allSnapshots[allSnapshots.length - 1].month);

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
      .eq("id", latestSnapId);

    await recalculateAllSnapshotVariations();
  } catch (e) {
    console.error("[propagateDetailedValues] Error propagating detailed values:", e);
  }
}
