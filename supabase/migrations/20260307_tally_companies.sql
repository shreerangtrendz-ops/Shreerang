
-- ============================================================
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/zdekydcscwhuusliwqaz/editor
-- ============================================================

-- 1. Tally Companies table
CREATE TABLE IF NOT EXISTS tally_companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    text NOT NULL UNIQUE,
  tally_alias     text,
  period_from     date,
  period_to       date,
  is_active       boolean DEFAULT true,
  is_default      boolean DEFAULT false,
  last_synced_at  timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Insert both ShreeRang companies from Tally
INSERT INTO tally_companies (company_name, tally_alias, period_from, period_to, is_active, is_default) VALUES
  ('ShreeRang Trendz Pvt. Ltd. - (from 1-Apr-2019)', 'SRTPL Current', '2019-04-01', '2027-03-31', true, true),
  ('ShreeRang Trendz Pvt. Ltd. - (from 1-Apr-2013)', 'SRTPL Old', '2013-04-01', '2019-03-31', true, false)
ON CONFLICT (company_name) DO NOTHING;

-- 2. Delta sync state table
ALTER TABLE tally_sync_log ADD COLUMN IF NOT EXISTS last_voucher_date date;

CREATE TABLE IF NOT EXISTS tally_sync_state (
  sync_type                text PRIMARY KEY,
  last_synced_voucher_date date,
  total_records_synced     integer DEFAULT 0,
  updated_at               timestamptz DEFAULT now()
);
