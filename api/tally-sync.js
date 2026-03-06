// api/tally-sync.js
// Comprehensive Tally → Supabase sync endpoint
// Parses vouchers XML and upserts into purchase_bills, sales_bills, outstanding_receivable

const TALLY_PROXY = 'https://www.shreerangtrendz.com/api/tally-proxy';
const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';

// ─── XML helpers ───────────────────────────────────────────────
function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}
function extractAll(xml, tag) {
  const results = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}
function parseAmount(str) {
  if (!str) return 0;
  const clean = str.replace(/[^0-9.\-]/g, '');
  return parseFloat(clean) || 0;
}
function tallyDateToISO(d) {
  // Tally dates: YYYYMMDD or DD-MMM-YYYY
  if (!d) return null;
  d = d.trim();
  if (/^\d{8}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                  jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  const m = d.match(/(\d{1,2})-([a-z]{3})-(\d{4})/i);
  if (m) return `${m[3]}-${months[m[2].toLowerCase()]}-${m[1].padStart(2,'0')}`;
  return null;
}

// ─── Supabase upsert helper ────────────────────────────────────
async function supabaseUpsert(table, rows, conflict) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(rows),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${table} upsert failed: ${err}`);
  }
  return res.json();
}

// ─── Log sync to tally_sync_log ────────────────────────────────
async function logSync(type, status, count, raw, error = null) {
  await fetch(`${SUPABASE_URL}/rest/v1/tally_sync_log`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sync_type: type,
      status,
      records_synced: count,
      raw_response: raw ? raw.slice(0, 5000) : null,
      error_message: error,
    }),
  });
}

// ─── Call Tally ────────────────────────────────────────────────
async function callTally(xml) {
  const res = await fetch(TALLY_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: xml,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Tally proxy returned ${res.status}`);
  const text = await res.text();
  if (text.includes('LINEERROR')) {
    const err = extractTag(text, 'LINEERROR');
    throw new Error(`Tally error: ${err}`);
  }
  return text;
}

// ─── Build voucher XML ─────────────────────────────────────────
function voucherXml(from, to, type) {
  return `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES>
      <SVFROMDATE>${from}</SVFROMDATE>
      <SVTODATE>${to}</SVTODATE>
      <VOUCHERTYPENAME>${type}</VOUCHERTYPENAME>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
}

// ─── Parse purchase vouchers ───────────────────────────────────
function parsePurchaseVouchers(xml) {
  const vouchers = [];
  const blocks = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
  for (const block of blocks) {
    const vchNo = extractTag(block, 'VOUCHERNUMBER');
    const date = tallyDateToISO(extractTag(block, 'DATE'));
    const party = extractTag(block, 'PARTYLEDGERNAME');
    const narration = extractTag(block, 'NARRATION');
    // Get all ledger entries to find the total
    const amounts = extractAll(block, 'AMOUNT').map(parseAmount);
    const total = Math.abs(amounts.reduce((s, a) => s + a, 0)) / 2;
    if (!vchNo || !date || !party) continue;
    vouchers.push({
      bill_no: vchNo,
      bill_date: date,
      party_name: party,
      total_amount: total,
      narration,
      source: 'tally',
      sync_status: 'synced',
    });
  }
  return vouchers;
}

// ─── Parse sales vouchers ──────────────────────────────────────
function parseSalesVouchers(xml) {
  const vouchers = [];
  const blocks = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
  for (const block of blocks) {
    const vchNo = extractTag(block, 'VOUCHERNUMBER');
    const date = tallyDateToISO(extractTag(block, 'DATE'));
    const party = extractTag(block, 'PARTYLEDGERNAME');
    const narration = extractTag(block, 'NARRATION');
    const amounts = extractAll(block, 'AMOUNT').map(parseAmount);
    const total = Math.abs(amounts.reduce((s, a) => s + a, 0)) / 2;
    if (!vchNo || !date || !party) continue;
    vouchers.push({
      bill_no: vchNo,
      bill_date: date,
      party_name: party,
      total_amount: total,
      narration,
      source: 'tally',
      sync_status: 'synced',
    });
  }
  return vouchers;
}

// ─── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Date range: last 60 days by default, or from query params
  const url = new URL(req.url, 'https://x.com');
  const today = new Date();
  const toDate = today.toISOString().slice(0, 10).replace(/-/g, '');
  const fromDate = new Date(today - 60 * 864e5).toISOString().slice(0, 10).replace(/-/g, '');

  const results = { purchase: 0, sales: 0, errors: [] };

  // ── Sync Purchase vouchers ──
  try {
    const xml = await callTally(voucherXml(fromDate, toDate, 'Purchase'));
    const rows = parsePurchaseVouchers(xml);
    if (rows.length > 0) {
      await supabaseUpsert('purchase_bills', rows, 'bill_no');
      results.purchase = rows.length;
    }
    await logSync('purchase_vouchers', 'success', rows.length, xml);
  } catch (e) {
    results.errors.push(`Purchase: ${e.message}`);
    await logSync('purchase_vouchers', 'error', 0, null, e.message);
  }

  // ── Sync Sales vouchers ──
  try {
    const xml = await callTally(voucherXml(fromDate, toDate, 'Sales'));
    const rows = parseSalesVouchers(xml);
    if (rows.length > 0) {
      await supabaseUpsert('sales_bills', rows, 'bill_no');
      results.sales = rows.length;
    }
    await logSync('sales_vouchers', 'success', rows.length, xml);
  } catch (e) {
    results.errors.push(`Sales: ${e.message}`);
    await logSync('sales_vouchers', 'error', 0, null, e.message);
  }

  return res.status(200).json({
    success: results.errors.length === 0,
    synced: { purchase: results.purchase, sales: results.sales },
    errors: results.errors,
    timestamp: new Date().toISOString(),
  });
}
