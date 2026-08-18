CREATE TABLE public.system_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  status TEXT NOT NULL DEFAULT 'OPEN',
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  title TEXT NOT NULL,
  error_message TEXT,
  stack_trace TEXT,
  component_stack TEXT,
  route TEXT,
  user_context JSONB,
  proposed_fix_summary TEXT,
  proposed_fix_diff TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_incidents TO authenticated;
GRANT ALL ON public.system_incidents TO service_role;

ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own incidents"
  ON public.system_incidents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_system_incidents_updated_at
  BEFORE UPDATE ON public.system_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';