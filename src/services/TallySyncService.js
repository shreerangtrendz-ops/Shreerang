// ============================================================
// TallySyncService.js — v2 Progressive Sync
// Calls Supabase Edge Function directly from browser
// Handles chunked sync (7 days at a time) to avoid timeouts
// Correct tables: purchase_bills, sales_bills
// ============================================================
import { supabase } from '../lib/supabase';

// ─── CORE: POST XML to Tally via Edge Function ────────────
async function postToTally(xml, company = '') {
  const { data, error } = await supabase.functions.invoke('tally-proxy', {
    body: { xmlBody: xml, company },
  });
  if (error) throw new Error('Tally edge function error: ' + error.message);
  if (!data) throw new Error('Empty response from tally-proxy');
  // New proxy always returns HTTP 200 with {success, data} or {success:false, error}
  if (data.success === false) {
    if (data.error === 'TALLY_IMPORT_DIALOG_OPEN') {
      throw new Error('TALLY_DIALOG_OPEN: Tally is showing Import dialog. Press ESC in Tally to return to Gateway of Tally main screen, then try again.');
    }
    throw new Error('Tally error: ' + (data.error || 'Unknown error'));
  }
  // Support both new format (data.data) and old format (data.xml) for backward compat
  const xml_resp = data.data || data.xml;
  if (!xml_resp || typeof xml_resp !== 'string') throw new Error('tally-proxy returned no XML');
  return xml_resp;
}

