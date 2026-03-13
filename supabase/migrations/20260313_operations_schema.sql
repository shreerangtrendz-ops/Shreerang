-- ============================================================
-- SHREERANG TRENDZ — FULL OPERATIONS SCHEMA
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. SALES ORDERS (already may exist — safe with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_no TEXT UNIQUE,
  party_name TEXT NOT NULL,
  party_id UUID REFERENCES tally_ledgers(id) ON DELETE SET NULL,
  finish_fabric_id UUID REFERENCES finish_fabrics(id) ON DELETE SET NULL,
  fabric_name TEXT,
  design_no TEXT,
  metres NUMERIC DEFAULT 0,
  rate NUMERIC DEFAULT 0,
  amount NUMERIC GENERATED ALWAYS AS (metres * rate) STORED,
  delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_production','ready','dispatched','cancelled')),
  notes TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. JOB CARDS (auto-generated from sales orders)
CREATE TABLE IF NOT EXISTS job_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_no TEXT UNIQUE,
  order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  finish_fabric_id UUID REFERENCES finish_fabrics(id) ON DELETE SET NULL,
  fabric_name TEXT,
  design_no TEXT,
  process_step TEXT NOT NULL,
  step_sequence INT DEFAULT 1,
  job_worker_id UUID,
  job_worker_name TEXT,
  rate NUMERIC DEFAULT 0,
  shortage_pct NUMERIC DEFAULT 0,
  qty_sent NUMERIC DEFAULT 0,
  qty_received NUMERIC DEFAULT 0,
  qty_shortage NUMERIC GENERATED ALWAYS AS (qty_sent - qty_received) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','at_mill','received','quality_check','done')),
  sent_date DATE,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. JOB WORKERS MASTER
CREATE TABLE IF NOT EXISTS job_workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  process_type TEXT,
  phone TEXT,
  address TEXT,
  gst_no TEXT,
  rate_per_metre NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PRODUCTION TRACKER (kanban stages for batches)
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_no TEXT UNIQUE,
  order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  finish_fabric_id UUID REFERENCES finish_fabrics(id) ON DELETE SET NULL,
  fabric_name TEXT,
  total_metres NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'grey_in' CHECK (stage IN ('grey_in','printing','embroidery','finishing','quality','ready','dispatched')),
  current_job_worker TEXT,
  dispatched_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PAYMENT REMINDERS LOG
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  party_name TEXT NOT NULL,
  party_phone TEXT,
  amount_due NUMERIC DEFAULT 0,
  days_overdue INT DEFAULT 0,
  reminder_type TEXT DEFAULT 'auto' CHECK (reminder_type IN ('auto','manual')),
  message_sent TEXT,
  whatsapp_status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. WHATSAPP LOG
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_number TEXT,
  to_name TEXT,
  message_type TEXT,
  template_name TEXT,
  message_body TEXT,
  status TEXT DEFAULT 'pending',
  wa_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_party ON sales_orders(party_name);
CREATE INDEX IF NOT EXISTS idx_job_cards_order ON job_cards(order_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status);
CREATE INDEX IF NOT EXISTS idx_production_batches_stage ON production_batches(stage);

-- Auto-generate order_no
CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_no IS NULL THEN
    NEW.order_no := 'ORD-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(CAST(nextval('order_no_seq') AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_no_seq START 1;
DROP TRIGGER IF EXISTS trg_order_no ON sales_orders;
CREATE TRIGGER trg_order_no BEFORE INSERT ON sales_orders FOR EACH ROW EXECUTE FUNCTION generate_order_no();

-- Auto-generate job card number
CREATE OR REPLACE FUNCTION generate_card_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.card_no IS NULL THEN
    NEW.card_no := 'JC-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(CAST(nextval('card_no_seq') AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS card_no_seq START 1;
DROP TRIGGER IF EXISTS trg_card_no ON job_cards;
CREATE TRIGGER trg_card_no BEFORE INSERT ON job_cards FOR EACH ROW EXECUTE FUNCTION generate_card_no();

-- Auto-generate batch number
CREATE OR REPLACE FUNCTION generate_batch_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_no IS NULL THEN
    NEW.batch_no := 'BAT-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(CAST(nextval('batch_no_seq') AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS batch_no_seq START 1;
DROP TRIGGER IF EXISTS trg_batch_no ON production_batches;
CREATE TRIGGER trg_batch_no BEFORE INSERT ON production_batches FOR EACH ROW EXECUTE FUNCTION generate_batch_no();
