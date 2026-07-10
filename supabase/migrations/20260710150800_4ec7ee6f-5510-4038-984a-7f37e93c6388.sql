
-- Helper trigger functions that back-fill user_id from parent rows when NULL
CREATE OR REPLACE FUNCTION public.va_positions_set_user_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.connection_id IS NOT NULL THEN
    SELECT user_id INTO NEW.user_id FROM public.va_connections WHERE id = NEW.connection_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.exchange_sync_runs_set_user_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.connection_id IS NOT NULL THEN
    SELECT user_id INTO NEW.user_id FROM public.va_connections WHERE id = NEW.connection_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.audit_logs_set_user_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.run_id IS NOT NULL THEN
    SELECT user_id INTO NEW.user_id FROM public.exchange_sync_runs WHERE id = NEW.run_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.normalized_assets_set_user_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.run_id IS NOT NULL THEN
    SELECT user_id INTO NEW.user_id FROM public.exchange_sync_runs WHERE id = NEW.run_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.investments_set_user_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.snapshot_id IS NOT NULL THEN
    SELECT user_id INTO NEW.user_id FROM public.monthly_snapshots WHERE id = NEW.snapshot_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.investment_positions_set_user_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.investment_id IS NOT NULL THEN
    SELECT user_id INTO NEW.user_id FROM public.investments WHERE id = NEW.investment_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_va_positions_set_user_id ON public.va_positions;
CREATE TRIGGER trg_va_positions_set_user_id BEFORE INSERT ON public.va_positions
  FOR EACH ROW EXECUTE FUNCTION public.va_positions_set_user_id();

DROP TRIGGER IF EXISTS trg_exchange_sync_runs_set_user_id ON public.exchange_sync_runs;
CREATE TRIGGER trg_exchange_sync_runs_set_user_id BEFORE INSERT ON public.exchange_sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.exchange_sync_runs_set_user_id();

DROP TRIGGER IF EXISTS trg_audit_logs_set_user_id ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_set_user_id BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_set_user_id();

DROP TRIGGER IF EXISTS trg_normalized_assets_set_user_id ON public.normalized_assets;
CREATE TRIGGER trg_normalized_assets_set_user_id BEFORE INSERT ON public.normalized_assets
  FOR EACH ROW EXECUTE FUNCTION public.normalized_assets_set_user_id();

DROP TRIGGER IF EXISTS trg_investments_set_user_id ON public.investments;
CREATE TRIGGER trg_investments_set_user_id BEFORE INSERT ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.investments_set_user_id();

DROP TRIGGER IF EXISTS trg_investment_positions_set_user_id ON public.investment_positions;
CREATE TRIGGER trg_investment_positions_set_user_id BEFORE INSERT ON public.investment_positions
  FOR EACH ROW EXECUTE FUNCTION public.investment_positions_set_user_id();