// ─── GET REAL COMPANY NAME FROM TALLY ─────────────────────
export async function getCompanyName(company = '') {
  try {
    const xml = \`<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Companies</ID></HEADER>
  <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY>
</ENVELOPE>\`;
    const responseXml = await postToTally(xml, company);
    // Try to extract BASICCOMPANYNAME or COMPANYNAME
    const m = responseXml.match(/<BASICCOMPANYNAME[^>]*>([^<]+)<\/BASICCOMPANYNAME>/i)
      || responseXml.match(/<COMPANYNAME[^>]*>([^<]+)<\/COMPANYNAME>/i)
      || responseXml.match(/<NAME[^>]*>([^<]+)<\/NAME>/i);
    return m ? m[1].trim() : 'Unknown Company';
  } catch (e) {
    return 'Tally Offline';
  }
}

// ─── DATE HELPERS ─────────────────────────────────────────
function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function toTallyDate(iso) { return iso.replace(/-/g, ''); }

// ─── XML PARSERS ──────────────────────────────────────────
function extractTag(xml, tag) {
  const m = xml.match(new RegExp('<' + tag + '[^>]*>([^<]*)<\/' + tag + '>', 'i'));
  return m ? m[1].trim() : null;
}
function extractAll(xml, tag) {
  const r = [], re = new RegExp('<' + tag + '[^>]*>([\s\S]*?)<\/' + tag + '>', 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) r.push(m[1].trim());
  return r;
}
function parseAmt(s) { return s ? (parseFloat(s.replace(/[^0-9.-]/g, '')) || 0) : 0; }
function tallyDate(d) {
  if (!d) return null;
  d = d.trim();
  if (/^\d{8}$/.test(d)) return d.slice(0,4) + '-' + d.slice(4,6) + '-' + d.slice(6,8);
  const ms = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  const m = d.match(/(\d{1,2})-([a-z]{3})-(\d{4})/i);
  if (m) return m[3] + '-' + ms[m[2].toLowerCase()] + '-' + m[1].padStart(2, '0');
  return null;
}

// ─── VOUCHER XML BUILDER ───────────────────────────────────
function buildVoucherXml(fromDate, toDate, type) {
  return '<?xml version="1.0"?>' +
    '<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>' +
    '<BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME>' +
    '<STATICVARIABLES>' +
    '<SVFROMDATE>' + toTallyDate(fromDate) + '</SVFROMDATE>' +
    '<SVTODATE>' + toTallyDate(toDate) + '</SVTODATE>' +
    '<VOUCHERTYPENAME>' + type + '</VOUCHERTYPENAME>' +
    '<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>' +
    '</STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
}

// ─── VOUCHER PARSER ────────────────────────────────────────
function parseVouchers(xml, type) {
  const rows = [];
  const blocks = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
  for (const b of blocks) {
    const vn = extractTag(b, 'VOUCHERNUMBER');
    const dt = tallyDate(extractTag(b, 'DATE'));
    const pa = extractTag(b, 'PARTYLEDGERNAME');
    if (!vn || !dt || !pa) continue;
    const amounts = extractAll(b, 'AMOUNT').map(parseAmt);
    const total = Math.abs(amounts.reduce((s, a) => s + a, 0)) / 2;
    const narr = extractTag(b, 'NARRATION') || null;
    if (type === 'Purchase') {
      rows.push({ bill_number: vn, bill_date: dt, supplier_name: pa, total_amount: total, notes: narr, status: 'synced', fabric_type: 'Tally Import' });
    } else {
      rows.push({ bill_number: vn, bill_date: dt, customer_name: pa, total_amount: total, notes: narr, status: 'synced' });
    }
  }
  return rows;
}

// ─── GET SYNC STATE ────────────────────────────────────────
async function getSyncState(syncType) {
  const { data } = await supabase
    .from('tally_sync_state')
    .select('*')
    .eq('sync_type', syncType)
    .single();
  return data;
}

// ─── UPDATE SYNC STATE ─────────────────────────────────────
async function updateSyncState(syncType, lastDate, totalCount) {
  await supabase.from('tally_sync_state').upsert({
    sync_type: syncType,
    last_synced_voucher_date: lastDate,
    total_records_synced: totalCount,
    updated_at: new Date().toISOString()
  }, { onConflict: 'sync_type' });
}

// ─── LOG SYNC ──────────────────────────────────────────────
async function logSync(syncType, status, count, rawPreview, errorMsg) {
  await supabase.from('tally_sync_log').insert({
    sync_type: syncType,
    status,
    records_synced: count,
    raw_response: rawPreview ? rawPreview.slice(0, 3000) : null,
    error_message: errorMsg || null,
    last_voucher_date: new Date().toISOString().slice(0, 10)
  });
}

// ============================================================
// MAIN: PULL BILLS — PROGRESSIVE SINGLE CHUNK
// Call this repeatedly from dashboard until hasMore=false
// Each call: fetches ONE 7-day chunk, upserts to Supabase
// Returns: { success, hasMore, chunkFrom, chunkTo, recordsThisChunk, totalSynced, message }
// ============================================================
export async function pullBillsChunk(billType = 'purchase', company = '') {
  const today = new Date().toISOString().slice(0, 10);
  const voucherType = billType === 'sales' ? 'Sales' : 'Purchase';
  const syncKey = billType === 'sales' ? 'sales_vouchers' : 'purchase_vouchers';
  const table = billType === 'sales' ? 'sales_bills' : 'purchase_bills';
  const CHUNK_DAYS = 7;

  try {
    const state = await getSyncState(syncKey);
    const lastDate = state?.last_synced_voucher_date || null;
    const fromDate = lastDate ? addDays(lastDate, 1) : '2024-04-01';

    // Already up to date
    if (fromDate > today) {
      return {
        success: true,
        hasMore: false,
        chunkFrom: null,
        chunkTo: null,
        recordsThisChunk: 0,
        totalSynced: state?.total_records_synced || 0,
        message: 'All data synced - up to date!'
      };
    }

    // Calculate chunk end date
    const rawTo = addDays(fromDate, CHUNK_DAYS - 1);
    const toDate = rawTo > today ? today : rawTo;

    console.log('[TallySyncService] Pulling ' + voucherType + ' ' + fromDate + ' to ' + toDate);

    // Call Tally
    const xml = buildVoucherXml(fromDate, toDate, voucherType);
    const tallyXml = await postToTally(xml, company);

    // Parse vouchers
    const rows = parseVouchers(tallyXml, voucherType);

    // Upsert to Supabase
    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from(table)
        .upsert(rows, { onConflict: 'bill_number' });
      if (upsertErr) throw new Error('DB upsert failed: ' + upsertErr.message);
    }

    // Update state
    const prevTotal = state?.total_records_synced || 0;
    const newTotal = prevTotal + rows.length;
    await updateSyncState(syncKey, toDate, newTotal);
    await logSync(syncKey, 'success', rows.length, tallyXml.slice(0, 2000), null);

    const hasMore = toDate < today;
    return {
      success: true,
      hasMore,
      chunkFrom: fromDate,
      chunkTo: toDate,
      recordsThisChunk: rows.length,
      totalSynced: newTotal,
      nextFrom: hasMore ? addDays(toDate, 1) : null,
      message: hasMore
        ? 'Synced ' + fromDate + ' to ' + toDate + ': ' + rows.length + ' records'
        : 'Complete! Total: ' + newTotal + ' records up to ' + toDate
    };

  } catch (err) {
    await logSync(
      billType === 'sales' ? 'sales_vouchers' : 'purchase_vouchers',
      'error', 0, null, err.message
    ).catch(() => {});
    return {
      success: false,
      hasMore: false,
      error: err.message,
      isTallyDialog: err.message.startsWith('TALLY_DIALOG_OPEN')
    };
  }
}

// ─── LEGACY: pullPurchasesFromTally (kept for compatibility) ─
export async function pullPurchasesFromTally(fromDate, toDate) {
  return pullBillsChunk('purchase');
}

// ─── STOCK SYNC ───────────────────────────────────────────
export async function pullStockWithDesignDetail(company = '') {
  const xml = '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Stock Summary</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><EXPLODEFLAG>Yes</EXPLODEFLAG></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
  try {
    const responseXml = await postToTally(xml, company);
    const { stockItems } = parseTallyXMLResponse(responseXml);
    const today = new Date().toISOString().split('T')[0];
    let count = 0;
    for (const item of stockItems) {
      const batches = item.batches && item.batches.length > 0 ? item.batches : [{ name: 'MAIN', closingQty: item.closingQty || 0 }];
      for (const batch of batches) {
        let designNo = batch.name ? batch.name.replace(/^D\s*(No\.?)?\s*/i, '').trim() : 'MAIN';
        if (!designNo || designNo.toLowerCase() === 'primary batch') designNo = 'MAIN';
        await supabase.from('fabric_stock_live').upsert({
          fabric_sku: item.name, fabric_name: item.name, design_no: designNo,
          closing_qty_mtrs: batch.closingQty || 0, sync_date: today, last_tally_sync: new Date().toISOString(),
        }, { onConflict: 'fabric_sku,design_no,sync_date' });
        count++;
      }
    }
    return { success: true, count };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── LEDGER SYNCS ──────────────────────────────────────────
export async function syncCustomersFromTally() { return syncLedgers('Sundry Debtors', 'customers'); }
export async function syncSuppliersFromTally() { return syncLedgers('Sundry Creditors', 'customers', { business_type: 'supplier' }); }
export async function syncAgentsFromTally() { return syncLedgers('Sales Accounts', 'sales_team'); }

async function syncLedgers(group, table, extra = {}) {
  const xml = '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Ledger</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><LEDGERGROUPSFILTER>' + group + '</LEDGERGROUPSFILTER></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
  try {
    const xml_response = await postToTally(xml);
    const ledgers = parseLedgersFromXML(xml_response);
    let count = 0;
    for (const ledger of ledgers) {
      const row = { name: ledger.name, tally_ledger_name: ledger.name, phone: ledger.phone || null, address: ledger.address || null, gst_number: ledger.gstin || null, status: 'active', ...extra };
      if (table === 'sales_team') {
        await supabase.from(table).upsert({ name: ledger.name, phone: ledger.phone || null, is_active: true }, { onConflict: 'name' });
      } else {
        await supabase.from(table).upsert(row, { onConflict: 'tally_ledger_name' });
      }
      count++;
    }
    return { success: true, count };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── OUTSTANDING SYNC ─────────────────────────────────────
export async function syncOutstandingFromTally() {
  const xml = '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Bill Outstanding</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
  try {
    const xml_response = await postToTally(xml);
    const bills = parseBillsFromXML(xml_response);
    for (const bill of bills) {
      await supabase.from('payment_followups').upsert({ customer_name: bill.partyName, total_outstanding: bill.amount, committed_date: bill.dueDate, status: 'pending' }, { onConflict: 'customer_name' });
    }
    return { success: true, count: bills.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── PUSH SALES ORDER TO TALLY ────────────────────────────
export async function pushOrderToTally(orderId) {
  const { data: order } = await supabase.from('sales_orders').select('*, customers(tally_ledger_name, name)').eq('id', orderId).single();
  if (!order) return { success: false, error: 'Order not found' };
  if (!order.customers?.tally_ledger_name) return { success: false, error: 'Customer has no Tally ledger name' };
  const xml = buildSalesVoucherXML(order);
  try {
    const responseXml = await postToTally(xml);
    const voucherNo = extractTag(responseXml, 'VOUCHERNUMBER') || extractTag(responseXml, 'VCHNO');
    await supabase.from('sales_orders').update({ tally_voucher_no: voucherNo, tally_sync_status: 'synced', tally_synced_at: new Date().toISOString() }).eq('id', orderId);
    return { success: true, voucherNo };
  } catch (err) {
    await supabase.from('sales_orders').update({ tally_sync_status: 'failed', tally_error_msg: err.message }).eq('id', orderId);
    return { success: false, error: err.message };
  }
}

// ─── BUILD XML FOR PUSH ────────────────────────────────────
export function buildSalesVoucherXML(order) {
  const dateStr = new Date(order.created_at).toISOString().split('T')[0].replace(/-/g, '');
  const ledger = order.customers.tally_ledger_name;
  const amount = order.total_amount;
  return '<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>' + dateStr + '</DATE><VOUCHERNUMBER>WEB-' + order.order_no + '</VOUCHERNUMBER><PARTYLEDGERNAME>' + ledger + '</PARTYLEDGERNAME><NARRATION>Website order - ' + order.order_no + '</NARRATION><ALLLEDGERENTRIES.LIST><LEDGERNAME>' + ledger + '</LEDGERNAME><AMOUNT>' + amount + '</AMOUNT></ALLLEDGERENTRIES.LIST><ALLLEDGERENTRIES.LIST><LEDGERNAME>Sales</LEDGERNAME><AMOUNT>-' + amount + '</AMOUNT></ALLLEDGERENTRIES.LIST></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>';
}

// ─── PARSE HELPERS ────────────────────────────────────────
export function parseTallyXMLResponse(xml) {
  const vouchers = [];
  const stockItems = [];
  for (const m of xml.matchAll(/<VOUCHER[^>]*>([\s\S]*?)<\/VOUCHER>/gi)) {
    const b = m[1];
    vouchers.push({ voucherNumber: extractTag(b,'VOUCHERNUMBER'), partyLedgerName: extractTag(b,'PARTYLEDGERNAME'), date: tallyDate(extractTag(b,'DATE')), amount: parseAmt(extractTag(b,'AMOUNT')) });
  }
  for (const m of xml.matchAll(/<STOCKITEM[^>]*>([\s\S]*?)<\/STOCKITEM>/gi)) {
    const b = m[1];
    const batches = [];
    for (const bm of b.matchAll(/<BATCHALLOCATIONS\.LIST[^>]*>([\s\S]*?)<\/BATCHALLOCATIONS\.LIST>/gi)) {
      const bb = bm[1];
      batches.push({ name: extractTag(bb,'BATCHNAME') || extractTag(bb,'NAME'), closingQty: parseAmt(extractTag(bb,'CLOSINGBALANCE')) });
    }
    stockItems.push({ name: extractTag(b,'NAME'), closingQty: parseAmt(extractTag(b,'CLOSINGBALANCE')), batches });
  }
  return { vouchers, stockItems };
}

function parseLedgersFromXML(xml) {
  const ledgers = [];
  for (const m of xml.matchAll(/<LEDGER[^>]*NAME="([^"]*)"[^>]*>([\s\S]*?)<\/LEDGER>/gi)) {
    const name = m[1], b = m[2];
    ledgers.push({ name, gstin: extractTag(b,'PARTYGSTIN'), phone: extractTag(b,'LEDGERPHONE'), address: extractTag(b,'ADDRESS'), email: extractTag(b,'EMAIL') });
  }
  return ledgers;
}

function parseBillsFromXML(xml) {
  const bills = [];
  for (const m of xml.matchAll(/<BILLDETAILS[^>]*>([\s\S]*?)<\/BILLDETAILS>/gi)) {
    const b = m[1];
    bills.push({ partyName: extractTag(b,'PARTYLEDGERNAME'), amount: parseAmt(extractTag(b,'CLOSINGBALANCE')), dueDate: tallyDate(extractTag(b,'BILLDATE')) });
  }
  return bills;
}

// Keep these for compatibility with existing code
export { pullBillsChunk as pullSalesFromTally };
export async function pullJobBillsFromTally() { return { success: false, error: 'Use Job Bills sync from dashboard' }; }
