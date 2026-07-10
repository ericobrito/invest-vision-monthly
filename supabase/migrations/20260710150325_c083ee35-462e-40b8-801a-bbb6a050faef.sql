
-- Owner id constant
DO $$
DECLARE
  owner_id uuid := 'e52bc405-6d70-42e3-8360-5e06ff0d4c66';
BEGIN
  -- Add user_id column to each table if not exists, backfill, then set NOT NULL + default
  PERFORM 1;
END $$;

-- audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.audit_logs SET user_id = 'e52bc405-6d70-42e3-8360-5e06ff0d4c66' WHERE user_id IS NULL;
ALTER TABLE public.audit_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN user_id SET DEFAULT auth.uid();

-- exchange_sync_runs
ALTER TABLE public.exchange_sync_runs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.exchange_sync_runs SET user_id = 'e52bc405-6d70-42e3-8360-5e06ff0d4c66' WHERE user_id IS NULL;
ALTER TABLE public.exchange_sync_runs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.exchange_sync_runs ALTER COLUMN user_id SET DEFAULT auth.uid();

-- investment_positions
ALTER TABLE public.investment_positions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.investment_positions SET user_id = 'e52bc405-6d70-42e3-8360-5e06ff0d4c66' WHERE user_id IS NULL;
ALTER TABLE public.investment_positions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.investment_positions ALTER COLUMN user_id SET DEFAULT auth.uid();

-- investments
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.investments SET user_id = 'e52bc405-6d70-42e3-8360-5e06ff0d4c66' WHERE user_id IS NULL;
ALTER TABLE public.investments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.investments ALTER COLUMN user_id SET DEFAULT auth.uid();

-- monthly_snapshots
ALTER TABLE public.monthly_snapshots ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.monthly_snapshots SET user_id = 'e52bc405-6d70-42e3-8360-5e06ff0d4c66' WHERE user_id IS NULL;
ALTER TABLE public.monthly_snapshots ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.monthly_snapshots ALTER COLUMN user_id SET DEFAULT auth.uid();

-- normalized_assets
ALTER TABLE public.normalized_assets ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.normalized_assets SET user_id = 'e52bc405-6d70-42e3-8360-5e06ff0d4c66' WHERE user_id IS NULL;
ALTER TABLE public.normalized_assets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.normalized_assets ALTER COLUMN user_id SET DEFAULT auth.uid();

-- va_connections
ALTER TABLE public.va_connections ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.va_connections SET user_id = 'e52bc405-6d70-42e3-8360-5e06ff0d4c66' WHERE user_id IS NULL;
ALTER TABLE public.va_connections ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.va_connections ALTER COLUMN user_id SET DEFAULT auth.uid();

-- va_credentials
ALTER TABLE public.va_credentials ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.va_credentials SET user_id = 'e52bc405-6d70-42e3-8360-5e06ff0d4c66' WHERE user_id IS NULL;
ALTER TABLE public.va_credentials ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.va_credentials ALTER COLUMN user_id SET DEFAULT auth.uid();

-- va_positions
ALTER TABLE public.va_positions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.va_positions SET user_id = 'e52bc405-6d70-42e3-8360-5e06ff0d4c66' WHERE user_id IS NULL;
ALTER TABLE public.va_positions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.va_positions ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop old permissive policies and add owner-scoped ones
-- audit_logs
DROP POLICY IF EXISTS "authenticated read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated update audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "authenticated delete audit_logs" ON public.audit_logs;
CREATE POLICY "owner all audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- exchange_sync_runs
DROP POLICY IF EXISTS "authenticated read sync_runs" ON public.exchange_sync_runs;
DROP POLICY IF EXISTS "authenticated insert sync_runs" ON public.exchange_sync_runs;
DROP POLICY IF EXISTS "authenticated update sync_runs" ON public.exchange_sync_runs;
DROP POLICY IF EXISTS "authenticated delete sync_runs" ON public.exchange_sync_runs;
CREATE POLICY "owner all sync_runs" ON public.exchange_sync_runs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- investment_positions
DROP POLICY IF EXISTS "authenticated read investment_positions" ON public.investment_positions;
DROP POLICY IF EXISTS "authenticated insert investment_positions" ON public.investment_positions;
DROP POLICY IF EXISTS "authenticated update investment_positions" ON public.investment_positions;
DROP POLICY IF EXISTS "authenticated delete investment_positions" ON public.investment_positions;
CREATE POLICY "owner all investment_positions" ON public.investment_positions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- investments
DROP POLICY IF EXISTS "authenticated read investments" ON public.investments;
DROP POLICY IF EXISTS "authenticated insert investments" ON public.investments;
DROP POLICY IF EXISTS "authenticated update investments" ON public.investments;
DROP POLICY IF EXISTS "authenticated delete investments" ON public.investments;
CREATE POLICY "owner all investments" ON public.investments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- monthly_snapshots
DROP POLICY IF EXISTS "authenticated read snapshots" ON public.monthly_snapshots;
DROP POLICY IF EXISTS "authenticated insert snapshots" ON public.monthly_snapshots;
DROP POLICY IF EXISTS "authenticated update snapshots" ON public.monthly_snapshots;
DROP POLICY IF EXISTS "authenticated delete snapshots" ON public.monthly_snapshots;
CREATE POLICY "owner all snapshots" ON public.monthly_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- normalized_assets
DROP POLICY IF EXISTS "authenticated read norm_assets" ON public.normalized_assets;
DROP POLICY IF EXISTS "authenticated insert norm_assets" ON public.normalized_assets;
DROP POLICY IF EXISTS "authenticated update norm_assets" ON public.normalized_assets;
DROP POLICY IF EXISTS "authenticated delete norm_assets" ON public.normalized_assets;
CREATE POLICY "owner all norm_assets" ON public.normalized_assets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- va_connections
DROP POLICY IF EXISTS "authenticated read va_connections" ON public.va_connections;
DROP POLICY IF EXISTS "authenticated insert va_connections" ON public.va_connections;
DROP POLICY IF EXISTS "authenticated update va_connections" ON public.va_connections;
DROP POLICY IF EXISTS "authenticated delete va_connections" ON public.va_connections;
CREATE POLICY "owner all va_connections" ON public.va_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- va_positions
DROP POLICY IF EXISTS "authenticated read va_positions" ON public.va_positions;
DROP POLICY IF EXISTS "authenticated insert va_positions" ON public.va_positions;
DROP POLICY IF EXISTS "authenticated update va_positions" ON public.va_positions;
DROP POLICY IF EXISTS "authenticated delete va_positions" ON public.va_positions;
CREATE POLICY "owner all va_positions" ON public.va_positions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- va_credentials (had RLS enabled with NO policies -> add owner-only)
CREATE POLICY "owner all va_credentials" ON public.va_credentials FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
