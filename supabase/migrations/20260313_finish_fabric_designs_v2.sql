-- ══════════════════════════════════════════════════════════════════
-- SHREERANG TRENDZ — Finish Fabric Designs Enhanced Schema
-- Migration: 20260313_finish_fabric_designs_v2.sql
-- ══════════════════════════════════════════════════════════════════

-- Add costing, VA, jobworker, SKU, fabric movement columns to finish_fabric_designs
ALTER TABLE public.finish_fabric_designs
  ADD COLUMN IF NOT EXISTS design_no          TEXT,
  ADD COLUMN IF NOT EXISTS jobworker_name     TEXT,
  ADD COLUMN IF NOT EXISTS jobworker_cost     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS print_type         TEXT,
  ADD COLUMN IF NOT EXISTS width              TEXT,
  ADD COLUMN IF NOT EXISTS lump_price         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cut_pack_price     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS value_addition     TEXT,
  ADD COLUMN IF NOT EXISTS va_concept         TEXT,
  ADD COLUMN IF NOT EXISTS va_placement       TEXT,
  ADD COLUMN IF NOT EXISTS va_thread          TEXT,
  ADD COLUMN IF NOT EXISTS fabric_movement    TEXT,
  ADD COLUMN IF NOT EXISTS sku                TEXT,
  ADD COLUMN IF NOT EXISTS sku_locked         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes              TEXT;

-- Sync design_no from design_number
UPDATE public.finish_fabric_designs
  SET design_no = design_number
  WHERE design_no IS NULL AND design_number IS NOT NULL;

-- Add VA + movement + short_code to finish_fabrics
ALTER TABLE public.finish_fabrics
  ADD COLUMN IF NOT EXISTS value_addition  TEXT,
  ADD COLUMN IF NOT EXISTS va_concept      TEXT,
  ADD COLUMN IF NOT EXISTS fabric_movement TEXT,
  ADD COLUMN IF NOT EXISTS short_code      TEXT,
  ADD COLUMN IF NOT EXISTS base_fabric_name TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ffd_sku       ON public.finish_fabric_designs(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ffd_design_no ON public.finish_fabric_designs(design_no);

-- SKU formula and options in admin_settings
INSERT INTO admin_settings (key_name, key_value, description) VALUES
  ('SKU_FORMULA', '{"parts":["width","short_code","process_path","tag","va_code","design_no"],"separator":"-","uppercase":true,"omit_regular_tag":true}',
   'SKU formula for finish fabric designs'),
  ('VA_OPTIONS', '["Hakoba (Sch-Rl)","Embroidered","Handwork","Foil/Gold/Glitter","Crush/Pleated","Deca/Washing","Washing","Schiffli Cutwork","Sequence Work","Gota Patti"]',
   'Value addition options'),
  ('VA_CONCEPT_OPTIONS', '["Eyelet/Borer","Sequins/Stars","Multi-Thread","Cording","Cutwork","Desi Patti","Stonework","Beads","Lace Cutting","Crochet","Faux Embroidery"]',
   'VA concept detail options'),
  ('VA_PLACEMENT_OPTIONS', '["Allover","Daman","Border","Yoke","Sleeves","Neckline","Chest","Hem","Cuff","Pocket","Placket"]',
   'VA placement options'),
  ('FABRIC_MOVEMENT_OPTIONS', '["Grey → Jobworker","Grey → Dyer → Printer","Grey → Printer","Grey → Schiffli → Dyer","Grey → RFD → Printer","Grey → Dyer → Schiffli","Grey → Washer → Printer","In-house"]',
   'Standard fabric movement paths')
ON CONFLICT (key_name) DO UPDATE SET key_value=EXCLUDED.key_value, updated_at=NOW();

SELECT 'finish_fabric_designs_v2_done' AS result;
