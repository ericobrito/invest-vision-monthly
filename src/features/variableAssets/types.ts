// Isolated types for the Variable Assets module.
// DO NOT import these into Monthly logic.

export type AssetType = "crypto" | "equity";

export type Provider =
  | "binance"
  | "bybit"
  | "coinbase"
  | "kraken"
  | "mercado_bitcoin";

export type PositionSource = "manual" | "aggregator";

export interface Position {
  id: string;
  ticker: string;
  quantity: number;
  currentValue: number;
  assetType: AssetType;
  broker: string;
  source: PositionSource;
  provider?: string;
  connectionId?: string;
  externalId?: string;
  lastSync?: string | null;
}

export interface Connection {
  id: string;
  provider: Provider;
  label: string | null;
  status: "active" | "inactive" | "error";
  lastSync: string | null;
  lastError: string | null;
}

export interface AggregatedPosition {
  ticker: string;
  assetType: AssetType;
  totalValue: number;
  totalQuantity: number;
  sources: string[];
  positionIds: string[];
}

export type ValidationStatus = "matched" | "warning" | "error" | "no-reference";

export interface CategoryValidation {
  monthlyTotal: number;
  aggregatedTotal: number;
  delta: number; // percentage
  status: ValidationStatus;
}
