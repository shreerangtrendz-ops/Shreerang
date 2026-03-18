// api/tally-stock-sync.js
// Syncs Tally Stock Summary → tally_stock_items table in Supabase
// Called by cron every night OR manually from TallySyncDashboard

const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';
const TALLY_EDGE = 'https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-proxy';

const STOCK_XML = `<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Stock Summary</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

function extractTag(xml, tag) { const m = xml.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i')); return m ? m[1].trim() : ''; }
function extractAll(xml, tag) { const r = [], re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'gi'); let m; while ((m = re.exec(xml)) !== null) r.push(m[1].trim()); return r; }
function parseNum(s) { if (!s) return 0; const n = parseFloat(s.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }

function parseStockXML(xml) {
  const items = [];
  const blocks = xml.match(/<STOCKITEM[\s\S]*?<\/STOCKITEM>/gi) || [];
  for (const b of blocks) {
    const name = extractTag(b, 'NAME') || extractTag(b, 'STOCKITEMNAME');
    if (!name || name.length < 2) continue;
    const group = extractTag(b, 'PARENT') || extractTag(b, 'STOCKGROUPNAME') || 'Primary';
    const closingQty = parseNum(extractTag(b, 'CLOSINGBALANCE') || extractTag(b, 'CLOSINGQTY'));
    const closingVal = parseNum(extractTag(b, 'CLOSINGVALUE') || extractTag(b, 'CLOSINGAMT'));
    const openingQty = parseNum(extractTag(b, 'OPENINGBALANCE') || extractTag(b, 'OPENINGQTY'));
    const openingVal = parseNum(extractTag(b, 'OPENINGVALUE') || extractTag(b, 'OPENINGAMT'));
    const rate = closingQty > 0 ? Math.round((closingVal / closingQty) * 100) / 100 : 0;
    const unit = extractTag(b, 'BASEUNITS') || extractTag(b, 'UOM') || 'Mtr';
    items.push({ item_name: name, group_name: group, closing_qty: closingQty, closing_value: closingVal, opening_qty: openingQty, opening_value: openingVal, rate, unit, synced_at: new Date().toISOString() });
  }
  return items;
}

async function upsertToSupabase(items) {
  if (!items.length) return 0;
  // Batch in groups of 50
  let total = 0;
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tally_stock_items?on_conflict=item_name`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(batch)
    });
    if (!r.ok) { const t = await r.text(); throw new Error('Supabase upsert: ' + t.slice(0, 200)); }
    total += batch.length;
  }
  return total;
}

async function logSync(status, count, error) {
  await fetch(`${SUPABASE_URL}/rest/v1/tally_sync_log`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sync_type: 'stock_items', status, records_synced: count, error_message: error || null, synced_at: new Date().toISOString() })
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const startTime = Date.now();
  console.log('[tally-stock-sync] Starting stock sync at', new Date().toISOString());

  try {
    // 1. Fetch from Tally via edge function
    const proxyRes = await fetch(TALLY_EDGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      body: JSON.stringify({ xmlBody: STOCK_XML }),
      signal: AbortSignal.timeout(25000)
    });
    if (!proxyRes.ok) { const t = await proxyRes.text(); throw new Error('Proxy error ' + proxyRes.status + ': ' + t.slice(0, 200)); }

    const proxyData = await proxyRes.json();
    const xml = proxyData?.xml || proxyData?.data || '';
    if (!xml || xml.length < 50) throw new Error('Empty response from Tally - is Tally open and FRP running?');

    // 2. Parse XML
    const items = parseStockXML(xml);
    if (!items.length) throw new Error('No stock items found in Tally response');

    // 3. Upsert to Supabase
    const count = await upsertToSupabase(items);
    await logSync('success', count, null);

    const elapsed = Date.now() - startTime;
    console.log(`[tally-stock-sync] Done: ${count} items in ${elapsed}ms`);

    return res.status(200).json({
      success: true,
      records_synced: count,
      elapsed_ms: elapsed,
      message: `✅ ${count} stock items synced from Tally`,
      synced_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('[tally-stock-sync] Error:', err.message);
    await logSync('error', 0, err.message).catch(() => {});
    return res.status(200).json({
      success: false,
      error: err.message,
      fix: 'Make sure Tally is open on Office PC and FRP tunnel is running'
    });
  }
}
