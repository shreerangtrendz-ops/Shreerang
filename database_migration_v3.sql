
-- WhatsApp Bot v3 — New Tables Migration
-- Run in Supabase SQL Editor

-- 1. Follow-up reminders table
CREATE TABLE IF NOT EXISTS whatsapp_followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  message TEXT NOT NULL,
  fire_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_followups_fire_at ON whatsapp_followups(fire_at, status);

-- 2. Admin approvals table
CREATE TABLE IF NOT EXISTS whatsapp_admin_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id TEXT UNIQUE NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  request_type TEXT NOT NULL,
  details JSONB,
  pending_message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','edit_pending')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON whatsapp_admin_approvals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_customer ON whatsapp_admin_approvals(customer_phone, status);

-- 3. Customer design references (images shared by customers)
CREATE TABLE IF NOT EXISTS customer_design_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  media_id TEXT,
  media_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sourced','sent','closed')),
  supplier_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add missing columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_width TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_styles TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_tier TEXT DEFAULT 'unknown';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Supplier design requests
CREATE TABLE IF NOT EXISTS supplier_design_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_phone TEXT NOT NULL,
  supplier_name TEXT,
  category TEXT NOT NULL,
  style TEXT,
  notes TEXT,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested','received','approved','sent_to_customer')),
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS Policies (allow service role full access)
ALTER TABLE whatsapp_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_admin_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_design_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_design_requests ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY IF NOT EXISTS "service_role_all_followups" ON whatsapp_followups FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_approvals" ON whatsapp_admin_approvals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_design_refs" ON customer_design_references FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_supplier_req" ON supplier_design_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
