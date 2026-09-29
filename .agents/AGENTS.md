# Antigravity Global Workspace Rules (`AGENTS.md`)

## Project Context
This workspace contains **InvestVision Monthly**, a web application for financial portfolio management, asset tracking, intelligent rebalancing, and crypto accounting.

## Golden Rules
1. **Single Source of Truth**: All financial metric calculations (returns, profits, BRL conversions) MUST use `PortfolioCalculationService`.
2. **Stablecoins & Asset Totals**: Assets like USDT, USDC, BTC, ETH must be fully accounted for in portfolio total sums and account balances (e.g. Avenue, Bybit, Binance, Coinbase).
3. **TypeScript Integrity**: Never suppress types with `any`. Ensure all props and API models are typed.
4. **No Blocking Logic**: Never perform synchronous long-running operations on UI rendering cycles.
5. **Documentation Maintenance**: Keep `Gemini.md` files updated in subdirectories whenever architecture or feature flags change.
