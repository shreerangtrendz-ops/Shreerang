// api/tally-ledger-sync.js
// Syncs Tally Ledgers → tally_ledgers table (customers, suppliers, accounts)

const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';
const TALLY_EDGE = 'https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-proxy';

const LEDGER_XML = `<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Accounts</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

function extractTag(xml, tag) { const m = xml.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i')); return m ? m[1].trim() : ''; }
function parseNum(s) { if (!s) return 0; const neg = s.includes('Cr') ? -1 : 1; const n = parseFloat(s.replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n * neg; }

function parseLedgerXML(xml) {
  const ledgers = [];
  const blocks = xml.match(/<LEDGER[\s\S]*?<\/LEDGER>/gi) || [];
  for (const b of blocks) {
    const name = extractTag(b, 'NAME') || extractTag(b, 'LEDGERNAME');
    if (!name || name.length < 2) continue;
    const group = extractTag(b, 'PARENT') || extractTag(b, 'GROUPNAME') || 'Misc';
    const balStr = extractTag(b, 'CLOSINGBALANCE') || extractTag(b, 'OPENINGBALANCE') || '0';
    const balance = parseNum(balStr);
    const drCr = balStr.includes('Cr') ? 'Cr' : 'Dr';
    const phone = extractTag(b, 'LEDPHONE') || extractTag(b, 'PHONENUMBER') || '';
    const gstin = extractTag(b, 'PARTYGSTIN') || extractTag(b, 'GSTIN') || '';
    ledgers.push({ ledger_name: name, group_name: group, closing_balance: Math.abs(balance), dr_cr: drCr, phone: phone || null, gstin: gstin || null, synced_at: new Date().toISOString() });
  }
  return ledgers;
}

async function upsertLedgers(ledgers) {
  if (!ledgers.length) return 0;
  let total = 0;
  for (let i = 0; i < ledgers.length; i += 50) {
    const batch = ledgers.slice(i, i + 50);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tally_ledgers?on_conflict=ledger_name`, {
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
    body: JSON.stringify({ sync_type: 'ledgers', status, records_synced: count, error_message: error || null, synced_at: new Date().toISOString() })
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const startTime = Date.now();
  console.log('[tally-ledger-sync] Starting at', new Date().toISOString());

  try {
    const proxyRes = await fetch(TALLY_EDGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      body: JSON.stringify({ xmlBody: LEDGER_XML }),
      signal: AbortSignal.timeout(25000)
    });
    if (!proxyRes.ok) throw new Error('Proxy ' + proxyRes.status);

    const proxyData = await proxyRes.json();
    const xml = proxyData?.xml || proxyData?.data || '';
    if (!xml || xml.length < 50) throw new Error('Empty response from Tally');

    const ledgers = parseLedgerXML(xml);
    if (!ledgers.length) throw new Error('No ledgers found in Tally response');

    const count = await upsertLedgers(ledgers);
    await logSync('success', count, null);

    const elapsed = Date.now() - startTime;
    return res.status(200).json({
      success: true,
      records_synced: count,
      elapsed_ms: elapsed,
      message: `✅ ${count} ledgers synced from Tally`,
      synced_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('[tally-ledger-sync] Error:', err.message);
    await logSync('error', 0, err.message).catch(() => {});
    return res.status(200).json({ success: false, error: err.message });
  }
}
