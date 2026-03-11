-- ═══════════════════════════════════════════════════════════════════════
-- SHREERANG TRENDZ — FINISH FABRIC: Process Steps Column Migration
-- Run in: https://supabase.com/dashboard/project/zdekydcscwhuusliwqaz/sql
-- 
-- WHAT THIS ADDS:
--   1. process_steps JSONB column to finish_fabrics (ordered multi-step path)
--   2. fancy as valid fabric_category in finish_fabrics (merges Fancy)
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Add process_steps column if not exists
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS process_steps JSONB DEFAULT '[]'::jsonb;

-- 2. Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_finish_fabrics_process_steps 
  ON public.finish_fabrics USING GIN (process_steps);

-- 3. Add 'fancy' as valid fabric_category
-- The existing CHECK constraint needs to be updated to include 'fancy'
-- First drop old constraint, then add new one
ALTER TABLE public.finish_fabrics 
  DROP CONSTRAINT IF EXISTS finish_fabrics_fabric_category_check;

ALTER TABLE public.finish_fabrics
  ADD CONSTRAINT finish_fabrics_fabric_category_check 
  CHECK (fabric_category IN ('mill_print','digital','embroidery','schiffli','solid_dyed','fancy'));

-- 4. 'Fancy Finish Fabrics' Tally group is now part of finish_fabrics
-- Migrate any existing fancy_finish_fabrics records into finish_fabrics
INSERT INTO public.finish_fabrics (
  finish_fabric_name, base_fabric_id, process_type, process_path,
  tag, finish_width, design_concept, hsn_code, gst_rate,
  ecom_visible, notes, status, tally_synced, tally_group, created_at
)
SELECT 
  COALESCE(ff.fancy_name, ff.name, 'Unknown') AS finish_fabric_name,
  ff.base_fabric_id,
  'fancy' AS process_type,
  'fancy' AS process_path,
  ff.tag,
  ff.width AS finish_width,
  ff.design_concept,
  ff.hsn_code,
  ff.gst_rate,
  COALESCE(ff.ecom_visible, false),
  ff.notes,
  COALESCE(ff.status, 'active'),
  COALESCE(ff.tally_synced, false),
  'Fancy Finish Fabrics' AS tally_group,
  COALESCE(ff.created_at, now())
FROM public.fancy_finish_fabrics ff
WHERE NOT EXISTS (
  SELECT 1 FROM public.finish_fabrics f2 
  WHERE f2.finish_fabric_name = COALESCE(ff.fancy_name, ff.name, 'Unknown')
)
ON CONFLICT DO NOTHING;

-- 5. Verify
SELECT 
  fabric_category, 
  COUNT(*) AS total,
  SUM(CASE WHEN tally_synced THEN 1 ELSE 0 END) AS tally_synced
FROM public.finish_fabrics 
WHERE status != 'deleted'
GROUP BY fabric_category
ORDER BY fabric_category;
