
-- Drop all existing permissive public policies
DROP POLICY IF EXISTS "public all audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "public all sync_runs" ON public.exchange_sync_runs;
DROP POLICY IF EXISTS "public all investment_positions" ON public.investment_positions;
DROP POLICY IF EXISTS "public all investments" ON public.investments;
DROP POLICY IF EXISTS "public all snapshots" ON public.monthly_snapshots;
DROP POLICY IF EXISTS "public all norm_assets" ON public.normalized_assets;
DROP POLICY IF EXISTS "public all va_connections" ON public.va_connections;
DROP POLICY IF EXISTS "public all va_positions" ON public.va_positions;
DROP POLICY IF EXISTS "public all va_credentials" ON public.va_credentials;

-- Revoke anon access on all sensitive tables
REVOKE ALL ON public.audit_logs FROM anon, public;
REVOKE ALL ON public.exchange_sync_runs FROM anon, public;
REVOKE ALL ON public.investment_positions FROM anon, public;
REVOKE ALL ON public.investments FROM anon, public;
REVOKE ALL ON public.monthly_snapshots FROM anon, public;
REVOKE ALL ON public.normalized_assets FROM anon, public;
REVOKE ALL ON public.va_connections FROM anon, public;
REVOKE ALL ON public.va_positions FROM anon, public;
REVOKE ALL ON public.va_credentials FROM anon, public, authenticated;

-- Grant authenticated access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exchange_sync_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.normalized_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.va_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.va_positions TO authenticated;

-- Service role retains full access
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.exchange_sync_runs TO service_role;
GRANT ALL ON public.investment_positions TO service_role;
GRANT ALL ON public.investments TO service_role;
GRANT ALL ON public.monthly_snapshots TO service_role;
GRANT ALL ON public.normalized_assets TO service_role;
GRANT ALL ON public.va_connections TO service_role;
GRANT ALL ON public.va_positions TO service_role;
GRANT ALL ON public.va_credentials TO service_role;

-- Ensure RLS is on
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.va_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.va_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.va_credentials ENABLE ROW LEVEL SECURITY;

-- Authenticated-only policies (separate per operation, no USING(true)/WITH CHECK(true) on writes)
CREATE POLICY "authenticated read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated update audit_logs" ON public.audit_logs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated delete audit_logs" ON public.audit_logs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated read sync_runs" ON public.exchange_sync_runs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated insert sync_runs" ON public.exchange_sync_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated update sync_runs" ON public.exchange_sync_runs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated delete sync_runs" ON public.exchange_sync_runs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated read investment_positions" ON public.investment_positions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated insert investment_positions" ON public.investment_positions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated update investment_positions" ON public.investment_positions FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated delete investment_positions" ON public.investment_positions FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated read investments" ON public.investments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated insert investments" ON public.investments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated update investments" ON public.investments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated delete investments" ON public.investments FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated read snapshots" ON public.monthly_snapshots FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated insert snapshots" ON public.monthly_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated update snapshots" ON public.monthly_snapshots FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated delete snapshots" ON public.monthly_snapshots FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated read norm_assets" ON public.normalized_assets FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated insert norm_assets" ON public.normalized_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated update norm_assets" ON public.normalized_assets FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated delete norm_assets" ON public.normalized_assets FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated read va_connections" ON public.va_connections FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated insert va_connections" ON public.va_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated update va_connections" ON public.va_connections FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated delete va_connections" ON public.va_connections FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated read va_positions" ON public.va_positions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated insert va_positions" ON public.va_positions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated update va_positions" ON public.va_positions FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated delete va_positions" ON public.va_positions FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- va_credentials: no policies -> only service_role (via edge functions) can access
