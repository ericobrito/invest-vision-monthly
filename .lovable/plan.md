# Three-Mode Investment Architecture

Extends the existing portfolio so every investment is one of three modes, each with a single source of truth. No redesign of the dashboard, no forced migration — current rows become `CONSOLIDATED` automatically.

## 1. Modes and source of truth

| Mode | Source of truth | Calculations |
|---|---|---|
| `CONSOLIDATED` | `applied`, `value` on the investment row | Stored values used as-is (today's behavior) |
| `DETAILED` | `positions[]` rows | `applied = Σ position.appliedAmount`, `value = Σ position.currentValue` |
| `CONNECTED` | Provider API (Bybit, Coinbase, Binance, Kraken, …) via existing `va_connections` | Computed from imported `va_positions` |

Existing rows have no `mode` → treated as `CONSOLIDATED`. No data migration required.

## 2. Database

New table `investment_positions` (DETAILED mode):

```
id, investment_id (FK investments, cascade), symbol, name,
quantity numeric, average_price numeric, current_price numeric,
applied_amount numeric, current_value numeric, currency text default 'BRL',
last_price_at timestamptz, created_at, updated_at
```

`investments` table additions:
- `mode text` default `'CONSOLIDATED'` (`CONSOLIDATED|DETAILED|CONNECTED`)
- `institution text` nullable
- `connection_id uuid` nullable (FK `va_connections.id` for CONNECTED mode)

Plus standard GRANTs + RLS (open policies to match existing tables in this project — no auth gating yet).

## 3. Calculation engine

New helper `resolveInvestmentTotals(investment, positions?, connectionAssets?)`:

```text
switch (mode) {
  CONSOLIDATED → { applied, value } from row
  DETAILED     → sum over positions[]
  CONNECTED    → sum over connectionAssets[] (from existing variable-assets pipeline)
}
```

Used by `useSnapshots` so the portfolio table, summary cards, and percentages always reflect the correct source. Manual edits to `applied`/`value` are disabled when mode ≠ CONSOLIDATED.

## 4. UI changes (no layout redesign)

- **Edit dialog (`InvestmentEditDialog`)**: replace current "Valuation mode" selector with `Mode` step:
  - `CONSOLIDATED` → existing simple form (Applied + Current).
  - `DETAILED` → hides Applied/Current; shows a `PositionsEditor` list with `[+ Add position]`. Each row: symbol search, name, quantity, average price, current price, currency. Totals shown read-only.
  - `CONNECTED` → hides Applied/Current; shows provider/connection picker tied to existing `va_connections`. Totals come from the latest sync.
- **Table (`InvestmentTable`)**: unchanged columns. Mode icon next to name (●/▦/⚡). Existing `[Detalhar] [Editar]` ghost buttons preserved.
- **Detail dialog (`InvestmentDetailDialog`)**: same shell; body switches by mode — summary (CONSOLIDATED), nested positions table (DETAILED), imported assets table (CONNECTED).

## 5. Asset price lookup (DETAILED)

New edge function `asset-quote` with actions:
- `search(query)` → ticker suggestions (stocks via BRAPI, crypto via CoinGecko).
- `quote(provider, symbol)` → `{ price, currency, name, changePct }`.

Used inside `PositionsEditor` to auto-fill `currentPrice` and `name` after the user picks a symbol. Quantity × averagePrice and Quantity × currentPrice are computed client-side.

## 6. CONNECTED mode integration

Reuses existing `variable-assets` edge function + `va_connections` / `va_positions`. The investment row stores `connection_id`; totals are read from the latest successful sync. No duplicate sync logic.

## 7. Backward compatibility

- Rows without `mode` resolve to `CONSOLIDATED`.
- Existing edit/create flow continues to work — `CONSOLIDATED` is default.
- `useUpdateInvestment` writes `mode`, `institution`, `connection_id` and the new positions array (upsert + delete-missing).
- Dashboard layout, columns, totals, and charts unchanged in look.

## Out of scope

- Auth / role gating (per earlier decision).
- Migrating existing manual rows into DETAILED automatically.
- New top-level pages or routes.

## Files to touch

- `supabase/migrations/<new>.sql` — `investment_positions`, columns on `investments`, GRANTs, RLS.
- `supabase/functions/asset-quote/index.ts` — new.
- `src/data/investments.ts` — add `InvestmentMode`, `Position` types, `resolveInvestmentTotals`.
- `src/hooks/useSnapshots.ts` — load positions, apply resolver.
- `src/hooks/useUpdateInvestment.ts` — persist mode, positions, connection_id.
- `src/components/InvestmentEditDialog.tsx` — three-mode form, embedded `PositionsEditor`.
- `src/components/PositionsEditor.tsx` — new.
- `src/components/InvestmentDetailDialog.tsx` — mode-aware body.
- `src/components/InvestmentTable.tsx` — mode icon only.
