-- Create wealth_budget_items table
CREATE TABLE IF NOT EXISTS public.wealth_budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('aporte', 'fixed_cost', 'leisure')),
    description TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on wealth_budget_items
ALTER TABLE public.wealth_budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual read access" ON public.wealth_budget_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access" ON public.wealth_budget_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access" ON public.wealth_budget_items
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual delete access" ON public.wealth_budget_items
    FOR DELETE USING (auth.uid() = user_id);
