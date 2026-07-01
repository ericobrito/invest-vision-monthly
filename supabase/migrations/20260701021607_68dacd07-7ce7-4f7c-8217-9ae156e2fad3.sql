
DROP POLICY IF EXISTS "authenticated all sync_runs" ON public.exchange_sync_runs;
CREATE POLICY "authenticated all sync_runs" ON public.exchange_sync_runs
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated all audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated all audit_logs" ON public.audit_logs
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated all norm_assets" ON public.normalized_assets;
CREATE POLICY "authenticated all norm_assets" ON public.normalized_assets
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated all investment_positions" ON public.investment_positions;
CREATE POLICY "authenticated all investment_positions" ON public.investment_positions
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated all snapshots" ON public.monthly_snapshots;
CREATE POLICY "authenticated all snapshots" ON public.monthly_snapshots
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated all investments" ON public.investments;
CREATE POLICY "authenticated all investments" ON public.investments
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated all va_positions" ON public.va_positions;
CREATE POLICY "authenticated all va_positions" ON public.va_positions
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated all va_connections" ON public.va_connections;
CREATE POLICY "authenticated all va_connections" ON public.va_connections
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
