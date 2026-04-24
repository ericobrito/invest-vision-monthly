// Isolated types for the Variable Assets module.
// DO NOT import these into Monthly logic.

export type AssetType = "crypto" | "equity";

export type Broker =
  | "binance"
  | "coinbase"
  | "xp"
  | "mercado_bitcoin"
  | "bybit";

export type PositionSource = "manual" | "aggregator";

export interface Position {
  id: string;
  ticker: string;
  quantity: number;
  currentValue: number;
  assetType: AssetType;
  broker: Broker;
  source: PositionSource;
  provider?: "snaptrade";
  externalId?: string;
  lastSync?: number;
}

export interface Connection {
  id: string;
  provider: "snaptrade";
  status: "active" | "inactive";
  brokers: Broker[];
  lastSync: number;
}

export interface AggregatedPosition {
  ticker: string;
  assetType: AssetType;
  totalValue: number;
  totalQuantity: number;
  sources: Broker[];
  positionIds: string[];
}

export type ValidationStatus = "matched" | "warning" | "error";

export interface CategoryValidation {
  monthlyTotal: number;
  aggregatedTotal: number;
  delta: number; // percentage
  status: ValidationStatus;
}

export interface ValidationResult {
  equities: CategoryValidation;
  crypto: CategoryValidation;
  overall: ValidationStatus;
}
