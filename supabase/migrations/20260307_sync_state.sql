-- ============================================================
-- MIGRATION: Delta Sync State Tracking
-- Shreerang Trendz ERP | March 2026
-- ============================================================

ALTER TABLE tally_sync_log ADD COLUMN IF NOT EXISTS last_voucher_date date;

CREATE TABLE IF NOT EXISTS tally_sync_state (
  sync_type                text PRIMARY KEY,
  last_synced_voucher_date date,
  total_records_synced     integer DEFAULT 0,
  updated_at               timestamptz DEFAULT now()
);
