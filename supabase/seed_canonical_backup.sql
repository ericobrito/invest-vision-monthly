-- ============================================================================
-- SCRIPT DE BACKUP CANÔNICO E RESTAURAÇÃO DE DADOS (SUPABASE)
-- data: 2026-10-08
-- Descrição: Restaura os snapshots de patrimônio mensal e investimentos sem
--            multiplicação duplicada em USD. Garante o topo histórico de R$ 616.753,73
--            em Setembro/2025 e mantém a Avenue <= R$ 70.000,00 BRL.
-- ============================================================================

BEGIN;

-- 1. Atualiza o snapshot de Setembro/2025 para o topo histórico exato
UPDATE public.monthly_snapshots
SET total = 616753.73,
    updated_at = NOW()
WHERE month = '2025-09';

-- 2. Atualiza a Avenue em Setembro/2025 para R$ 69.162,52 BRL (sem inflar)
UPDATE public.investments
SET value = 69162.52,
    currency = 'BRL',
    mode = 'CONSOLIDATED'
WHERE name ILIKE '%Avenue%'
  AND snapshot_id IN (SELECT id FROM public.monthly_snapshots WHERE month = '2025-09');

-- 3. Atualiza os demais meses para garantir a sincronia total
UPDATE public.monthly_snapshots SET total = 588695.81 WHERE month = '2025-07';
UPDATE public.monthly_snapshots SET total = 594610.98 WHERE month = '2025-08';
UPDATE public.monthly_snapshots SET total = 609483.93 WHERE month = '2025-10';
UPDATE public.monthly_snapshots SET total = 547643.18 WHERE month = '2025-11';
UPDATE public.monthly_snapshots SET total = 556870.29 WHERE month = '2025-12';
UPDATE public.monthly_snapshots SET total = 577816.63 WHERE month = '2026-01';
UPDATE public.monthly_snapshots SET total = 573573.96 WHERE month = '2026-02';

COMMIT;
