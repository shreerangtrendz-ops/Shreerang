import fs from 'fs';
import pg from 'pg';
const { Client } = pg;

const sql = `
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS tally_sync_status TEXT DEFAULT 'pending';
ALTER TABLE sales_bills ADD COLUMN IF NOT EXISTS tally_pushed_at TIMESTAMPTZ;
ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS tally_sync_status TEXT DEFAULT 'pending';
ALTER TABLE purchase_bills ADD COLUMN IF NOT EXISTS tally_pushed_at TIMESTAMPTZ;
ALTER TABLE job_work_bills ADD COLUMN IF NOT EXISTS tally_sync_status TEXT DEFAULT 'pending';
ALTER TABLE job_work_bills ADD COLUMN IF NOT EXISTS tally_pushed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_sales_pending_push ON sales_bills(tally_sync_status) WHERE tally_sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_purchase_pending_push ON purchase_bills(tally_sync_status) WHERE tally_sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobwork_pending_push ON job_work_bills(tally_sync_status) WHERE tally_sync_status = 'pending';
`;

const client = new Client({
  connectionString: 'postgres://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase DB.');
    await client.query(sql);
    console.log('✅ tally_push_columns migration executed successfully!');
  } catch (err) {
    console.error('❌ Error executing migration:', err.message);
  } finally {
    await client.end();
  }
}

run();
