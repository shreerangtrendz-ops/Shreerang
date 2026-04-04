import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

// Run a specific migration file: node run_sql.js <filename>
// e.g. node run_sql.js 20260401_tally_100pct_data.sql
const target = process.argv[2] || '20260401_tally_100pct_data.sql';
const sqlPath = `supabase/migrations/${target}`;

if (!fs.existsSync(sqlPath)) {
  console.error(`\u274c File not found: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('\u2705 Connected to Supabase!');
    console.log(`\u25b6 Executing ${target}...`);
    return client.query(sql);
  })
  .then(() => {
    console.log(`\u2705 ${target} executed successfully`);
  })
  .catch(err => {
    console.error('\u274c Error executing migration:', err.message);
  })
  .finally(() => client.end());
