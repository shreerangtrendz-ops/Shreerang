-- ============================================================
-- Migration: 20260401_financial_vouchers.sql
-- Purpose: Unified schema for Receipts, Payments, Contras, 
--          Credit Notes, Debit Notes, and Journals 
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste & run
-- ============================================================

CREATE TABLE IF NOT EXISTS financial_vouchers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_number text NOT NULL,
  voucher_type text NOT NULL,
  bill_date date NOT NULL,
  party_name text,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  narration text,
  line_items jsonb, -- { ledgers: [{name, amount, is_debit}], bills: [...] }
  bank_details jsonb, -- { instrument_no, instrument_date, bank_name }
  entered_by text,
  tally_sync_status text DEFAULT 'pending',
  tally_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT financial_vouchers_unique_vnum UNIQUE (voucher_number, voucher_type)
);

-- Enable RLS (Assuming all new tables need this based on standard practice)
ALTER TABLE financial_vouchers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all authenticated users full access" ON financial_vouchers FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anon read" ON financial_vouchers FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_financial_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_financial_vouchers_updated_at ON financial_vouchers;
CREATE TRIGGER trigger_financial_vouchers_updated_at
BEFORE UPDATE ON financial_vouchers
FOR EACH ROW EXECUTE FUNCTION update_financial_vouchers_updated_at();

-- Add Indexes for performant filtering
CREATE INDEX IF NOT EXISTS idx_fv_bill_date ON financial_vouchers(bill_date);
CREATE INDEX IF NOT EXISTS idx_fv_vtype ON financial_vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_fv_party ON financial_vouchers(party_name);

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'Migration 20260401_financial_vouchers applied successfully ✅' AS result;
