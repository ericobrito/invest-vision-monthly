import { useEffect, useState, useCallback } from "react";
import type { Position, Connection, Broker } from "./types";

const POSITIONS_KEY = "variableAssets.positions.v1";
const CONNECTIONS_KEY = "variableAssets.connections.v1";
const SYNC_KEY = "variableAssets.syncEnabled.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function useVariableAssetsStore() {
  const [positions, setPositions] = useState<Position[]>(() =>
    read<Position[]>(POSITIONS_KEY, [])
  );
  const [connections, setConnections] = useState<Connection[]>(() =>
    read<Connection[]>(CONNECTIONS_KEY, [])
  );
  const [syncEnabled, setSyncEnabledState] = useState<boolean>(() =>
    read<boolean>(SYNC_KEY, false)
  );

  useEffect(() => write(POSITIONS_KEY, positions), [positions]);
  useEffect(() => write(CONNECTIONS_KEY, connections), [connections]);
  useEffect(() => write(SYNC_KEY, syncEnabled), [syncEnabled]);

  const setSyncEnabled = useCallback((v: boolean) => setSyncEnabledState(v), []);

  /** Simulated SnapTrade connection: creates a connection + mock positions. */
  const connectSnapTrade = useCallback(() => {
    const now = Date.now();
    const connectionId = `conn_${now}`;
    const brokers: Broker[] = ["binance", "coinbase", "bybit", "xp"];

    const newConnection: Connection = {
      id: connectionId,
      provider: "snaptrade",
      status: "active",
      brokers,
      lastSync: now,
    };

    const mock: Position[] = [
      {
        id: `pos_${now}_1`,
        ticker: "BTC",
        quantity: 0.15,
        currentValue: 10000,
        assetType: "crypto",
        broker: "binance",
        source: "aggregator",
        provider: "snaptrade",
        externalId: "ext_btc_binance",
        lastSync: now,
      },
      {
        id: `pos_${now}_2`,
        ticker: "BTC",
        quantity: 0.07,
        currentValue: 5000,
        assetType: "crypto",
        broker: "coinbase",
        source: "aggregator",
        provider: "snaptrade",
        externalId: "ext_btc_coinbase",
        lastSync: now,
      },
      {
        id: `pos_${now}_3`,
        ticker: "ETH",
        quantity: 2.5,
        currentValue: 8000,
        assetType: "crypto",
        broker: "bybit",
        source: "aggregator",
        provider: "snaptrade",
        externalId: "ext_eth_bybit",
        lastSync: now,
      },
      {
        id: `pos_${now}_4`,
        ticker: "PETR4",
        quantity: 200,
        currentValue: 8200,
        assetType: "equity",
        broker: "xp",
        source: "aggregator",
        provider: "snaptrade",
        externalId: "ext_petr4_xp",
        lastSync: now,
      },
      {
        id: `pos_${now}_5`,
        ticker: "ITUB4",
        quantity: 300,
        currentValue: 9500,
        assetType: "equity",
        broker: "xp",
        source: "aggregator",
        provider: "snaptrade",
        externalId: "ext_itub4_xp",
        lastSync: now,
      },
    ];

    setConnections((prev) => [...prev, newConnection]);
    setPositions((prev) => [...prev, ...mock]);
  }, []);

  const removeConnection = useCallback((id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    setPositions((prev) => prev.filter((p) => !(p.source === "aggregator")));
  }, []);

  const clearAll = useCallback(() => {
    setPositions([]);
    setConnections([]);
    setSyncEnabledState(false);
  }, []);

  return {
    positions,
    connections,
    syncEnabled,
    setSyncEnabled,
    connectSnapTrade,
    removeConnection,
    clearAll,
  };
}
