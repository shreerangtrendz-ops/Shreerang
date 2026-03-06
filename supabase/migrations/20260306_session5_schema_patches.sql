-- ============================================================
-- SHREERANG TRENDZ — Schema Patches (Session 5+)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/zdekydcscwhuusliwqaz
-- ============================================================

-- 1. Fix generate_sales_order_number() to use SRTPL/NNNN/YY-YY format
CREATE OR REPLACE FUNCTION public.generate_sales_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  new_number TEXT;
  current_fy TEXT;
  yr INT := EXTRACT(YEAR FROM NOW())::INT;
  mo INT := EXTRACT(MONTH FROM NOW())::INT;
  next_seq INT;
BEGIN
  -- Financial year: April = month 4 onwards
  IF mo >= 4 THEN
    current_fy := LPAD((yr - 2000)::TEXT, 2, '0') || '-' || LPAD((yr - 2000 + 1)::TEXT, 2, '0');
  ELSE
    current_fy := LPAD((yr - 2000 - 1)::TEXT, 2, '0') || '-' || LPAD((yr - 2000)::TEXT, 2, '0');
  END IF;

  -- Get max serial for this FY
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_no LIKE 'SRTPL/%/' || current_fy
      THEN SPLIT_PART(order_no, '/', 2)::INT
      ELSE 0
    END
  ), 0) + 1 INTO next_seq
  FROM public.sales_orders;

  new_number := 'SRTPL/' || LPAD(next_seq::TEXT, 4, '0') || '/' || current_fy;
  RETURN new_number;
END;
$$;

-- 2. Add missing columns to sales_orders (safe - won't fail if already exist)
ALTER TABLE public.sales_orders 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id),
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS order_channel TEXT DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'credit',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tally_sync_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tally_voucher_id TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS dispatch_date DATE,
  ADD COLUMN IF NOT EXISTS tracking_info TEXT;

-- 3. Create tally_sync_log table if not exists
CREATE TABLE IF NOT EXISTS public.tally_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  direction TEXT,
  record_id TEXT,
  status TEXT DEFAULT 'success',
  records_synced INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create tally_sync_errors table if not exists
CREATE TABLE IF NOT EXISTS public.tally_sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  direction TEXT,
  record_id TEXT,
  error_message TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Recreate outstanding_receivable VIEW (from MasterKB v9)
CREATE OR REPLACE VIEW public.outstanding_receivable AS
SELECT 
  c.id AS customer_id,
  c.name AS customer_name,
  c.tally_ledger_name,
  c.credit_days,
  COUNT(so.id) AS total_bills,
  SUM(so.total_amount) AS total_billed,
  COALESCE(SUM(pf.actual_received), 0) AS total_received,
  SUM(so.total_amount) - COALESCE(SUM(pf.actual_received), 0) AS outstanding_amount,
  MIN(so.created_at::date) AS oldest_bill_date,
  CURRENT_DATE - MIN(so.created_at::date + INTERVAL '1 day' * COALESCE(c.credit_days, 30)) AS max_days_overdue
FROM sales_orders so
LEFT JOIN customers c ON c.id = so.customer_id
LEFT JOIN payment_followups pf ON pf.customer_id = c.id AND pf.status = 'received'
WHERE so.status IN ('confirmed', 'dispatched', 'delivered')
GROUP BY c.id, c.name, c.tally_ledger_name, c.credit_days
HAVING SUM(so.total_amount) > COALESCE(SUM(pf.actual_received), 0);

-- 6. Add cash_bank_ledger initial data (update with real values from Tally)
CREATE TABLE IF NOT EXISTS public.cash_bank_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT UNIQUE NOT NULL,
  account_type TEXT DEFAULT 'bank',
  balance NUMERIC(14,2) DEFAULT 0,
  balance_date DATE DEFAULT CURRENT_DATE,
  tally_ledger_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default accounts (update balances from Tally)
INSERT INTO public.cash_bank_ledger (account_name, account_type, balance, balance_date, tally_ledger_name)
VALUES 
  ('HDFC Bank', 'bank', 0, CURRENT_DATE, 'HDFC Bank'),
  ('SBI Bank', 'bank', 0, CURRENT_DATE, 'State Bank of India'),
  ('Cash in Hand', 'cash', 0, CURRENT_DATE, 'Cash')
ON CONFLICT (account_name) DO NOTHING;

-- ============================================================
-- DONE — Run above in Supabase SQL Editor
-- ============================================================
