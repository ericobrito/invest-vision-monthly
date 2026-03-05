
-- Create monthly_snapshots table
CREATE TABLE public.monthly_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  change_value NUMERIC,
  change_percentage NUMERIC,
  fixed_income NUMERIC,
  variable_income NUMERIC,
  brazil NUMERIC,
  exterior NUMERIC,
  growth_2025 NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create investments table
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.monthly_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  applied NUMERIC,
  total_return NUMERIC,
  annual_return NUMERIC,
  year_started TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth needed)
CREATE POLICY "Allow public read snapshots" ON public.monthly_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow public insert snapshots" ON public.monthly_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update snapshots" ON public.monthly_snapshots FOR UPDATE USING (true);
CREATE POLICY "Allow public delete snapshots" ON public.monthly_snapshots FOR DELETE USING (true);

CREATE POLICY "Allow public read investments" ON public.investments FOR SELECT USING (true);
CREATE POLICY "Allow public insert investments" ON public.investments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update investments" ON public.investments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete investments" ON public.investments FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_investments_snapshot_id ON public.investments(snapshot_id);
CREATE INDEX idx_snapshots_month ON public.monthly_snapshots(month);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_snapshots_updated_at
  BEFORE UPDATE ON public.monthly_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
