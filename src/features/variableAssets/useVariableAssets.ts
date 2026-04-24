import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Connection, Position, Provider } from "./types";

interface ListResponse {
  success: boolean;
  connections?: Array<{
    id: string;
    provider: Provider;
    label: string | null;
    status: "active" | "inactive" | "error";
    last_sync: string | null;
    last_error: string | null;
  }>;
  positions?: Array<{
    id: string;
    ticker: string;
    quantity: number;
    current_value: number;
    asset_type: "crypto" | "equity";
    broker: string;
    source: "manual" | "aggregator";
    provider: string | null;
    connection_id: string | null;
    last_sync: string | null;
  }>;
  error?: string;
}

async function call<T = Record<string, unknown>>(
  body: Record<string, unknown>,
): Promise<T & { success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("variable-assets", {
    body,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error ?? "Request failed");
  return data as T & { success: boolean };
}

export function useVariableAssets() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call<ListResponse>({ action: "list" });
      setConnections(
        (data.connections ?? []).map((c) => ({
          id: c.id,
          provider: c.provider,
          label: c.label,
          status: c.status,
          lastSync: c.last_sync,
          lastError: c.last_error,
        })),
      );
      setPositions(
        (data.positions ?? []).map((p) => ({
          id: p.id,
          ticker: p.ticker,
          quantity: Number(p.quantity),
          currentValue: Number(p.current_value),
          assetType: p.asset_type,
          broker: p.broker,
          source: p.source,
          provider: p.provider ?? undefined,
          connectionId: p.connection_id ?? undefined,
          lastSync: p.last_sync,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(
    async (input: {
      provider: Provider;
      label?: string;
      api_key: string;
      api_secret: string;
      passphrase?: string;
    }) => {
      setBusy("connect");
      try {
        const res = await call<{ connection_id: string; sync_error?: string }>({
          action: "connect",
          ...input,
        });
        await refresh();
        return res;
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const sync = useCallback(
    async (connection_id: string) => {
      setBusy("sync");
      try {
        await call({ action: "sync", connection_id });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const syncAll = useCallback(async () => {
    setBusy("sync_all");
    try {
      await call({ action: "sync_all" });
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const disconnect = useCallback(
    async (connection_id: string) => {
      setBusy("disconnect");
      try {
        await call({ action: "disconnect", connection_id });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const addManual = useCallback(
    async (ticker: string, quantity: number, broker?: string) => {
      setBusy("add_manual");
      try {
        await call({ action: "add_manual", ticker, quantity, broker });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const removePosition = useCallback(
    async (id: string) => {
      setBusy("remove");
      try {
        await call({ action: "remove_position", id });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  return {
    connections,
    positions,
    loading,
    busy,
    refresh,
    connect,
    sync,
    syncAll,
    disconnect,
    addManual,
    removePosition,
  };
}
