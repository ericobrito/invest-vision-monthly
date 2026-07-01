
-- Drop all permissive public policies and replace with authenticated-only policies

-- exchange_sync_runs
DROP POLICY IF EXISTS "public delete sync_runs" ON public.exchange_sync_runs;
DROP POLICY IF EXISTS "public insert sync_runs" ON public.exchange_sync_runs;
DROP POLICY IF EXISTS "public read sync_runs" ON public.exchange_sync_runs;
DROP POLICY IF EXISTS "public update sync_runs" ON public.exchange_sync_runs;
CREATE POLICY "authenticated all sync_runs" ON public.exchange_sync_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.exchange_sync_runs FROM anon;

-- audit_logs
DROP POLICY IF EXISTS "public delete audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "public insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "public read audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated all audit_logs" ON public.audit_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.audit_logs FROM anon;

-- normalized_assets
DROP POLICY IF EXISTS "public delete norm_assets" ON public.normalized_assets;
DROP POLICY IF EXISTS "public insert norm_assets" ON public.normalized_assets;
DROP POLICY IF EXISTS "public read norm_assets" ON public.normalized_assets;
CREATE POLICY "authenticated all norm_assets" ON public.normalized_assets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.normalized_assets FROM anon;

-- investment_positions
DROP POLICY IF EXISTS "Public read investment_positions" ON public.investment_positions;
DROP POLICY IF EXISTS "Public write investment_positions" ON public.investment_positions;
CREATE POLICY "authenticated all investment_positions" ON public.investment_positions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.investment_positions FROM anon;

-- monthly_snapshots
DROP POLICY IF EXISTS "Allow public delete snapshots" ON public.monthly_snapshots;
DROP POLICY IF EXISTS "Allow public insert snapshots" ON public.monthly_snapshots;
DROP POLICY IF EXISTS "Allow public read snapshots" ON public.monthly_snapshots;
DROP POLICY IF EXISTS "Allow public update snapshots" ON public.monthly_snapshots;
CREATE POLICY "authenticated all snapshots" ON public.monthly_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.monthly_snapshots FROM anon;

-- investments
DROP POLICY IF EXISTS "Allow public delete investments" ON public.investments;
DROP POLICY IF EXISTS "Allow public insert investments" ON public.investments;
DROP POLICY IF EXISTS "Allow public read investments" ON public.investments;
DROP POLICY IF EXISTS "Allow public update investments" ON public.investments;
CREATE POLICY "authenticated all investments" ON public.investments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.investments FROM anon;

-- va_positions
DROP POLICY IF EXISTS "Allow public delete va_positions" ON public.va_positions;
DROP POLICY IF EXISTS "Allow public insert va_positions" ON public.va_positions;
DROP POLICY IF EXISTS "Allow public read va_positions" ON public.va_positions;
DROP POLICY IF EXISTS "Allow public update va_positions" ON public.va_positions;
CREATE POLICY "authenticated all va_positions" ON public.va_positions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.va_positions FROM anon;

-- va_connections
DROP POLICY IF EXISTS "Allow public delete va_connections" ON public.va_connections;
DROP POLICY IF EXISTS "Allow public insert va_connections" ON public.va_connections;
DROP POLICY IF EXISTS "Allow public read va_connections" ON public.va_connections;
DROP POLICY IF EXISTS "Allow public update va_connections" ON public.va_connections;
CREATE POLICY "authenticated all va_connections" ON public.va_connections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.va_connections FROM anon;

-- va_credentials (API keys — no client access; only service_role via edge functions)
REVOKE ALL ON public.va_credentials FROM anon, authenticated;
GRANT ALL ON public.va_credentials TO service_role;
