-- ============================================================
-- Migration: 20260321_tally_dashboard_fixes.sql
-- Purpose: Fix outstanding_receivable view + add tally-aligned views
-- Safe to re-run (idempotent)
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste & run
-- ============================================================

-- 1. Fix tally_sync_log: add synced_at column alias (dashboard queries synced_at)
ALTER TABLE tally_sync_log ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows that have created_at but no synced_at
UPDATE tally_sync_log SET synced_at = created_at WHERE synced_at IS NULL;

-- 2. Create outstanding_receivable VIEW based on sales_bills (from Tally)
-- This replaces the sales_orders-based view with a Tally-synced version
CREATE OR REPLACE VIEW public.outstanding_receivable AS
SELECT
  sb.customer_name,
  sb.party_name AS tally_ledger_name,
  COUNT(sb.id) AS total_bills,
  SUM(sb.total_amount) AS total_billed,
  0::numeric AS total_received,
  SUM(sb.total_amount) AS outstanding_amount,
  MIN(sb.bill_date)::date AS oldest_bill_date,
  (CURRENT_DATE - MIN(sb.bill_date)::date) AS days_since_oldest
FROM sales_bills sb
WHERE sb.total_amount > 0
  AND sb.bill_date >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY sb.customer_name, sb.party_name
ORDER BY outstanding_amount DESC;

-- 3. Create a suppliers view from purchase_bills (for Outstanding Pay page)  
CREATE OR REPLACE VIEW public.outstanding_payable AS
SELECT
  pb.supplier_name,
  pb.party_name AS tally_ledger_name,
  COUNT(pb.id) AS total_bills,
  SUM(pb.total_amount) AS total_billed,
  SUM(pb.total_amount) AS outstanding_amount,
  MIN(pb.bill_date)::date AS oldest_bill_date,
  (CURRENT_DATE - MIN(pb.bill_date)::date) AS days_since_oldest
FROM purchase_bills pb
WHERE pb.total_amount > 0
  AND pb.bill_date >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY pb.supplier_name, pb.party_name
ORDER BY outstanding_amount DESC;

-- 4. Add unique constraint on bill_number for upsert support (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_bills_bill_number_key') THEN
    ALTER TABLE sales_bills ADD CONSTRAINT sales_bills_bill_number_key UNIQUE (bill_number);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_bills_bill_number_key') THEN
    ALTER TABLE purchase_bills ADD CONSTRAINT purchase_bills_bill_number_key UNIQUE (bill_number);
  END IF;
END $$;

-- 5. Add missing columns to sales_bills if not present
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS party_name TEXT;
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS bill_date DATE;
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS tally_sync_status VARCHAR(30) DEFAULT 'synced';
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS tally_synced_at TIMESTAMPTZ;

-- 6. Add missing columns to purchase_bills if not present  
ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS party_name TEXT;
ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS bill_date DATE;
ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS tally_sync_status VARCHAR(30) DEFAULT 'synced';
ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS tally_synced_at TIMESTAMPTZ;

-- 7. Sync party_name = customer_name / supplier_name for existing rows
UPDATE sales_bills SET party_name = customer_name WHERE party_name IS NULL AND customer_name IS NOT NULL;
UPDATE sales_bills SET customer_name = party_name WHERE customer_name IS NULL AND party_name IS NOT NULL;
UPDATE purchase_bills SET party_name = supplier_name WHERE party_name IS NULL AND supplier_name IS NOT NULL;
UPDATE purchase_bills SET supplier_name = party_name WHERE supplier_name IS NULL AND party_name IS NOT NULL;

-- 8. Performance indexes
CREATE INDEX IF NOT EXISTS idx_sales_bills_bill_date ON sales_bills (bill_date);
CREATE INDEX IF NOT EXISTS idx_sales_bills_customer ON sales_bills (customer_name);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_bill_date ON purchase_bills (bill_date);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_supplier ON purchase_bills (supplier_name);
CREATE INDEX IF NOT EXISTS idx_fabric_stock_live_name ON fabric_stock_live (fabric_name);

SELECT 'Migration 20260321_tally_dashboard_fixes applied successfully ✅' AS result;
