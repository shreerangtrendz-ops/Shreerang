-- ═══════════════════════════════════════════════════════════════════
-- SHREERANG TRENDZ — Finish Fabric Form v4 + Dropdown Master
-- Migration: 20260314_finish_fabric_v4.sql
-- Based on: New_Fabric_Master.xlsx
-- ═══════════════════════════════════════════════════════════════════

-- Add missing process spec columns to finish_fabrics
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS print_type        TEXT,
  ADD COLUMN IF NOT EXISTS process_class     TEXT DEFAULT 'Regular',
  ADD COLUMN IF NOT EXISTS ink_type_name     TEXT,
  ADD COLUMN IF NOT EXISTS finish_name       TEXT,
  ADD COLUMN IF NOT EXISTS print_concept     TEXT,
  ADD COLUMN IF NOT EXISTS process_steps     JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS va_type           TEXT,
  ADD COLUMN IF NOT EXISTS va_thread         TEXT,
  ADD COLUMN IF NOT EXISTS va_placement      TEXT,
  ADD COLUMN IF NOT EXISTS va_concept_detail TEXT,
  ADD COLUMN IF NOT EXISTS ecom_name_different BOOLEAN DEFAULT false;

-- Add missing columns to base_fabrics
ALTER TABLE public.base_fabrics
  ADD COLUMN IF NOT EXISTS finish_width  TEXT,
  ADD COLUMN IF NOT EXISTS base_width    TEXT,
  ADD COLUMN IF NOT EXISTS transparency  TEXT,
  ADD COLUMN IF NOT EXISTS handfeel      TEXT,
  ADD COLUMN IF NOT EXISTS gsm_tolerance TEXT;

-- Dropdown master table for all fabric-related dropdowns
CREATE TABLE IF NOT EXISTS public.fabric_dropdown_master (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dropdown_key TEXT NOT NULL,
  label        TEXT NOT NULL,
  code         TEXT,
  sort_order   INTEGER DEFAULT 0,
  parent_key   TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fabric_dropdown_master_key_label') THEN
    ALTER TABLE public.fabric_dropdown_master
      ADD CONSTRAINT fabric_dropdown_master_key_label UNIQUE (dropdown_key, label);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_fdm_key ON public.fabric_dropdown_master(dropdown_key) WHERE is_active = true;

SELECT 'v4_migration_done' AS result;
