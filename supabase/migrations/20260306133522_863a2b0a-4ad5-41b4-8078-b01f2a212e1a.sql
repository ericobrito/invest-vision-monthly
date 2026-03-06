ALTER TABLE public.investments ADD COLUMN income_type text NOT NULL DEFAULT 'fixed';
ALTER TABLE public.investments ADD COLUMN region text NOT NULL DEFAULT 'brazil';