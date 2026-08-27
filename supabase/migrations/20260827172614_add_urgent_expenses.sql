-- Add target_urgent_expense column to wealth_goals
ALTER TABLE public.wealth_goals 
ADD COLUMN IF NOT EXISTS target_urgent_expense NUMERIC DEFAULT 0;

-- Drop old check constraint from wealth_budget_items
ALTER TABLE public.wealth_budget_items 
DROP CONSTRAINT IF EXISTS wealth_budget_items_category_check;

-- Add new check constraint to allow 'urgent_expense'
ALTER TABLE public.wealth_budget_items 
ADD CONSTRAINT wealth_budget_items_category_check 
CHECK (category IN ('aporte', 'fixed_cost', 'leisure', 'urgent_expense'));
