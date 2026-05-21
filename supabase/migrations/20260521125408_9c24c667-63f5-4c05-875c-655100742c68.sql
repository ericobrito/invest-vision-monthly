CREATE TABLE public.exchange_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  connection_id uuid,
  provider text,
  triggered_by text,
  bybit_total_brl numeric,
  coinbase_total_brl numeric,
  integrated_total_brl numeric,
  expected_total_brl numeric,
  difference_brl numeric,
  anomalies_count integer NOT NULL DEFAULT 0,
  critical_stage text,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_runs_started ON public.exchange_sync_runs (started_at DESC);
CREATE INDEX idx_sync_runs_connection ON public.exchange_sync_runs (connection_id);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.exchange_sync_runs(id) ON DELETE CASCADE,
  exchange text,
  stage text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  data jsonb
);

CREATE INDEX idx_audit_logs_run ON public.audit_logs (run_id);
CREATE INDEX idx_audit_logs_stage ON public.audit_logs (exchange, stage);

CREATE TABLE public.normalized_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.exchange_sync_runs(id) ON DELETE CASCADE,
  exchange text NOT NULL,
  wallet_type text,
  asset text NOT NULL,
  quantity numeric,
  usd_value numeric,
  brl_value numeric,
  usd_to_brl numeric,
  source_field text,
  wallets jsonb,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_norm_assets_run ON public.normalized_assets (run_id);

ALTER TABLE public.exchange_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read sync_runs" ON public.exchange_sync_runs FOR SELECT USING (true);
CREATE POLICY "public insert sync_runs" ON public.exchange_sync_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "public update sync_runs" ON public.exchange_sync_runs FOR UPDATE USING (true);
CREATE POLICY "public delete sync_runs" ON public.exchange_sync_runs FOR DELETE USING (true);

CREATE POLICY "public read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "public insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete audit_logs" ON public.audit_logs FOR DELETE USING (true);

CREATE POLICY "public read norm_assets" ON public.normalized_assets FOR SELECT USING (true);
CREATE POLICY "public insert norm_assets" ON public.normalized_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete norm_assets" ON public.normalized_assets FOR DELETE USING (true);