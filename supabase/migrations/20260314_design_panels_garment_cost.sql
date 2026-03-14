-- ═══════════════════════════════════════════════════════════════════
-- SHREERANG TRENDZ — Design Panels + Garment Costing Schema
-- Migration: 20260314_design_panels_garment_cost.sql
-- ═══════════════════════════════════════════════════════════════════

-- Add pricing/costing fields to finish_fabric_designs
ALTER TABLE public.finish_fabric_designs
  ADD COLUMN IF NOT EXISTS lump_price        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cut_pack_price    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS jobworker_name    TEXT,
  ADD COLUMN IF NOT EXISTS jobworker_cost    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS print_type        TEXT,
  ADD COLUMN IF NOT EXISTS width             TEXT,
  ADD COLUMN IF NOT EXISTS sku               TEXT,
  ADD COLUMN IF NOT EXISTS sku_locked        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS shortage_pct      NUMERIC(5,2) DEFAULT 0;

-- design_panels: map garment panels per design
CREATE TABLE IF NOT EXISTS public.design_panels (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id          UUID NOT NULL REFERENCES public.finish_fabric_designs(id) ON DELETE CASCADE,
  finish_fabric_id   UUID REFERENCES public.finish_fabrics(id) ON DELETE SET NULL,
  panel_type         TEXT NOT NULL DEFAULT 'top'
                     CHECK (panel_type IN ('top','bottom','dupatta','border','inner','other')),
  panel_label        TEXT,
  fabric_id          UUID REFERENCES public.finish_fabrics(id) ON DELETE SET NULL,
  fabric_name        TEXT,
  metres_per_garment NUMERIC(6,3) DEFAULT 2.50,
  rate_per_metre     NUMERIC(10,2),
  jobworker_cost     NUMERIC(10,2) DEFAULT 0,
  process_cost       NUMERIC(10,2) DEFAULT 0,
  shortage_pct       NUMERIC(5,2)  DEFAULT 5,
  notes              TEXT,
  sort_order         INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_design_panels_design ON public.design_panels(design_id);

-- Add columns to garment_costs for design linkage
ALTER TABLE public.garment_costs
  ADD COLUMN IF NOT EXISTS design_id             UUID REFERENCES public.finish_fabric_designs(id),
  ADD COLUMN IF NOT EXISTS finish_fabric_id      UUID REFERENCES public.finish_fabrics(id),
  ADD COLUMN IF NOT EXISTS fabric_cost_breakdown JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_fabric_cost     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cmt_cost              NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accessories_cost      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packing_cost_2        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commercial_cost_pct   NUMERIC(5,2)  DEFAULT 3.5,
  ADD COLUMN IF NOT EXISTS profit_margin_pct     NUMERIC(5,2)  DEFAULT 20,
  ADD COLUMN IF NOT EXISTS selling_price         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS wholesale_price_2     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT now();

SELECT 'design_panels_migration_done' AS result;
