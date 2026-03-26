-- Phase 15: Add tally_sync_status and tally_pushed_at to accounting tables
-- Needed to track web-created vouchers that are queued for Tally server push

ALTER TABLE sales_bills
  ADD COLUMN IF NOT EXISTS tally_sync_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tally_pushed_at TIMESTAMPTZ;

ALTER TABLE purchase_bills
  ADD COLUMN IF NOT EXISTS tally_sync_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tally_pushed_at TIMESTAMPTZ;

ALTER TABLE job_work_bills
  ADD COLUMN IF NOT EXISTS tally_sync_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tally_pushed_at TIMESTAMPTZ;

-- Index to quickly find bills queued for push
CREATE INDEX IF NOT EXISTS idx_sales_pending_push ON sales_bills(tally_sync_status) WHERE tally_sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_purchase_pending_push ON purchase_bills(tally_sync_status) WHERE tally_sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobwork_pending_push ON job_work_bills(tally_sync_status) WHERE tally_sync_status = 'pending';
