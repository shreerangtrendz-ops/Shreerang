const supabaseUrl = 'https://zdekydcscwhuusliwqaz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDk4NTUsImV4cCI6MjA3OTAyNTg1NX0.47cCribhShEYGqsLbsh7lUwFaFK-rXf2SusVhq4-p0o';

async function countTable(table) {
  const r = await fetch(`${supabaseUrl}/rest/v1/${table}?select=count`, {
    headers: { 'apikey': supabaseKey, 'Prefer': 'count=exact' }
  });
  if (r.ok) {
    const range = r.headers.get('content-range');
    console.log(`${table}: ${range}`);
  } else {
    console.log(`${table}: ERROR ${r.status} ${await r.text()}`);
  }
}

async function run() {
  await countTable('sales_bills');
  await countTable('tally_ledgers');
  await countTable('sales_orders');
  await countTable('outstanding_receivable');
}

run();
