CREATE TABLE IF NOT EXISTS public.wealth_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_wealth NUMERIC DEFAULT 1023000,
  target_aporte NUMERIC DEFAULT 2200,
  target_emergency_reserve NUMERIC DEFAULT 66000,
  target_leisure NUMERIC DEFAULT 3300,
  target_fixed_cost NUMERIC DEFAULT 5500,
  monthly_income NUMERIC DEFAULT 10000,
  years_horizon INTEGER DEFAULT 16,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wealth_goals_user_id_key UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_goals TO authenticated;
GRANT ALL ON public.wealth_goals TO service_role;
ALTER TABLE public.wealth_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner all wealth_goals" ON public.wealth_goals;
CREATE POLICY "owner all wealth_goals" ON public.wealth_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.wealth_goal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  actual_aporte NUMERIC,
  actual_fixed_cost NUMERIC,
  actual_leisure NUMERIC,
  actual_emergency_reserve NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wealth_goal_records_user_id_month_key UNIQUE (user_id, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_goal_records TO authenticated;
GRANT ALL ON public.wealth_goal_records TO service_role;
ALTER TABLE public.wealth_goal_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner all wealth_goal_records" ON public.wealth_goal_records;
CREATE POLICY "owner all wealth_goal_records" ON public.wealth_goal_records FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.wealth_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_budget_items TO authenticated;
GRANT ALL ON public.wealth_budget_items TO service_role;
ALTER TABLE public.wealth_budget_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner all wealth_budget_items" ON public.wealth_budget_items;
CREATE POLICY "owner all wealth_budget_items" ON public.wealth_budget_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wealth_budget_items_user_month_idx ON public.wealth_budget_items (user_id, month);

CREATE TRIGGER update_wealth_goals_updated_at BEFORE UPDATE ON public.wealth_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wealth_goal_records_updated_at BEFORE UPDATE ON public.wealth_goal_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wealth_budget_items_updated_at BEFORE UPDATE ON public.wealth_budget_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();