
-- Extend investments with mode-aware columns
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'CONSOLIDATED',
  ADD COLUMN IF NOT EXISTS institution text,
  ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.va_connections(id) ON DELETE SET NULL;

ALTER TABLE public.investments
  DROP CONSTRAINT IF EXISTS investments_mode_check;
ALTER TABLE public.investments
  ADD CONSTRAINT investments_mode_check
  CHECK (mode IN ('CONSOLIDATED','DETAILED','CONNECTED'));

-- Positions table for DETAILED mode
CREATE TABLE IF NOT EXISTS public.investment_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  name text,
  quantity numeric NOT NULL DEFAULT 0,
  average_price numeric NOT NULL DEFAULT 0,
  current_price numeric NOT NULL DEFAULT 0,
  applied_amount numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  provider text,
  sort_order integer NOT NULL DEFAULT 0,
  last_price_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_positions TO anon, authenticated;
GRANT ALL ON public.investment_positions TO service_role;

ALTER TABLE public.investment_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read investment_positions" ON public.investment_positions;
CREATE POLICY "Public read investment_positions" ON public.investment_positions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write investment_positions" ON public.investment_positions;
CREATE POLICY "Public write investment_positions" ON public.investment_positions
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_investment_positions_investment_id
  ON public.investment_positions(investment_id);

DROP TRIGGER IF EXISTS trg_investment_positions_updated_at ON public.investment_positions;
CREATE TRIGGER trg_investment_positions_updated_at
  BEFORE UPDATE ON public.investment_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
