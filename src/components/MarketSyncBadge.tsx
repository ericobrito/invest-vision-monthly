/**
 * MarketSyncBadge
 *
 * A compact status widget that shows:
 *  • Green pulsing dot → syncing now
 *  • Check icon + "Atualizado há Xm" → last successful sync
 *  • Warning icon → sync error
 *  • "Sincronizar" button → force immediate refresh
 *  • Countdown to next automatic sync
 */

import React from "react";
import { useMarketSync } from "@/hooks/useMarketSync";
import { RefreshCw, CheckCircle2, AlertCircle, Wifi } from "lucide-react";

function formatElapsed(date: Date | null): string {
  if (!date) return "nunca sincronizado";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `há ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.round(diffMin / 60);
  return `há ${diffH}h`;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "atualizando...";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function MarketSyncBadge() {
  const { lastSyncedAt, isSyncing, syncError, nextSyncIn, forceSync } =
    useMarketSync();

  return (
    <div className="market-sync-badge">
      <div className="market-sync-status">
        {isSyncing ? (
          <>
            <span className="sync-dot syncing" />
            <span className="sync-label syncing-text">Sincronizando...</span>
          </>
        ) : syncError ? (
          <>
            <AlertCircle size={14} className="sync-icon error-icon" />
            <span className="sync-label error-text">Erro na sync</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={14} className="sync-icon ok-icon" />
            <span className="sync-label ok-text">
              {formatElapsed(lastSyncedAt)}
            </span>
          </>
        )}
      </div>

      {!isSyncing && (
        <span className="sync-countdown">
          <Wifi size={11} />
          próx. {formatCountdown(nextSyncIn)}
        </span>
      )}

      <button
        className="sync-force-btn"
        onClick={forceSync}
        disabled={isSyncing}
        title="Forçar sincronização agora"
        aria-label="Sincronizar agora"
      >
        <RefreshCw size={13} className={isSyncing ? "spin" : ""} />
        <span>Sincronizar</span>
      </button>
    </div>
  );
}
