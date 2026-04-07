import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const SQL_COMMANDS = `
TRUNCATE TABLE sales_bills CASCADE;
TRUNCATE TABLE purchase_bills CASCADE;
TRUNCATE TABLE grey_purchase CASCADE;
TRUNCATE TABLE process_issues CASCADE;
TRUNCATE TABLE issue_to_mill CASCADE;
TRUNCATE TABLE rec_from_mill CASCADE;
TRUNCATE TABLE stock_journal CASCADE;
TRUNCATE TABLE credit_note CASCADE;
TRUNCATE TABLE credit_note_items CASCADE;
TRUNCATE TABLE debit_note CASCADE;
TRUNCATE TABLE jobwork_expenses CASCADE;
TRUNCATE TABLE accounting_vouchers CASCADE;
TRUNCATE TABLE receipt_payment_lines CASCADE;
TRUNCATE TABLE mill_challan_takas CASCADE;

TRUNCATE TABLE tally_sync_log CASCADE;
TRUNCATE TABLE tally_sync_state CASCADE;
`;

const client = new Client("postgres://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres");

console.log("Connecting to Supabase Db via Deno...");
await client.connect();
console.log("✅ Connected! Executing truncate commands...");

try {
  await client.queryArray(SQL_COMMANDS);
  console.log("✅ Successfully truncated all tables.");
} catch (error) {
  console.error("❌ Error executing SQL:", error);
} finally {
  await client.end();
}
