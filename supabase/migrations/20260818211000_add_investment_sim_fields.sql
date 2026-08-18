-- Migration: Add missing simulator fields to investments table
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS annual_rate NUMERIC,
ADD COLUMN IF NOT EXISTS realized_income NUMERIC,
ADD COLUMN IF NOT EXISTS realized_return NUMERIC,
ADD COLUMN IF NOT EXISTS period TEXT,
ADD COLUMN IF NOT EXISTS benchmark TEXT,
ADD COLUMN IF NOT EXISTS benchmark_return NUMERIC,
ADD COLUMN IF NOT EXISTS benchmark_return_percent NUMERIC,
ADD COLUMN IF NOT EXISTS realized_return_percent NUMERIC,
ADD COLUMN IF NOT EXISTS rate_type TEXT,
ADD COLUMN IF NOT EXISTS rate_source TEXT;
