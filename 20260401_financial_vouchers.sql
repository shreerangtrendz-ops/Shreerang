-- Migration: Add financial_vouchers table for tracking Receipts, Payments, Contra, etc.
-- Date: 2026-04-01

CREATE TABLE IF NOT EXISTS public.financial_vouchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    voucher_type TEXT NOT NULL, -- 'Receipt', 'Payment', 'Contra', 'Debit Note', 'Credit Note'
    voucher_number TEXT NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC(15,2) DEFAULT 0,
    party_name TEXT,
    narration TEXT,
    ledger_entries JSONB DEFAULT '[]'::jsonb, -- Array of debits/credits
    instrument_details JSONB DEFAULT '{}'::jsonb, -- Bank/Cheque info
    tally_sync_status TEXT DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(voucher_number, voucher_type, date)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_date ON public.financial_vouchers(date);
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_type ON public.financial_vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_party ON public.financial_vouchers(party_name);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_financial_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc', now());
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_financial_vouchers_updated_at ON public.financial_vouchers;
CREATE TRIGGER trg_financial_vouchers_updated_at
BEFORE UPDATE ON public.financial_vouchers
FOR EACH ROW EXECUTE PROCEDURE update_financial_vouchers_updated_at();
