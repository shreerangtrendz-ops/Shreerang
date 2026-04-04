import { createClient } from '@supabase/supabase-js';
const s = createClient('https://zdekydcscwhuusliwqaz.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg');
async function run() {
  const { data } = await s.from('tally_sync_state').select('*').limit(1);
  console.log("COLUMNS:", Object.keys(data[0] || {}).join(", "));
}
run();
