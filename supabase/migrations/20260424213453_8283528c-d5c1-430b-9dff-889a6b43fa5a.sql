-- Connections to exchanges
CREATE TABLE public.va_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('binance','bybit','coinbase','kraken','mercado_bitcoin')),
  label TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','error')),
  last_sync TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.va_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read va_connections" ON public.va_connections FOR SELECT USING (true);
CREATE POLICY "Allow public insert va_connections" ON public.va_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update va_connections" ON public.va_connections FOR UPDATE USING (true);
CREATE POLICY "Allow public delete va_connections" ON public.va_connections FOR DELETE USING (true);

CREATE TRIGGER va_connections_updated_at
BEFORE UPDATE ON public.va_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Credentials (NEVER exposed to client; only service role reads)
CREATE TABLE public.va_credentials (
  connection_id UUID NOT NULL PRIMARY KEY REFERENCES public.va_connections(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  passphrase TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.va_credentials ENABLE ROW LEVEL SECURITY;
-- No policies = no public access. Only service_role (edge functions) can read/write.

CREATE TRIGGER va_credentials_updated_at
BEFORE UPDATE ON public.va_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Positions (aggregator-imported + manual)
CREATE TABLE public.va_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  asset_type TEXT NOT NULL DEFAULT 'crypto' CHECK (asset_type IN ('crypto','equity')),
  broker TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual','aggregator')),
  provider TEXT,
  connection_id UUID REFERENCES public.va_connections(id) ON DELETE CASCADE,
  external_id TEXT,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.va_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read va_positions" ON public.va_positions FOR SELECT USING (true);
CREATE POLICY "Allow public insert va_positions" ON public.va_positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update va_positions" ON public.va_positions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete va_positions" ON public.va_positions FOR DELETE USING (true);

CREATE TRIGGER va_positions_updated_at
BEFORE UPDATE ON public.va_positions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX va_positions_ticker_idx ON public.va_positions(ticker);
CREATE INDEX va_positions_connection_idx ON public.va_positions(connection_id);