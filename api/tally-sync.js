// api/tally-sync.js v4 — Smart Chunked Delta Sync
// Pulls Purchase + Sales vouchers from Tally XML API → upserts into Supabase
// Key fix: Uses 7-day chunks to prevent Tally timeout on large data sets
// tally-proxy now routes through Supabase edge function with correct URL

const TALLY_PROXY = 'https://www.shreerangtrendz.com/api/tally-proxy';
const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';

// IMPORTANT: Use 7-day chunks max to avoid Tally timeout (large database)
const CHUNK_DAYS = 7;
const DEFAULT_LOOKBACK_DAYS = 30; // For first sync, go back 30 days

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}
function extractAll(xml, tag) {
  const r = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) r.push(m[1].trim());
  return r;
}
function parseAmt(s) {
  if (!s) return 0;
  return parseFloat(s.replace(/[^0-9.\-]/g,'')) || 0;
}
function tallyDate(d) {
  if (!d) return null;
  d = d.trim();
  if (/^\d{8}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  const mths = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  const m = d.match(/(\d{1,2})-([a-z]{3})-(\d{4})/i);
  if (m) return `${m[3]}-${mths[m[2].toLowerCase()]}-${m[1].padStart(2,'0')}`;
  return null;
}
function toTallyDateStr(isoDate) {
  return isoDate.replace(/-/g, '');
}
function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

async function supabaseUpsert(table, rows, conflictCol) {
  if (!rows.length) return [];
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictCol}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Supabase ${table}: ${await r.text()}`);
  return r.json();
}

async function logSync(type, status, count, raw, err = null) {
  const today = new Date().toISOString().slice(0,10);
  await fetch(`${SUPABASE_URL}/rest/v1/tally_sync_log`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sync_type: type,
      status,
      records_synced: count,
      raw_response: raw?.slice(0,5000) ?? null,
      error_message: err,
      last_voucher_date: today
    }),
  });
}

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

async function updateSyncState(syncType, date, totalRecords) {
  await fetch(`${SUPABASE_URL}/rest/v1/tally_sync_state?on_conflict=sync_type`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      sync_type: syncType,
      last_synced_voucher_date: date,
      total_records_synced: totalRecords,
      updated_at: new Date().toISOString()
    }),
  });
}

async function callTally(xml, company) {
  // Routes through Vercel proxy → Supabase edge function → Tally
  const r = await fetch(TALLY_PROXY, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      ...(company ? { 'X-Tally-Company': company } : {})
    },
    body: xml,
    signal: AbortSignal.timeout(30000)
  });
  if (!r.ok) throw new Error(`Proxy ${r.status}: ${await r.text()}`);
  const txt = await r.text();
  // Check if Tally returned Import dialog (means Tally UI is on Import screen)
  if (txt.includes('IMPORTFILE') || txt.includes('File to Import')) {
    throw new Error('Tally is showing Import dialog - please press Escape in Tally and return to Gateway of Tally main screen');
  }
  if (txt.includes('LINEERROR')) throw new Error(`Tally: ${extractTag(txt,'LINEERROR')}`);
  return txt;
}

function voucherXml(from, to, type) {
  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVFROMDATE>${from}</SVFROMDATE>
          <SVTODATE>${to}</SVTODATE>
          <VOUCHERTYPENAME>${type}</VOUCHERTYPENAME>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
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
      rows.push({
        bill_number: vchNo,
        bill_date: date,
        supplier_name: party,
        total_amount: total,
        notes: extractTag(b,'NARRATION') || null,
        status: 'synced',
        fabric_type: 'Tally Import'
      });
    } else {
      rows.push({
        bill_number: vchNo,
        bill_date: date,
        customer_name: party,
        total_amount: total,
        notes: extractTag(b,'NARRATION') || null,
        status: 'synced'
      });
    }
  }
  return rows;
}

// Sync in chunks to avoid Tally timeout
async function syncInChunks(syncType, voucherType, fromDate, toDate, company) {
  let totalRows = 0;
  let currentFrom = fromDate;
  const chunks = [];
  
  // Build list of date chunks
  while (currentFrom < toDate) {
    const chunkTo = addDays(currentFrom, CHUNK_DAYS - 1);
    chunks.push({ from: currentFrom, to: chunkTo > toDate ? toDate : chunkTo });
    currentFrom = addDays(currentFrom, CHUNK_DAYS);
  }
  
  console.log(`[tally-sync] ${syncType}: syncing ${chunks.length} chunks from ${fromDate} to ${toDate}`);
  
  for (const chunk of chunks) {
    try {
      const xml = await callTally(
        voucherXml(toTallyDateStr(chunk.from), toTallyDateStr(chunk.to), voucherType),
        company
      );
      const rows = parseVouchers(xml, voucherType);
      if (rows.length) {
        const table = voucherType === 'Purchase' ? 'purchase_bills' : 'sales_bills';
        await supabaseUpsert(table, rows, 'bill_number');
        totalRows += rows.length;
        console.log(`[tally-sync] ${chunk.from} → ${chunk.to}: ${rows.length} records`);
      }
    } catch (chunkErr) {
      console.error(`[tally-sync] Chunk ${chunk.from}-${chunk.to} error: ${chunkErr.message}`);
      // Continue to next chunk - don't stop entire sync for one failed chunk
    }
  }
  return totalRows;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  const company = req.headers['x-tally-company'] || req.query?.company || '';
  const results = { purchase: 0, sales: 0, errors: [], deltaSync: {}, chunked: true };

  // PURCHASE — chunked delta sync
  try {
    const lastDate = await getLastSyncDate('purchase_vouchers');
    const fromDate = lastDate || addDays(todayStr, -DEFAULT_LOOKBACK_DAYS);
    results.deltaSync.purchaseFrom = fromDate;
    const count = await syncInChunks('purchase_vouchers', 'Purchase', fromDate, todayStr, company);
    results.purchase = count;
    await logSync('purchase_vouchers', 'success', count, null);
    await updateSyncState('purchase_vouchers', todayStr, count);
  } catch(e) {
    results.errors.push(`Purchase: ${e.message}`);
    await logSync('purchase_vouchers', 'error', 0, null, e.message);
  }

  // SALES — chunked delta sync
  try {
    const lastDate = await getLastSyncDate('sales_vouchers');
    const fromDate = lastDate || addDays(todayStr, -DEFAULT_LOOKBACK_DAYS);
    results.deltaSync.salesFrom = fromDate;
    const count = await syncInChunks('sales_vouchers', 'Sales', fromDate, todayStr, company);
    results.sales = count;
    await logSync('sales_vouchers', 'success', count, null);
    await updateSyncState('sales_vouchers', todayStr, count);
  } catch(e) {
    results.errors.push(`Sales: ${e.message}`);
    await logSync('sales_vouchers', 'error', 0, null, e.message);
  }

  return res.status(200).json({
    success: results.errors.length === 0,
    synced: { purchase: results.purchase, sales: results.sales },
    deltaSync: results.deltaSync,
    chunked: true,
    errors: results.errors,
    timestamp: new Date().toISOString(),
  });
}
