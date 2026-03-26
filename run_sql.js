const fs = require('fs');
const { Client } = require('pg');

const sql = fs.readFileSync('supabase/migrations/20260326_tally_canonical_fields.sql', 'utf8');
const client = new Client({
  connectionString: 'postgres://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('Connected to Supabase!');
    return client.query(sql);
  })
  .then(res => {
    console.log('Migration executed successfully');
  })
  .catch(err => {
    console.error('Error executing migration:', err.message);
  })
  .finally(() => client.end());
