
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS value_mode text NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS linked_provider text,
  ADD COLUMN IF NOT EXISTS linked_symbol text,
  ADD COLUMN IF NOT EXISTS quantity numeric,
  ADD COLUMN IF NOT EXISTS average_price numeric,
  ADD COLUMN IF NOT EXISTS current_price numeric,
  ADD COLUMN IF NOT EXISTS invested_amount numeric,
  ADD COLUMN IF NOT EXISTS last_price_at timestamptz;

ALTER TABLE public.investments
  DROP CONSTRAINT IF EXISTS investments_value_mode_check;
ALTER TABLE public.investments
  ADD CONSTRAINT investments_value_mode_check
  CHECK (value_mode IN ('MANUAL','HYBRID','AUTO'));
