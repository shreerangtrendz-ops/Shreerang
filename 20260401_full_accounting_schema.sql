-- ============================================================================
-- FULL TALLY REPLICA SCHEMA — 100% Field Coverage
-- Date: 2026-04-01
-- Covers: Accounting Vouchers, Jobwork/Expenses, Mill Challan Takas
-- ============================================================================

-- Drop the simple financial_vouchers table (just created, no data)
DROP TABLE IF EXISTS public.financial_vouchers;

-- ─── 1. ACCOUNTING VOUCHERS (Payment / Receipt / Journal / Contra) ──────────
CREATE TABLE IF NOT EXISTS public.accounting_vouchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Header (common to all 4 types)
    voucher_number TEXT NOT NULL,
    voucher_type TEXT NOT NULL,          -- 'Payment', 'Receipt', 'Journal', 'Contra'
    voucher_date DATE NOT NULL,
    party_name TEXT,
    entered_by TEXT,
    narration TEXT,
    guid TEXT,

    -- Primary Ledger Amounts
    dr_ledger TEXT,
    dr_amount NUMERIC(15,2) DEFAULT 0,
    cr_ledger TEXT,
    cr_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,

    -- Bank / Instrument Details (Payment / Receipt / Contra)
    bank_ledger TEXT,
    payment_mode TEXT,                   -- 'Cheque', 'NEFT', 'RTGS', 'Cash'
    instrument_no TEXT,                  -- Cheque number
    instrument_date DATE,
    payment_favouring TEXT,
    cheque_cross_comment TEXT,           -- 'A/c Payee'
    urn TEXT,                            -- Unique Reference Number
    advice_status TEXT,                  -- 'Printed'
    transfer_mode TEXT,                  -- 'NEFT', 'RTGS', 'IMPS'
    ifsc_code TEXT,
    bank_name TEXT,
    account_number TEXT,

    -- Bill Settlements (multi-bill array)
    bill_allocations JSONB,
    -- Format: [{"name":"14118/25-26","bill_type":"Agst Ref","amount":9270.00}, ...]

    -- All ledger entries (full detail)
    ledger_entries JSONB DEFAULT '[]'::jsonb,

    -- Sync
    tally_sync_status TEXT DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT accounting_vouchers_vnum_vtype_unique UNIQUE (voucher_number, voucher_type)
);

CREATE INDEX IF NOT EXISTS idx_acv_date ON public.accounting_vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_acv_type ON public.accounting_vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_acv_party ON public.accounting_vouchers(party_name);

-- ─── 2. JOBWORK / EXPENSES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jobwork_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Header
    voucher_number TEXT NOT NULL UNIQUE,
    voucher_type TEXT NOT NULL,          -- 'Jobwork' or 'Expenses'
    voucher_date DATE NOT NULL,
    supplier_invoice_no TEXT,
    supplier_invoice_date DATE,
    party_name TEXT,
    party_gstin TEXT,
    gst_reg_type TEXT,
    place_of_supply TEXT,
    entered_by TEXT,
    narration TEXT,
    bill_ref TEXT,
    bill_type TEXT,

    -- Amounts
    expense_ledger TEXT,                 -- 'Mill Processing Charges', 'Transport Charges'
    expense_amount NUMERIC(15,2) DEFAULT 0,
    tds_amount NUMERIC(15,2) DEFAULT 0,
    cgst_amount NUMERIC(15,2) DEFAULT 0,
    sgst_amount NUMERIC(15,2) DEFAULT 0,
    igst_amount NUMERIC(15,2) DEFAULT 0,
    round_off NUMERIC(15,2) DEFAULT 0,
    party_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,

    -- Full ledger entries
    ledger_entries JSONB DEFAULT '[]'::jsonb,

    -- Sync
    tally_sync_status TEXT DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jwe_date ON public.jobwork_expenses(voucher_date);
CREATE INDEX IF NOT EXISTS idx_jwe_type ON public.jobwork_expenses(voucher_type);
CREATE INDEX IF NOT EXISTS idx_jwe_party ON public.jobwork_expenses(party_name);

-- ─── 3. MILL CHALLAN TAKAS (TDL print format — taka-level detail) ───────────
CREATE TABLE IF NOT EXISTS public.mill_challan_takas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lot_no TEXT NOT NULL,
    taka_sr_no INTEGER NOT NULL,
    taka_mtrs NUMERIC(10,2) DEFAULT 0,
    taka_group TEXT,                     -- 'part1', 'part2', 'part3'
    issue_voucher_number TEXT,           -- FK to process_issues.voucher_number
    tally_synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(lot_no, taka_sr_no)
);

CREATE INDEX IF NOT EXISTS idx_mct_lot ON public.mill_challan_takas(lot_no);

-- ─── Update triggers ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_accounting_vouchers_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_acv_updated ON public.accounting_vouchers;
CREATE TRIGGER trg_acv_updated
BEFORE UPDATE ON public.accounting_vouchers
FOR EACH ROW EXECUTE PROCEDURE update_accounting_vouchers_ts();
