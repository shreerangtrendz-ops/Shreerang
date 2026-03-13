-- ═══════════════════════════════════════════════════════════════════════════
-- SHREERANG TRENDZ — FINISH FABRIC v2 + BASE FABRICS SCHEMA
-- Migration: 20260313_finish_fabric_v2.sql
-- Applied: 2026-03-13
-- ═══════════════════════════════════════════════════════════════════════════

-- base_fabrics (grey fabric master, optional mapping)
CREATE TABLE IF NOT EXISTS public.base_fabrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fabric_name  TEXT NOT NULL,
  gsm          INTEGER,
  supplier     TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'base_fabrics_fabric_name_key') THEN
    ALTER TABLE public.base_fabrics ADD CONSTRAINT base_fabrics_fabric_name_key UNIQUE (fabric_name);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_base_fabric_name ON public.base_fabrics(fabric_name);

-- finish_fabrics: add new columns to existing table
ALTER TABLE public.finish_fabrics ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE public.finish_fabrics ADD COLUMN IF NOT EXISTS fabric_category TEXT DEFAULT 'mill_print';
ALTER TABLE public.finish_fabrics ADD COLUMN IF NOT EXISTS ecom_name TEXT;
ALTER TABLE public.finish_fabrics ADD COLUMN IF NOT EXISTS ecom_description TEXT;
ALTER TABLE public.finish_fabrics ADD COLUMN IF NOT EXISTS lump_price NUMERIC(10,2);
ALTER TABLE public.finish_fabrics ADD COLUMN IF NOT EXISTS cut_pack_price NUMERIC(10,2);
ALTER TABLE public.finish_fabrics ADD COLUMN IF NOT EXISTS tally_sync_ok BOOLEAN;
ALTER TABLE public.finish_fabrics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.finish_fabrics ADD COLUMN IF NOT EXISTS ecom_enabled BOOLEAN DEFAULT false;
UPDATE public.finish_fabrics SET item_name = COALESCE(tally_item_name, generated_name, finish_fabric_name) WHERE item_name IS NULL;
CREATE INDEX IF NOT EXISTS idx_finish_fabric_name ON public.finish_fabrics(item_name);
CREATE INDEX IF NOT EXISTS idx_finish_fabric_cat ON public.finish_fabrics(fabric_category);

-- finish_fabric_designs: one fabric → many design variants with costing
CREATE TABLE IF NOT EXISTS public.finish_fabric_designs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finish_fabric_id UUID NOT NULL REFERENCES public.finish_fabrics(id) ON DELETE CASCADE,
  design_no        TEXT NOT NULL,
  jobworker_name   TEXT,
  print_type       TEXT,
  width            TEXT,
  lump_price       NUMERIC(10,2),
  cut_pack_price   NUMERIC(10,2),
  notes            TEXT,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(finish_fabric_id, design_no)
);
CREATE INDEX IF NOT EXISTS idx_finish_designs_fabric ON public.finish_fabric_designs(finish_fabric_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_finish_designs_updated_at ON public.finish_fabric_designs;
CREATE TRIGGER trg_finish_designs_updated_at
  BEFORE UPDATE ON public.finish_fabric_designs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

SELECT 'finish_fabric_v2_migration_done' AS result;
