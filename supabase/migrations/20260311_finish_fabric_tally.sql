-- ================================================================
-- SHREERANG TRENDZ — Finish Fabric + Tally Push Migration
-- File: supabase/migrations/20260311_finish_fabric_tally.sql
-- Safe to re-run: all statements use IF NOT EXISTS
-- ================================================================

-- 1. Add tally sync columns to finish_fabrics
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS tally_synced      BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS tally_item_name   TEXT,
  ADD COLUMN IF NOT EXISTS tally_synced_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS process_path      TEXT,
  ADD COLUMN IF NOT EXISTS ecom_visible      BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS tally_group       TEXT          DEFAULT 'Finish Fabrics';

-- 2. Backfill process_path from process_type
UPDATE public.finish_fabrics SET process_path = process_type WHERE process_path IS NULL AND process_type IS NOT NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_finish_fabrics_tally_synced ON public.finish_fabrics(tally_synced);
CREATE INDEX IF NOT EXISTS idx_finish_fabrics_process_path ON public.finish_fabrics(process_path);
CREATE INDEX IF NOT EXISTS idx_finish_fabrics_ecom ON public.finish_fabrics(ecom_visible) WHERE ecom_visible = true;

-- 4. Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'finish_fabrics'
  AND column_name IN ('tally_synced','tally_item_name','tally_synced_at','process_path','ecom_visible','tally_group')
ORDER BY column_name;
