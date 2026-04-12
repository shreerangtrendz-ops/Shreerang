const { Client } = require('pg');
const connectionString = 'postgres://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function query() {
  await client.connect();
  const res = await client.query("SELECT * FROM customers WHERE name ILIKE '%16 Fire Creation%'");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
query().catch(console.error);
