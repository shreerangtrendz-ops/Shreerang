import pg from 'pg';
const { Client } = pg;

const sql = `
ALTER TABLE process_issues ADD COLUMN IF NOT EXISTS supplier_bill_no TEXT;
ALTER TABLE process_issues ADD COLUMN IF NOT EXISTS purchase_voucher_no TEXT;
ALTER TABLE process_issues ADD COLUMN IF NOT EXISTS mill_process_bill_no TEXT;
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
    console.log('✅ process_issues columns (supplier_bill_no, purchase_voucher_no, mill_process_bill_no) added successfully!');
  } catch (err) {
    console.error('❌ Error executing migration:', err.message);
  } finally {
    await client.end();
  }
}

run();
