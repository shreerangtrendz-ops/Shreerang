#!/usr/bin/env node
/**
 * run_sql.js — Run a single Supabase migration file
 * Usage: node run_sql.js <path-to-sql-file>
 * Example: node run_sql.js supabase/migrations/20260401_tally_100pct_data.sql
 */
const fs = require('fs');
const { Client } = require('pg');

const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error('Usage: node run_sql.js <path-to-sql-file>');
  console.error('Example: node run_sql.js supabase/migrations/20260401_tally_100pct_data.sql');
  process.exit(1);
}

if (!fs.existsSync(sqlFile)) {
  console.error(`File not found: ${sqlFile}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');
const connectionString = process.env.DATABASE_URL ||
  'postgres://postgres.zdekydcscwhuusliwqaz:Shreerang2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

client.connect()
  .then(() => {
    console.log('✅ Connected to Supabase!');
    console.log(`▶ Executing ${sqlFile}...`);
    return client.query(sql);
  })
  .then(() => {
    console.log(`✅ ${sqlFile} executed successfully`);
    return client.end();
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    client.end();
    process.exit(1);
  });
