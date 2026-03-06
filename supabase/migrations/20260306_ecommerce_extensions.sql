-- ============================================================
-- Shreerang Trendz — Ecommerce Schema Extensions
-- Migration: 20260306_ecommerce_extensions.sql
-- Run in: Supabase SQL Editor → zdekydcscwhuusliwqaz
-- ============================================================

-- ─── 1. CUSTOMERS TABLE — Add ecom/portal columns ──────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS login_email        text,
  ADD COLUMN IF NOT EXISTS price_tier         text DEFAULT 'wholesale' CHECK (price_tier IN ('retail', 'wholesale', 'vip')),
  ADD COLUMN IF NOT EXISTS ecom_enabled       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_number    text,
  ADD COLUMN IF NOT EXISTS shipping_address   jsonb DEFAULT '{}';

-- Index for portal login lookups
CREATE INDEX IF NOT EXISTS idx_customers_login_email ON public.customers(login_email);
CREATE INDEX IF NOT EXISTS idx_customers_ecom_enabled ON public.customers(ecom_enabled) WHERE ecom_enabled = true;

COMMENT ON COLUMN public.customers.login_email    IS 'Links to Supabase Auth UUID email for customer portal login';
COMMENT ON COLUMN public.customers.price_tier     IS 'Controls which price column customer sees: retail/wholesale/vip';
COMMENT ON COLUMN public.customers.ecom_enabled   IS 'Master switch — can this customer log into the portal?';
COMMENT ON COLUMN public.customers.whatsapp_number IS 'WhatsApp number for order confirmations and payment reminders';
COMMENT ON COLUMN public.customers.shipping_address IS 'Default delivery address for ecom orders';

-- ─── 2. SALES_ORDERS TABLE — Add channel tracking columns ──
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS order_channel      text DEFAULT 'admin' CHECK (order_channel IN ('website', 'admin', 'whatsapp', 'sales-rep')),
  ADD COLUMN IF NOT EXISTS tally_voucher_id   text,
  ADD COLUMN IF NOT EXISTS dispatch_date      date,
  ADD COLUMN IF NOT EXISTS shipping_address_snapshot jsonb DEFAULT '{}';

-- Index for channel filtering
CREATE INDEX IF NOT EXISTS idx_sales_orders_channel ON public.sales_orders(order_channel);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tally    ON public.sales_orders(tally_voucher_id) WHERE tally_voucher_id IS NOT NULL;

COMMENT ON COLUMN public.sales_orders.order_channel IS 'Origin channel: website=ecom, admin=dashboard, whatsapp=n8n bot, sales-rep=field agent';
COMMENT ON COLUMN public.sales_orders.tally_voucher_id IS 'Tally Sales Voucher ID — set when pushOrderToTally() runs on dispatch';
COMMENT ON COLUMN public.sales_orders.dispatch_date IS 'Actual dispatch date — triggers WhatsApp tracking notification via n8n';
COMMENT ON COLUMN public.sales_orders.shipping_address_snapshot IS 'Frozen delivery address at order time (immutable copy)';

-- ─── 3. DESIGN_BATCH_MASTER — Add ecom visibility columns ──
ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS retail_price       numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ecom_visible       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_order_qty      numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS short_description  text,
  ADD COLUMN IF NOT EXISTS tags               text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_designs_ecom_visible ON public.designs(ecom_visible) WHERE ecom_visible = true;

COMMENT ON COLUMN public.designs.retail_price     IS 'B2C retail price shown to price_tier=retail customers';
COMMENT ON COLUMN public.designs.wholesale_price  IS 'B2B wholesale price shown to price_tier=wholesale/vip customers';
COMMENT ON COLUMN public.designs.ecom_visible     IS 'Show on public catalogue — admin toggle in /admin/ecom';
COMMENT ON COLUMN public.designs.min_order_qty    IS 'Minimum order quantity for B2B wholesale customers';
COMMENT ON COLUMN public.designs.short_description IS 'SEO meta description and product card tagline';
COMMENT ON COLUMN public.designs.tags             IS 'Filter categories for catalogue: e.g. [embroidery, hakoba, digital-print]';

