-- ═══════════════════════════════════════════════════════════════════════
-- SHREERANG TRENDZ — finish_fabrics schema patch for unified Fancy+Schiffli
-- Run in: https://supabase.com/dashboard/project/zdekydcscwhuusliwqaz/sql
-- ═══════════════════════════════════════════════════════════════════════

-- Add fabric_category column if missing (replaces process_type split)
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS fabric_category TEXT DEFAULT 'mill_print'
    CHECK (fabric_category IN ('mill_print','digital','embroidery','schiffli','solid_dyed','fancy'));

-- Add process cost JSON column
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS process_costs JSONB;

-- Add Fancy Finish value-addition columns
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS va_type         TEXT,
  ADD COLUMN IF NOT EXISTS thread_type     TEXT,
  ADD COLUMN IF NOT EXISTS concept         TEXT,
  ADD COLUMN IF NOT EXISTS placement       TEXT,
  ADD COLUMN IF NOT EXISTS job_work_unit   TEXT;

-- Add Schiffli-specific columns
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS schiffli_thread_h   INTEGER,
  ADD COLUMN IF NOT EXISTS schiffli_thread_v   INTEGER,
  ADD COLUMN IF NOT EXISTS schiffli_width      TEXT,
  ADD COLUMN IF NOT EXISTS schiffli_job_worker TEXT,
  ADD COLUMN IF NOT EXISTS schiffli_rate       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS schiffli_shortage   NUMERIC(5,2);

-- Add pricing columns if missing
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS lump_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cut_pack_price  NUMERIC(10,2);

-- Add design_no column (used at voucher entry time for cost calc)
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS design_no TEXT;

-- Add tally fields
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS tally_group        TEXT DEFAULT 'Finish Fabrics',
  ADD COLUMN IF NOT EXISTS tally_item_name    TEXT,
  ADD COLUMN IF NOT EXISTS tally_synced_at    TIMESTAMPTZ;

-- Migrate: set fabric_category from legacy process_type where possible
UPDATE public.finish_fabrics
SET fabric_category = CASE
  WHEN process_type ILIKE '%digital%'     THEN 'digital'
  WHEN process_type ILIKE '%schiffli%'    THEN 'schiffli'
  WHEN process_type ILIKE '%embroidery%'  THEN 'embroidery'
  WHEN process_type ILIKE '%solid%'       THEN 'solid_dyed'
  WHEN process_type ILIKE '%fancy%'       THEN 'fancy'
  ELSE 'mill_print'
END
WHERE fabric_category IS NULL OR fabric_category = 'mill_print';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ff_fabric_category ON public.finish_fabrics(fabric_category);
CREATE INDEX IF NOT EXISTS idx_ff_design_no        ON public.finish_fabrics(design_no);

-- Verify
SELECT fabric_category, COUNT(*) as count FROM public.finish_fabrics GROUP BY fabric_category ORDER BY fabric_category;
