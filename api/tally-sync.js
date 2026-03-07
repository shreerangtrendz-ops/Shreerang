// api/tally-sync.js  v3 — Delta Sync
// Pulls Purchase + Sales vouchers from Tally XML API → upserts into Supabase
// Uses delta sync: only fetches records newer than last_synced_voucher_date

const TALLY_PROXY = 'https://www.shreerangtrendz.com/api/tally-proxy';
const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}
function extractAll(xml, tag) {
  const r = []; const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)</${tag}>`, 'gi'); let m;
  while ((m = re.exec(xml)) !== null) r.push(m[1].trim());
  return r;
}
function parseAmt(s) { if (!s) return 0; return parseFloat(s.replace(/[^0-9.\-]/g,'')) || 0; }
function tallyDate(d) {
  if (!d) return null; d = d.trim();
  if (/^\d{8}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  const mths = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  const m = d.match(/(\d{1,2})-([a-z]{3})-(\d{4})/i);
  if (m) return `${m[3]}-${mths[m[2].toLowerCase()]}-${m[1].padStart(2,'0')}`;
  return null;
}
function toTallyDateStr(isoDate) {
  // Convert "2026-01-15" → "20260115"
  return isoDate.replace(/-/g, '');
}

async function supabaseUpsert(table, rows, conflictCol) {
  if (!rows.length) return [];
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictCol}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Supabase ${table}: ${await r.text()}`);
  return r.json();
}

async function logSync(type, status, count, raw, err = null) {
  const today = new Date().toISOString().slice(0,10);
  await fetch(`${SUPABASE_URL}/rest/v1/tally_sync_log`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sync_type: type, status, records_synced: count,
      raw_response: raw?.slice(0,5000) ?? null, error_message: err,
      last_voucher_date: today
    }),
  });
}

// Get last synced voucher date for delta sync
async function getLastSyncDate(syncType) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/tally_sync_state?sync_type=eq.${syncType}&select=last_synced_voucher_date`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await r.json();
    return data?.[0]?.last_synced_voucher_date || null;
  } catch { return null; }
}

// Update last synced date after successful sync
async function updateSyncState(syncType, date, totalRecords) {
  await fetch(`${SUPABASE_URL}/rest/v1/tally_sync_state?on_conflict=sync_type`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      sync_type: syncType,
      last_synced_voucher_date: date,
      total_records_synced: totalRecords,
      updated_at: new Date().toISOString()
    }),
  });
}

async function callTally(xml, company) {
  const url = company
    ? `${TALLY_PROXY}?company=${encodeURIComponent(company)}`
    : TALLY_PROXY;
  const r = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'text/xml', ...(company ? { 'X-Tally-Company': company } : {}) },
    body: xml,
    signal: AbortSignal.timeout(30000)
  });
  if (!r.ok) throw new Error(`Proxy ${r.status}`);
  const txt = await r.text();
  if (txt.includes('LINEERROR')) throw new Error(`Tally: ${extractTag(txt,'LINEERROR')}`);
  return txt;
}

function voucherXml(from, to, type) {
  return `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME>
  <STATICVARIABLES><SVFROMDATE>${from}</SVFROMDATE><SVTODATE>${to}</SVTODATE>
  <VOUCHERTYPENAME>${type}</VOUCHERTYPENAME><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
  </STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
}

function parseVouchers(xml, type) {
  const rows = [];
  const blocks = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
  for (const b of blocks) {
    const vchNo = extractTag(b, 'VOUCHERNUMBER');
    const date = tallyDate(extractTag(b, 'DATE'));
    const party = extractTag(b, 'PARTYLEDGERNAME');
    if (!vchNo || !date || !party) continue;
    const amounts = extractAll(b, 'AMOUNT').map(parseAmt);
    const total = Math.abs(amounts.reduce((s,a) => s+a, 0)) / 2;
    if (type === 'Purchase') {
      rows.push({ bill_number: vchNo, bill_date: date, supplier_name: party,
        total_amount: total, notes: extractTag(b,'NARRATION') || null,
        status: 'synced', fabric_type: 'Tally Import' });
    } else {
      rows.push({ bill_number: vchNo, bill_date: date, customer_name: party,
        total_amount: total, notes: extractTag(b,'NARRATION') || null, status: 'synced' });
    }
  }
  return rows;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  const toDate = toTallyDateStr(todayStr);
  const company = req.headers['x-tally-company'] || req.query?.company || '';

  const results = { purchase: 0, sales: 0, errors: [], deltaSync: {} };

  // PURCHASE — delta sync
  try {
    const lastDate = await getLastSyncDate('purchase_vouchers');
    // If we have a last sync date, fetch from that date; else fetch last 90 days
    const fromDate = lastDate
      ? toTallyDateStr(lastDate)
      : toTallyDateStr(new Date(today - 90*864e5).toISOString().slice(0,10));
    results.deltaSync.purchaseFrom = lastDate || '90 days ago';

    const xml = await callTally(voucherXml(fromDate, toDate, 'Purchase'), company);
    const rows = parseVouchers(xml, 'Purchase');
    if (rows.length) await supabaseUpsert('purchase_bills', rows, 'bill_number');
    results.purchase = rows.length;
    await logSync('purchase_vouchers', 'success', rows.length, xml);
    await updateSyncState('purchase_vouchers', todayStr, rows.length);
  } catch(e) {
    results.errors.push(`Purchase: ${e.message}`);
    await logSync('purchase_vouchers', 'error', 0, null, e.message);
  }

  // SALES — delta sync
  try {
    const lastDate = await getLastSyncDate('sales_vouchers');
    const fromDate = lastDate
      ? toTallyDateStr(lastDate)
      : toTallyDateStr(new Date(today - 90*864e5).toISOString().slice(0,10));
    results.deltaSync.salesFrom = lastDate || '90 days ago';

    const xml = await callTally(voucherXml(fromDate, toDate, 'Sales'), company);
    const rows = parseVouchers(xml, 'Sales');
    if (rows.length) await supabaseUpsert('sales_bills', rows, 'bill_number');
    results.sales = rows.length;
    await logSync('sales_vouchers', 'success', rows.length, xml);
    await updateSyncState('sales_vouchers', todayStr, rows.length);
  } catch(e) {
    results.errors.push(`Sales: ${e.message}`);
    await logSync('sales_vouchers', 'error', 0, null, e.message);
  }

  return res.status(200).json({
    success: results.errors.length === 0,
    synced: { purchase: results.purchase, sales: results.sales },
    deltaSync: results.deltaSync,
    errors: results.errors,
    timestamp: new Date().toISOString(),
  });
}
