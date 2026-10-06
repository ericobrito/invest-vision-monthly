# Guidelines for Invest Vision Monthly

## Data Integrity & Backward Compatibility Rules

1. **Preserve Snapshot History**:
   - Never remove, zero out, or alter historical snapshot data (Jan 2024 to Oct 2026) in `src/data/investments.ts` or DB fallbacks.
   - Always ensure `snapshot.total` strictly equals the sum of `inv.valueBRL ?? inv.value` across all investments in that snapshot.

2. **Pre-Flight Validation**:
   - Before committing any changes to data structures, normalization services, or hooks, verify that `npm run build` or `npx tsc` passes with zero errors.
   - Verify that all monthly snapshots from 2024-01 to the latest month sum up correctly without missing items or broken fallback logic.

3. **User Alignment on Structural Changes**:
   - Always explain proposed changes before altering database schema, fallback handling, or investment matching rules (`CANONICAL_INVESTMENT_RULES`).
   - Create a Git tag or backup checkpoint before major structural updates.
