-- Migration: Add purchase_date column to investment_positions table
ALTER TABLE public.investment_positions ADD COLUMN IF NOT EXISTS purchase_date DATE;
