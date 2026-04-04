import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const sql1 = fs.readFileSync('supabase/migrations/20260401_full_accounting_schema.sql', 'utf8');
const sql2 = fs.readFileSync('supabase/migrations/20260401_tally_100pct_data.sql', 'utf8');

const client = new Client({
  connectionString: 'postgres://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('Connected to Supabase!');
    console.log('Executing 20260401_full_accounting_schema.sql...');
    return client.query(sql1);
  })
  .then(() => {
    console.log('Executing 20260401_tally_100pct_data.sql...');
    return client.query(sql2);
  })
  .then(() => {
    console.log('Migrations executed successfully');
  })
  .catch(err => {
    console.error('Error executing migration:', err.message);
  })
  .finally(() => client.end());
