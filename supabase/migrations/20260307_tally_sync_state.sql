-- tally_sync_state: tracks last successful sync date per type
-- Required for delta sync in api/tally-sync.js
CREATE TABLE IF NOT EXISTS tally_sync_state (
  sync_type TEXT PRIMARY KEY,
  last_synced_voucher_date DATE,
  total_records_synced INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial rows so delta sync has a starting point
INSERT INTO tally_sync_state (sync_type, last_synced_voucher_date)
VALUES 
  ('purchase_vouchers', '2026-01-01'),
  ('sales_vouchers', '2026-01-01')
ON CONFLICT (sync_type) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE tally_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role" ON tally_sync_state FOR ALL USING (true);