-- ─── 4. FABRIC_STOCK RESERVATION ──────────────────────────
ALTER TABLE public.fabric_stock
  ADD COLUMN IF NOT EXISTS reserved_qty      numeric DEFAULT 0;

COMMENT ON COLUMN public.fabric_stock.reserved_qty IS 'Cart-reserved qty: stock_qty - reserved_qty = available to buy';

-- ─── 5. CART_SESSIONS TABLE (new) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_sessions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   text NOT NULL,
  customer_id  uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  items        jsonb NOT NULL DEFAULT '[]',
  created_at   timestamp with time zone DEFAULT now(),
  expires_at   timestamp with time zone DEFAULT (now() + interval '1 hour'),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_customer ON public.cart_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_expires  ON public.cart_sessions(expires_at);

COMMENT ON TABLE public.cart_sessions IS 'Temporary 1-hour cart sessions. Reserves stock until checkout or expiry.';

-- ─── 6. PRODUCT_ENQUIRIES TABLE (new) ─────────────────────
CREATE TABLE IF NOT EXISTS public.product_enquiries (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  design_no    text,
  name         text NOT NULL,
  phone        text,
  message      text,
  source       text DEFAULT 'catalogue' CHECK (source IN ('catalogue', 'whatsapp', 'website', 'bulk')),
  converted    boolean DEFAULT false,
  created_at   timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_enquiries_design  ON public.product_enquiries(design_no);
CREATE INDEX IF NOT EXISTS idx_product_enquiries_converted ON public.product_enquiries(converted);

COMMENT ON TABLE public.product_enquiries IS 'Lead capture from public catalogue — converts to sales_orders when followed up';

-- ─── 7. ORDER NUMBER AUTO-GENERATION TRIGGER ──────────────
-- Generates: SRTPL/0001/25-26 format (GST-compliant sequential numbering)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_count    int;
  v_serial   text;
  v_fy_start int;
  v_fy_end   int;
  v_fy_label text;
BEGIN
  -- Only generate if order_no is empty/null
  IF NEW.order_no IS NOT NULL AND NEW.order_no <> '' THEN
    RETURN NEW;
  END IF;

  -- Determine financial year (April-March)
  IF EXTRACT(MONTH FROM now()) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM now())::int;
  ELSE
    v_fy_start := EXTRACT(YEAR FROM now())::int - 1;
  END IF;
  v_fy_end   := v_fy_start + 1;
  v_fy_label := RIGHT(v_fy_start::text, 2) || '-' || RIGHT(v_fy_end::text, 2);

  -- Count existing orders for this financial year
  SELECT COUNT(*) INTO v_count
  FROM public.sales_orders
  WHERE created_at >= make_date(v_fy_start, 4, 1)::timestamp
    AND created_at < make_date(v_fy_end, 4, 1)::timestamp;

  v_serial := LPAD((v_count + 1)::text, 4, '0');
  NEW.order_no := 'SRTPL/' || v_serial || '/' || v_fy_label;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_order_number ON public.sales_orders;
CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- ─── 8. RLS POLICIES FOR CUSTOMER PORTAL ──────────────────
-- Customers can only see their own orders
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_own_orders" ON public.sales_orders;
CREATE POLICY "customer_own_orders" ON public.sales_orders
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    customer_id IN (
      SELECT id FROM public.customers
      WHERE login_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Customers can see designs that are ecom_visible
DROP POLICY IF EXISTS "public_ecom_designs" ON public.designs;
CREATE POLICY "public_ecom_designs" ON public.designs
  FOR SELECT
  USING (ecom_visible = true OR auth.role() = 'authenticated');

-- ─── DONE ──────────────────────────────────────────────────
-- Run this in Supabase SQL Editor → zdekydcscwhuusliwqaz
-- Estimated execution time: <5 seconds
-- No data migration needed — all ADD COLUMN IF NOT EXISTS
-- ============================================================
