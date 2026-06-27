-- Create trigger function to automatically update the public.investments and public.monthly_snapshots
-- when positions in public.va_positions change.
CREATE OR REPLACE FUNCTION public.update_connected_investment_value()
RETURNS TRIGGER AS $$
DECLARE
  v_connection_id UUID;
  v_total_value NUMERIC;
  v_latest_snapshot_id UUID;
  v_snapshot_total NUMERIC;
  v_fixed_total NUMERIC;
  v_variable_total NUMERIC;
  v_brazil_total NUMERIC;
  v_exterior_total NUMERIC;
  v_rec RECORD;
BEGIN
  -- Determine connection_id from either NEW or OLD row
  IF TG_OP = 'DELETE' THEN
    v_connection_id := OLD.connection_id;
  ELSE
    v_connection_id := NEW.connection_id;
  END IF;

  -- If there's no connection_id, we can't link it to any investment
  IF v_connection_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Calculate the sum of current_value (in BRL) of all positions for this connection
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_total_value
  FROM public.va_positions
  WHERE connection_id = v_connection_id;

  -- 2. Find the active (latest) snapshot ID
  SELECT id INTO v_latest_snapshot_id
  FROM public.monthly_snapshots
  ORDER BY month DESC
  LIMIT 1;

  IF v_latest_snapshot_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 3. Update the matching investment in the latest snapshot
  UPDATE public.investments
  SET 
    value = v_total_value,
    last_price_at = NOW()
  WHERE connection_id = v_connection_id
    AND snapshot_id = v_latest_snapshot_id;

  -- 4. Recalculate percentage weights and monthly snapshot totals to ensure consistency
  -- Get new snapshot total
  SELECT COALESCE(SUM(value), 0) INTO v_snapshot_total FROM public.investments WHERE snapshot_id = v_latest_snapshot_id;
  
  -- Recalculate percentage for all investments in this snapshot
  FOR v_rec IN 
    SELECT id, value FROM public.investments WHERE snapshot_id = v_latest_snapshot_id
  LOOP
    UPDATE public.investments
    SET percentage = CASE WHEN v_snapshot_total > 0 THEN ROUND((value / v_snapshot_total) * 100, 2) ELSE 0 END
    WHERE id = v_rec.id;
  END LOOP;

  -- Recalculate sums by category/region
  SELECT COALESCE(SUM(value), 0) INTO v_fixed_total FROM public.investments WHERE snapshot_id = v_latest_snapshot_id AND income_type = 'fixed';
  SELECT COALESCE(SUM(value), 0) INTO v_variable_total FROM public.investments WHERE snapshot_id = v_latest_snapshot_id AND income_type = 'variable';
  SELECT COALESCE(SUM(value), 0) INTO v_brazil_total FROM public.investments WHERE snapshot_id = v_latest_snapshot_id AND region = 'brazil';
  SELECT COALESCE(SUM(value), 0) INTO v_exterior_total FROM public.investments WHERE snapshot_id = v_latest_snapshot_id AND region = 'exterior';

  -- Update monthly_snapshots table
  UPDATE public.monthly_snapshots
  SET
    total = v_snapshot_total,
    fixed_income = CASE WHEN v_snapshot_total > 0 THEN ROUND((v_fixed_total / v_snapshot_total) * 100, 2) ELSE 0 END,
    variable_income = CASE WHEN v_snapshot_total > 0 THEN ROUND((v_variable_total / v_snapshot_total) * 100, 2) ELSE 0 END,
    brazil = CASE WHEN v_snapshot_total > 0 THEN ROUND((v_brazil_total / v_snapshot_total) * 100, 2) ELSE 0 END,
    exterior = CASE WHEN v_snapshot_total > 0 THEN ROUND((v_exterior_total / v_snapshot_total) * 100, 2) ELSE 0 END
  WHERE id = v_latest_snapshot_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on public.va_positions table
DROP TRIGGER IF EXISTS trg_update_connected_investment ON public.va_positions;
CREATE TRIGGER trg_update_connected_investment
AFTER INSERT OR UPDATE OR DELETE ON public.va_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_connected_investment_value();
