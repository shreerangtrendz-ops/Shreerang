-- ============================================================
-- MIGRATION: Job Work Flow — Challans + Manufacturing Entries
-- Shreerang Trendz ERP | March 2026
-- ============================================================

-- 1. CHALLANS table (Issue fabric to job worker / mill)
CREATE TABLE IF NOT EXISTS challans (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challan_number        TEXT NOT NULL UNIQUE,
  date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  party_name            TEXT NOT NULL,                         -- job worker name
  job_worker_id         UUID REFERENCES job_workers(id),       -- link to job_workers
  process_type          TEXT,                                  -- Embroidery, Print, etc
  fabric_description    TEXT,
  quantity_sent         NUMERIC(10,2) DEFAULT 0,
  unit                  TEXT DEFAULT 'meters',
  fabric_rate           NUMERIC(10,2) DEFAULT 0,               -- cost per meter (for value calc)
  fabric_value          NUMERIC(12,2) GENERATED ALWAYS AS (quantity_sent * fabric_rate) STORED,
  base_fabric_id        UUID REFERENCES base_fabrics(id),
  status                TEXT DEFAULT 'open'
                        CHECK (status IN ('open','in_transit','received','partial','cancelled')),
  expected_return_date  DATE,
  actual_return_date    DATE,
  notes                 TEXT DEFAULT '',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MANUFACTURING ENTRIES table (Receive back from mill + generate design number)
CREATE TABLE IF NOT EXISTS manufacturing_entries (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number          TEXT NOT NULL UNIQUE,
  entry_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  challan_id            UUID REFERENCES challans(id),
  challan_number        TEXT,
  job_worker_id         UUID REFERENCES job_workers(id),
  job_worker_name       TEXT NOT NULL,
  process_type          TEXT,
  design_number         TEXT NOT NULL UNIQUE,                  -- AUTO-GENERATED
  design_name           TEXT,
  base_fabric_id        UUID REFERENCES base_fabrics(id),
  base_fabric_name      TEXT,
  quantity_issued       NUMERIC(10,2) DEFAULT 0,
  quantity_received     NUMERIC(10,2) DEFAULT 0,
  shrinkage_qty         NUMERIC(10,2) GENERATED ALWAYS AS (quantity_issued - quantity_received) STORED,
  process_rate          NUMERIC(10,2) DEFAULT 0,
  process_amount        NUMERIC(12,2) GENERATED ALWAYS AS (quantity_received * process_rate) STORED,
  fabric_cost_per_mtr   NUMERIC(10,2) DEFAULT 0,
  total_fabric_cost     NUMERIC(12,2) GENERATED ALWAYS AS (quantity_received * fabric_cost_per_mtr) STORED,
  total_value           NUMERIC(12,2) GENERATED ALWAYS AS ((quantity_received * process_rate) + (quantity_received * fabric_cost_per_mtr)) STORED,
  quality_grade         TEXT DEFAULT 'A' CHECK (quality_grade IN ('A','B','C')),
  image_url             TEXT,
  status                TEXT DEFAULT 'completed' CHECK (status IN ('completed','pending_qc','rejected')),
  notes                 TEXT DEFAULT '',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ADD manufacturing_entry_required to job_workers (if not exists)
ALTER TABLE job_workers 
  ADD COLUMN IF NOT EXISTS manufacturing_entry_required BOOLEAN DEFAULT true;

-- 4. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_challans_job_worker ON challans(job_worker_id);
CREATE INDEX IF NOT EXISTS idx_challans_status ON challans(status);
CREATE INDEX IF NOT EXISTS idx_mfg_entries_challan ON manufacturing_entries(challan_id);
CREATE INDEX IF NOT EXISTS idx_mfg_entries_design ON manufacturing_entries(design_number);
CREATE INDEX IF NOT EXISTS idx_mfg_entries_worker ON manufacturing_entries(job_worker_id);

-- 5. Design number sequence function
CREATE OR REPLACE FUNCTION generate_design_number()
RETURNS TEXT AS $$
DECLARE
  year_code TEXT;
  seq_num   INT;
  new_num   TEXT;
BEGIN
  year_code := TO_CHAR(CURRENT_DATE, 'YY');
  SELECT COUNT(*) + 1 INTO seq_num
  FROM manufacturing_entries
  WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE);
  new_num := 'DS-' || year_code || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_num;
END;
$$ LANGUAGE plpgsql;
