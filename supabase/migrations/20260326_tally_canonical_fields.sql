-- ═══════════════════════════════════════════
-- PHASE 1 SQL — Canonical Field Standardization
-- Date: 26-Mar-2026
-- ═══════════════════════════════════════════

-- 1. purchase_bills: Add canonical column aliases
ALTER TABLE purchase_bills
  ADD COLUMN IF NOT EXISTS quantity_mtrs  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rate_per_mtr   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS item_name      TEXT,
  ADD COLUMN IF NOT EXISTS quantity       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rate           NUMERIC(10,2);

UPDATE purchase_bills SET quantity_mtrs = quantity WHERE quantity_mtrs IS NULL AND quantity IS NOT NULL;
UPDATE purchase_bills SET rate_per_mtr = rate WHERE rate_per_mtr IS NULL AND rate IS NOT NULL;

-- 2. sales_bills: Remove duplicate party_name, add comm_rate standard column
ALTER TABLE sales_bills DROP COLUMN IF EXISTS party_name;
ALTER TABLE sales_bills
  ADD COLUMN IF NOT EXISTS comm_rate         NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS item_name         TEXT,
  ADD COLUMN IF NOT EXISTS quantity_mtrs     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rate_per_mtr      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS commission_amount  NUMERIC(14,2);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_bills' AND column_name='comm_net_rate') THEN
    UPDATE sales_bills SET comm_rate = comm_net_rate WHERE comm_rate IS NULL;
  END IF;
END $$;

-- 3. tally_ledgers: Add missing fields  
ALTER TABLE tally_ledgers
  ADD COLUMN IF NOT EXISTS mailing_name   TEXT,
  ADD COLUMN IF NOT EXISTS pincode        TEXT,
  ADD COLUMN IF NOT EXISTS bill_date      DATE,
  ADD COLUMN IF NOT EXISTS bill_name      TEXT,
  ADD COLUMN IF NOT EXISTS bill_outstanding NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS credit_period  TEXT,
  ADD COLUMN IF NOT EXISTS is_advance     BOOLEAN DEFAULT false;

-- 4. fabric_stock_live: Add godown column
ALTER TABLE fabric_stock_live ADD COLUMN IF NOT EXISTS godown TEXT;

-- 5. tally_vouchers: Ensure canonical columns
CREATE TABLE IF NOT EXISTS tally_vouchers (
  id             BIGSERIAL PRIMARY KEY,
  voucher_number VARCHAR(100),
  voucher_date   DATE,
  voucher_type   VARCHAR(60),
  party_name     VARCHAR(255),
  amount         NUMERIC(14,2) DEFAULT 0,
  broker_name    TEXT,
  comm_rate      NUMERIC(10,4),
  comm_amount    NUMERIC(14,2),
  narration      TEXT,
  reference      TEXT,
  tally_guid     VARCHAR(200),
  status         VARCHAR(30) DEFAULT 'synced',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voucher_number, voucher_date)
);

-- 6. process_issues table (For Job Work Material In/Out)
CREATE TABLE IF NOT EXISTS process_issues (
  id BIGSERIAL PRIMARY KEY,
  issue_date DATE,
  voucher_number TEXT,
  mill_name TEXT,
  mill_godown TEXT,
  grey_fabric_name TEXT,
  finished_fabric_name TEXT,
  metres_issued NUMERIC(10,2) DEFAULT 0,
  metres_received NUMERIC(10,2) DEFAULT 0,
  design_no TEXT,
  source_godown TEXT,
  job_rate NUMERIC(10,2) DEFAULT 0,
  job_amount NUMERIC(14,2) DEFAULT 0,
  process_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voucher_number)
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
