// api/tally-nightly.js
// Master nightly cron — runs all Tally syncs in sequence
// Triggered by Vercel Cron at 11:00 PM IST (17:30 UTC) every day
// Also callable manually: GET/POST /api/tally-nightly

const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.shreerangtrendz.com';
const CRON_SECRET = process.env.CRON_SECRET || 'shreerang_cron_2026';

async function callSync(endpoint, label) {
  const start = Date.now();
  try {
    const r = await fetch(`${BASE_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(55000)
    });
    const data = await r.json();
    const elapsed = Date.now() - start;
    return { label, success: data.success !== false, records: data.records_synced || 0, elapsed_ms: elapsed, error: data.error || null };
  } catch (err) {
    return { label, success: false, records: 0, elapsed_ms: Date.now() - start, error: err.message };
  }
}

async function logNightlySync(results) {
  const totalRecords = results.reduce((s, r) => s + r.records, 0);
  const allSuccess = results.every(r => r.success);
  await fetch(`${SUPABASE_URL}/rest/v1/tally_sync_log`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sync_type: 'nightly_full',
      status: allSuccess ? 'success' : 'partial',
      records_synced: totalRecords,
      error_message: results.filter(r => !r.success).map(r => `${r.label}: ${r.error}`).join('; ') || null,
      synced_at: new Date().toISOString()
    })
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify cron secret for security (Vercel passes this automatically)
  const authHeader = req.headers['authorization'] || '';
  const cronHeader = req.headers['x-vercel-signature'] || req.query?.secret || '';
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const isAuthorized = isVercelCron || cronHeader === CRON_SECRET || authHeader.includes(CRON_SECRET);

  if (!isAuthorized && req.method === 'GET' && !req.query?.run) {
    // Status check - anyone can see last sync
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tally_sync_log?order=synced_at.desc&limit=5`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const logs = await r.json();
    return res.status(200).json({ message: 'Tally Nightly Sync API', last_syncs: logs });
  }

  const startTime = Date.now();
  console.log('[tally-nightly] Starting nightly sync at', new Date().toISOString());

  const results = [];

  // 1. Sync Masters (Stock + Ledgers combined)
  console.log('[tally-nightly] Step 1/3: Masters (Stock & Ledgers)...');
  results.push(await callSync('tally-masters-sync', 'Masters (Stock & Ledgers)'));

  // 2. Sync Purchase Vouchers (today's chunk)
  console.log('[tally-nightly] Step 2/3: Purchase vouchers...');
  results.push(await callSync('tally-vouchers-sync?type=purchase', 'Purchase Vouchers'));

  // 3. Sync Sales Vouchers (today's chunk)
  console.log('[tally-nightly] Step 3/3: Sales vouchers...');
  results.push(await callSync('tally-vouchers-sync?type=sales', 'Sales Vouchers'));

  // Log summary
  await logNightlySync(results).catch(() => {});

  const totalElapsed = Date.now() - startTime;
  const allSuccess = results.every(r => r.success);
  const totalRecords = results.reduce((s, r) => s + r.records, 0);

  console.log(`[tally-nightly] Done in ${totalElapsed}ms. Total records: ${totalRecords}`);

  return res.status(200).json({
    success: allSuccess,
    total_records_synced: totalRecords,
    total_elapsed_ms: totalElapsed,
    completed_at: new Date().toISOString(),
    steps: results,
    summary: allSuccess
      ? `✅ All synced: ${totalRecords} records in ${Math.round(totalElapsed / 1000)}s`
      : `⚠️ Partial sync: ${results.filter(r => r.success).length}/${results.length} steps succeeded`
  });
}
