-- ============================================================
-- MIGRATION: Tally Multi-Company Support
-- Shreerang Trendz ERP | March 2026
-- ============================================================

CREATE TABLE IF NOT EXISTS tally_companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    text NOT NULL,
  tally_alias     text,
  is_active       boolean DEFAULT true,
  is_default      boolean DEFAULT false,
  last_synced_at  timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Insert known companies (adjust as needed)
INSERT INTO tally_companies (company_name, is_default) VALUES
  ('Cotton Fabrics', true)
ON CONFLICT DO NOTHING;
