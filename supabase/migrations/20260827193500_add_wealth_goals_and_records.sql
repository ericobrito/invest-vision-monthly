-- Create wealth_goals table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT wealth_goals_user_id_key UNIQUE (user_id)
);

-- Enable RLS on wealth_goals
ALTER TABLE public.wealth_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual read access" ON public.wealth_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access" ON public.wealth_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access" ON public.wealth_goals
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create wealth_goal_records table
CREATE TABLE IF NOT EXISTS public.wealth_goal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    actual_aporte NUMERIC,
    actual_fixed_cost NUMERIC,
    actual_leisure NUMERIC,
    actual_emergency_reserve NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT wealth_goal_records_user_id_month_key UNIQUE (user_id, month)
);

-- Enable RLS on wealth_goal_records
ALTER TABLE public.wealth_goal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual read access" ON public.wealth_goal_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access" ON public.wealth_goal_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access" ON public.wealth_goal_records
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual delete access" ON public.wealth_goal_records
    FOR DELETE USING (auth.uid() = user_id);
