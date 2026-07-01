-- Update provider CHECK constraint on public.va_connections to support 'pluggy'
ALTER TABLE public.va_connections
  DROP CONSTRAINT IF EXISTS va_connections_provider_check;

ALTER TABLE public.va_connections
  ADD CONSTRAINT va_connections_provider_check
  CHECK (provider IN ('binance','bybit','coinbase','kraken','mercado_bitcoin','pluggy'));
