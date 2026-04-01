-- ============================================================
-- Migration: 20260401_tally_100pct_data.sql
-- Purpose: Add missing analytical and operational fields for 
--          full Tally piece-level and UDF tracking 
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste & run
-- ============================================================

-- 1. ADD MISSING COLUMNS TO sales_bills
ALTER TABLE sales_bills
  ADD COLUMN IF NOT EXISTS customer_gstin       TEXT,
  ADD COLUMN IF NOT EXISTS customer_state       TEXT,
  ADD COLUMN IF NOT EXISTS place_of_supply      TEXT,
  ADD COLUMN IF NOT EXISTS taxable_value        NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS fabric_name          TEXT,
  ADD COLUMN IF NOT EXISTS design_no            TEXT,
  ADD COLUMN IF NOT EXISTS batch_name           TEXT,
  ADD COLUMN IF NOT EXISTS godown               TEXT,
  ADD COLUMN IF NOT EXISTS broker_name          TEXT,
  ADD COLUMN IF NOT EXISTS comm_amount          NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS comm_assessed_value  NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS credit_days          TEXT,
  ADD COLUMN IF NOT EXISTS bill_ref_number      TEXT,
  ADD COLUMN IF NOT EXISTS transporter_name     TEXT,
  ADD COLUMN IF NOT EXISTS lr_number            TEXT,
  ADD COLUMN IF NOT EXISTS destination_city     TEXT,
  ADD COLUMN IF NOT EXISTS eway_bill_no         TEXT,
  ADD COLUMN IF NOT EXISTS irn                  TEXT,
  ADD COLUMN IF NOT EXISTS irn_ack_no           TEXT,
  ADD COLUMN IF NOT EXISTS entered_by           TEXT,
  ADD COLUMN IF NOT EXISTS narration            TEXT,
  ADD COLUMN IF NOT EXISTS sales_ledger         TEXT,
  ADD COLUMN IF NOT EXISTS round_off            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS effective_date       DATE,
  ADD COLUMN IF NOT EXISTS voucher_class        TEXT,
  ADD COLUMN IF NOT EXISTS total_taka_pcs       INTEGER,
  ADD COLUMN IF NOT EXISTS line_items           JSONB;

-- 2. ADD MISSING COLUMNS TO purchase_bills
ALTER TABLE purchase_bills
  ADD COLUMN IF NOT EXISTS supplier_gstin       TEXT,
  ADD COLUMN IF NOT EXISTS supplier_state       TEXT,
  ADD COLUMN IF NOT EXISTS supplier_invoice_no  TEXT,
  ADD COLUMN IF NOT EXISTS taxable_value        NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS fabric_name          TEXT,
  ADD COLUMN IF NOT EXISTS design_no            TEXT,
  ADD COLUMN IF NOT EXISTS batch_name           TEXT,
  ADD COLUMN IF NOT EXISTS godown               TEXT,
  ADD COLUMN IF NOT EXISTS discount_pct         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS broker_name          TEXT,
  ADD COLUMN IF NOT EXISTS comm_rate            NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS credit_days          TEXT,
  ADD COLUMN IF NOT EXISTS lr_number            TEXT,
  ADD COLUMN IF NOT EXISTS destination_city     TEXT,
  ADD COLUMN IF NOT EXISTS entered_by           TEXT,
  ADD COLUMN IF NOT EXISTS narration            TEXT,
  ADD COLUMN IF NOT EXISTS purchase_ledger      TEXT,
  ADD COLUMN IF NOT EXISTS round_off            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS billed_qty           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS transporter_name     TEXT,
  ADD COLUMN IF NOT EXISTS total_taka_pcs       INTEGER,
  ADD COLUMN IF NOT EXISTS line_items           JSONB;

-- 3. ADD MISSING COLUMNS TO process_issues
ALTER TABLE process_issues
  ADD COLUMN IF NOT EXISTS challan_no           TEXT,
  ADD COLUMN IF NOT EXISTS worker_name          TEXT,
  ADD COLUMN IF NOT EXISTS party_name           TEXT,
  ADD COLUMN IF NOT EXISTS status               TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS batch_name           TEXT,
  ADD COLUMN IF NOT EXISTS godown               TEXT,
  ADD COLUMN IF NOT EXISTS fabric_sku           TEXT,
  ADD COLUMN IF NOT EXISTS party_ch_no          TEXT,
  ADD COLUMN IF NOT EXISTS narration            TEXT,
  ADD COLUMN IF NOT EXISTS lot_no               TEXT,
  ADD COLUMN IF NOT EXISTS shortage_mtrs        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS shortage_pct         NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS finished_design_no   TEXT,
  ADD COLUMN IF NOT EXISTS consumption_rate     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS consumption_amount   NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS production_rate      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS production_amount    NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS our_godown           TEXT,
  ADD COLUMN IF NOT EXISTS job_godown           TEXT,
  ADD COLUMN IF NOT EXISTS total_taka_pcs       INTEGER,
  ADD COLUMN IF NOT EXISTS supplier_bill_no     TEXT,
  ADD COLUMN IF NOT EXISTS purchase_voucher_no  TEXT,
  ADD COLUMN IF NOT EXISTS mill_process_bill_no TEXT,
  ADD COLUMN IF NOT EXISTS line_items           JSONB,
  ADD COLUMN IF NOT EXISTS tally_synced_at      TIMESTAMPTZ;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'Migration 20260401_tally_100pct_data applied successfully ✅' AS result;
