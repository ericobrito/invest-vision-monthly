-- Migration: Create system_incidents table for automated Incident Agent reporting & approval workflow
CREATE TABLE IF NOT EXISTS public.system_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'ANALYZING', 'PROPOSED_FIX', 'APPROVED', 'RESOLVED', 'REJECTED'
    severity TEXT NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    title TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    component_stack TEXT,
    route TEXT,
    user_context JSONB,
    proposed_fix_summary TEXT,
    proposed_fix_diff TEXT,
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public all system_incidents" ON public.system_incidents;
CREATE POLICY "public all system_incidents" ON public.system_incidents FOR ALL TO public USING (true) WITH CHECK (true);
