# Integration Audit Center

A permanent, persisted audit system for exchange synchronization. Every stage of the sync pipeline writes to the database so you can pinpoint exactly where portfolio value changes.

> Note: built on Lovable Cloud (Supabase). Access gating is **deferred** — the `/admin/audit` route is open for now (you confirmed "skip auth"). When you're ready to gate it, we'll add Lovable Cloud auth + a `user_roles` table and lock the page + RLS to admins (ericoqb@gmail.com).

---

## 1. Database (new tables)

- **`exchange_sync_runs`** — one row per sync invocation
  - `run_id`, `status` (running/completed/failed), `started_at`, `completed_at`, `duration_ms`
  - `bybit_total_brl`, `coinbase_total_brl`, `integrated_total_brl`, `expected_total_brl`, `difference_brl`
  - `connection_id`, `provider`, `triggered_by`
- **`audit_logs`** — append-only stage events
  - `run_id`, `exchange`, `stage` (BYBIT_RAW, COINBASE_RAW, WALLET_DISCOVERY, ASSET_EXTRACTED, NORMALIZED_ASSET, RECONCILIATION, CONSOLIDATION, FINAL_TOTAL, ANOMALY, ERROR), `timestamp`, `data jsonb`
- **`normalized_assets`** — per-asset snapshot for a run
  - `run_id`, `exchange`, `wallet_type`, `asset`, `quantity`, `usd_value`, `brl_value`, `usd_to_brl`, `wallets jsonb`, `raw jsonb`, `source_field`

All public (matches existing tables). Indexes on `run_id`, `(exchange, stage)`, `started_at desc`.

## 2. Edge function audit pipeline (`supabase/functions/variable-assets/index.ts`)

Refactor `syncConnection` to a staged pipeline. Each stage:
1. `saveRawResponse` → `BYBIT_RAW` / `COINBASE_RAW`
2. `walletDiscovery` → `WALLET_DISCOVERY` (lists discovered wallet types)
3. `extractAssets` → `ASSET_EXTRACTED`
4. `normalizeAssets` → writes rows to `normalized_assets` + `NORMALIZED_ASSET` logs
5. `reconcileDuplicates` → `RECONCILIATION` (cross-wallet asset merges)
6. `consolidatePortfolio` → `CONSOLIDATION` (sums per exchange in BRL)
7. `finalEquity` → updates `exchange_sync_runs` totals + `FINAL_TOTAL`

`AuditService` (in the function) wraps inserts with `service_role` client and never throws into the sync path (audit failures are logged but don't break sync).

**Anomaly detection** runs after consolidation:
- difference > 10 BRL vs `expected_total_brl` (passed by client when known)
- negative balances, null equity, duplicated assets within same wallet_type, missing wallet groups for connected providers, USD/BRL conversion failures (e.g. `usdToBrl` null or asset price missing)

New action `get_audit_runs` / `get_audit_run` / `get_normalized_assets` for the UI.

## 3. Frontend — `/admin/audit`

New route `AdminAuditCenter.tsx` with sidebar-style tabs (single page, internal tabs to keep UI structure minimal):
- **Exchange Health** — latest 20 runs with status, duration, totals, difference, anomaly count
- **Raw Responses** — JSON viewer per run / exchange (BYBIT_RAW, COINBASE_RAW)
- **Wallet Discovery** — wallets found per exchange (UNIFIED/FUND/SPOT/CONTRACT/EARN; Coinbase portfolios DEFAULT/CONSUMER/INTX)
- **Asset Normalization** — table: asset · wallet · quantity · USD · BRL · source_field
- **Consolidation Audit** — Bybit total · Coinbase total · Integrated · Expected · Difference
- **Error History** — `ERROR` + `ANOMALY` logs
- **Export Audit** — buttons:
  - Export JSON (full run)
  - Export CSV (normalized_assets)
  - Download Raw Responses
  - Download Audit Report (consolidated markdown/JSON)

Add **Admin → Integration Audit Center** entry to nav (Index page menu). On `/posicoes-variaveis` show a "Last sync" pill with link to `/admin/audit?run=<id>`.

## 4. After each sync, return to the client
```
{ runId, status, exchanges, walletsFound, normalizedAssetsCount,
  bybitTotal, coinbaseTotal, integratedTotal, anomalies, criticalStage }
```
Where `criticalStage` = the first stage where the running sum diverged from raw exchange-reported equity by >10 BRL.

## 5. Technical notes

- All writes use the service role inside the edge function; no client writes to audit tables.
- `audit_logs.data` and `normalized_assets.raw` are `jsonb` for arbitrary payloads.
- `exchange_sync_runs` retains last 90 days; older rows can be pruned later.
- Anomaly thresholds + admin email kept as constants in one config block for easy tuning.
- No changes to existing `/posicoes-variaveis` UI structure beyond adding a small "Audit" link.

## Out of scope (deferred)
- Authentication / role-based gating (you chose "skip auth"). The route will be reachable by URL — fine for now, but we should add auth before publishing.
- Firestore (project is Supabase-based).
