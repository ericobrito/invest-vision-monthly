/**
 * useMarketSync
 *
 * Central hook that exposes the live market-sync status to the UI:
 *   - `lastSyncedAt`   — timestamp of the last successful API fetch
 *   - `isSyncing`      — true while a fetch is in-flight
 *   - `syncError`      — error message if the last fetch failed
 *   - `forceSync()`    — imperatively trigger an immediate re-fetch
 *   - `nextSyncIn`     — seconds until next automatic refresh
 *
 * This hook does NOT fetch data itself. It reads state from the React Query
 * cache for the `"snapshots"` and `"fx-rates-brl"` queries and derives the
 * status from their metadata.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // must match useSnapshots

export interface MarketSyncStatus {
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  syncError: string | null;
  nextSyncIn: number; // seconds remaining until next auto-sync
  forceSync: () => void;
}

export function useMarketSync(): MarketSyncStatus {
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  // Extra counter to force re-render on cache changes
  const [, setCacheVersion] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second to keep the countdown fresh
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Subscribe to React Query cache so we re-render on every fetch start/end
  useEffect(() => {
    const unsubscribe = qc.getQueryCache().subscribe(() => {
      setCacheVersion((v) => v + 1);
    });
    return unsubscribe;
  }, [qc]);

  const snapshotState = qc.getQueryState(["snapshots"]);
  const fxState = qc.getQueryState(["fx-rates-brl"]);

  // Derive last successful sync from the most-recently-updated query
  const snapshotUpdated = snapshotState?.dataUpdatedAt ?? 0;
  const fxUpdated = fxState?.dataUpdatedAt ?? 0;
  const lastUpdatedAt = Math.max(snapshotUpdated, fxUpdated);
  const lastSyncedAt = lastUpdatedAt > 0 ? new Date(lastUpdatedAt) : null;

  const isSyncing =
    snapshotState?.status === "pending" ||
    snapshotState?.fetchStatus === "fetching";

  const snapshotError = snapshotState?.error;
  const syncError = snapshotError
    ? (snapshotError as Error)?.message ?? "Erro desconhecido na sincronização"
    : null;

  // Countdown in seconds until the next automatic poll
  const elapsed = lastUpdatedAt > 0 ? now - lastUpdatedAt : REFRESH_INTERVAL_MS;
  const remaining = Math.max(0, REFRESH_INTERVAL_MS - elapsed);
  const nextSyncIn = Math.round(remaining / 1000);

  const forceSync = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["snapshots"] });
    qc.invalidateQueries({ queryKey: ["fx-rates-brl"] });
    // Also clear the FX localStorage cache so a fresh rate is fetched
    try {
      localStorage.removeItem("fx_rates_brl_v2");
    } catch {
      /* ignore */
    }
  }, [qc]);

  return { lastSyncedAt, isSyncing, syncError, nextSyncIn, forceSync };
}
