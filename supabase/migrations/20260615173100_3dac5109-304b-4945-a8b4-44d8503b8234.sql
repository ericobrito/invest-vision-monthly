ALTER TABLE public.investment_positions
  ADD COLUMN IF NOT EXISTS current_value_brl NUMERIC,
  ADD COLUMN IF NOT EXISTS applied_amount_brl NUMERIC,
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS fx_rate_at TIMESTAMPTZ;

-- Backfill BRL columns for existing positions assuming currency = BRL (rate 1)
UPDATE public.investment_positions
SET
  current_value_brl = COALESCE(current_value_brl, current_value),
  applied_amount_brl = COALESCE(applied_amount_brl, applied_amount),
  fx_rate = COALESCE(fx_rate, 1)
WHERE current_value_brl IS NULL OR applied_amount_brl IS NULL OR fx_rate IS NULL;