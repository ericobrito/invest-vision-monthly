-- Revert RLS restrictions to public access so the application can load data again
DROP POLICY IF EXISTS "authenticated all sync_runs" ON public.exchange_sync_runs;
DROP POLICY IF EXISTS "authenticated all audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated all norm_assets" ON public.normalized_assets;
DROP POLICY IF EXISTS "authenticated all investment_positions" ON public.investment_positions;
DROP POLICY IF EXISTS "authenticated all snapshots" ON public.monthly_snapshots;
DROP POLICY IF EXISTS "authenticated all investments" ON public.investments;
DROP POLICY IF EXISTS "authenticated all va_positions" ON public.va_positions;
DROP POLICY IF EXISTS "authenticated all va_connections" ON public.va_connections;

-- Recreate open public policies for anonymous and authenticated users
CREATE POLICY "public all sync_runs" ON public.exchange_sync_runs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public all audit_logs" ON public.audit_logs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public all norm_assets" ON public.normalized_assets FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public all investment_positions" ON public.investment_positions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public all snapshots" ON public.monthly_snapshots FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public all investments" ON public.investments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public all va_positions" ON public.va_positions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "public all va_connections" ON public.va_connections FOR ALL TO public USING (true) WITH CHECK (true);
