-- ============================================================
-- Migration: 20260313_tally_sync_fixes.sql
-- Purpose: Fix all Supabase schema issues found in code audit
-- Safe to re-run (fully idempotent)
-- ============================================================

-- 1. UNIQUE CONSTRAINTS (needed for upsert onConflict to work)
-- purchase_bills
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_bills_bill_number_key') THEN
    ALTER TABLE purchase_bills ADD CONSTRAINT purchase_bills_bill_number_key UNIQUE (bill_number);
  END IF;
END $$;

-- sales_bills
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_bills_bill_number_key') THEN
    ALTER TABLE sales_bills ADD CONSTRAINT sales_bills_bill_number_key UNIQUE (bill_number);
  END IF;
END $$;

-- customers (tally_ledger_name)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_tally_ledger_name_key') THEN
    ALTER TABLE customers ADD CONSTRAINT customers_tally_ledger_name_key UNIQUE (tally_ledger_name);
  END IF;
END $$;

-- sales_team (name)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_team_name_key') THEN
    ALTER TABLE sales_team ADD CONSTRAINT sales_team_name_key UNIQUE (name);
  END IF;
END $$;

-- payment_followups (customer_name)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_followups_customer_name_key') THEN
    ALTER TABLE payment_followups ADD CONSTRAINT payment_followups_customer_name_key UNIQUE (customer_name);
  END IF;
END $$;

-- 2. ADD MISSING COLUMNS TO purchase_bills
ALTER TABLE purchase_bills
  ADD COLUMN IF NOT EXISTS fabric_type          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS hsn_code             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS igst_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tally_voucher_no     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tally_sync_status    VARCHAR(30) DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS tally_synced_at      TIMESTAMPTZ;

-- 3. ADD MISSING COLUMNS TO sales_bills
ALTER TABLE sales_bills
  ADD COLUMN IF NOT EXISTS hsn_code             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS igst_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tally_voucher_no     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tally_sync_status    VARCHAR(30) DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS tally_synced_at      TIMESTAMPTZ;

-- 4. TALLY SYNC STATE - ensure unique sync_type
CREATE TABLE IF NOT EXISTS tally_sync_state (
  id                        SERIAL PRIMARY KEY,
  sync_type                 VARCHAR(60) NOT NULL UNIQUE,
  last_synced_voucher_date  DATE,
  total_records_synced      INTEGER DEFAULT 0,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TALLY SYNC LOG - ensure it has all needed columns
CREATE TABLE IF NOT EXISTS tally_sync_log (
  id                 BIGSERIAL PRIMARY KEY,
  sync_type          VARCHAR(60),
  status             VARCHAR(20),
  records_synced     INTEGER DEFAULT 0,
  raw_response       TEXT,
  error_message      TEXT,
  last_voucher_date  DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tally_sync_log ADD COLUMN IF NOT EXISTS last_voucher_date DATE;

-- 6. TALLY SYNC ERRORS TABLE
CREATE TABLE IF NOT EXISTS tally_sync_errors (
  id            BIGSERIAL PRIMARY KEY,
  sync_type     VARCHAR(60),
  error_message TEXT NOT NULL,
  raw_request   TEXT,
  resolved      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TALLY LEDGERS TABLE (for full ledger sync)
CREATE TABLE IF NOT EXISTS tally_ledgers (
  id                 BIGSERIAL PRIMARY KEY,
  ledger_name        VARCHAR(255) NOT NULL UNIQUE,
  ledger_group       VARCHAR(100),
  phone              VARCHAR(30),
  email              VARCHAR(150),
  address            TEXT,
  gst_number         VARCHAR(20),
  opening_balance    NUMERIC(14,2) DEFAULT 0,
  closing_balance    NUMERIC(14,2) DEFAULT 0,
  is_active          BOOLEAN DEFAULT TRUE,
  tally_synced_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FABRIC STOCK LIVE TABLE (full schema)
CREATE TABLE IF NOT EXISTS fabric_stock_live (
  id               BIGSERIAL PRIMARY KEY,
  fabric_sku       VARCHAR(200),
  fabric_name      VARCHAR(255) NOT NULL,
  design_no        VARCHAR(100) DEFAULT 'MAIN',
  closing_qty_mtrs NUMERIC(12,2) DEFAULT 0,
  unit             VARCHAR(20) DEFAULT 'Mtr',
  rate_per_mtr     NUMERIC(10,2),
  total_value      NUMERIC(14,2),
  godown           VARCHAR(100),
  sync_date        DATE NOT NULL,
  last_tally_sync  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fabric_sku, design_no, sync_date)
);

-- 9. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_tally_sync_log_sync_type  ON tally_sync_log  (sync_type);
CREATE INDEX IF NOT EXISTS idx_tally_sync_log_created_at ON tally_sync_log  (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tally_sync_errors_resolved ON tally_sync_errors (resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabric_stock_live_sync_date ON fabric_stock_live (sync_date);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_bill_date ON purchase_bills (bill_date);
CREATE INDEX IF NOT EXISTS idx_sales_bills_bill_date     ON sales_bills    (bill_date);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_supplier   ON purchase_bills (supplier_name);
CREATE INDEX IF NOT EXISTS idx_sales_bills_customer      ON sales_bills    (customer_name);

-- 10. TALLY COMPANIES TABLE - ensure it exists
CREATE TABLE IF NOT EXISTS tally_companies (
  id           SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL UNIQUE,
  is_active    BOOLEAN DEFAULT TRUE,
  port         INTEGER DEFAULT 9000,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Shreerang default company (safe - ON CONFLICT DO NOTHING)
INSERT INTO tally_companies (company_name, is_active, port)
VALUES ('SHREERANG TRENDZ PRIVATE LIMITED', true, 9000)
ON CONFLICT (company_name) DO NOTHING;

-- Done!
COMMENT ON TABLE tally_sync_state  IS 'Tracks last synced date per sync type to enable incremental sync';
COMMENT ON TABLE tally_sync_log    IS 'Audit log of every sync operation';
COMMENT ON TABLE tally_sync_errors IS 'Unresolved errors from Tally sync operations';
COMMENT ON TABLE tally_ledgers     IS 'Master ledger list pulled from Tally (debtors, creditors, agents)';
COMMENT ON TABLE fabric_stock_live IS 'Live stock from Tally Stock Summary, updated daily';
