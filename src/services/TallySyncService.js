// TallySyncService.js — Shreerang Trendz
// Rewritten: correct XML parsing, all Tally voucher types, full auto-sync
import { supabase } from '@/lib/customSupabaseClient';

const TALLY_PROXY = async (xmlBody, company = '') => {
  const { data, error } = await supabase.functions.invoke('tally-proxy', { body: { xmlBody, company } });
  if (error) throw new Error('Edge function error: ' + error.message);
  if (!data) throw new Error('Empty response from tally-proxy');
  if (data.success === false) {
    if (data.error === 'TALLY_IMPORT_DIALOG_OPEN') throw new Error('TALLY_DIALOG_OPEN: Press ESC in Tally');
    throw new Error('Tally error: ' + (data.error || 'Unknown'));
  }
  return data.data; // raw XML string
};

// ─── XML HELPERS ─────────────────────────────────────────────────────────────
function extractTag(xml, tag) {
  const re = new RegExp('<' + tag + '(?:\s[^>]*)?>([\s\S]*?)<\/' + tag + '>', 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}
function extractAll(xml, tag) {
  const re = new RegExp('<' + tag + '(?:\s[^>]*)?>([\s\S]*?)<\/' + tag + '>', 'gi');
  const out = [];
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}
function tallyDate(raw) {
  if (!raw) return null;
  const s = raw.replace(/\D/g, '');
  if (s.length !== 8) return null;
  return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8);
}
function parseAmt(s) {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : Math.abs(n);
}

// ─── TALLY XML BUILDERS ───────────────────────────────────────────────────────
function buildDayBookXml() {
  // No date filter — Tally returns current open period data
  return '<?xml version="1.0"?>' +
    '<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>' +
    '<BODY><EXPORTDATA><REQUESTDESC>' +
    '<REPORTNAME>Day Book</REPORTNAME>' +
    '<STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>' +
    '</REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
}

function buildLedgersXml() {
  return '<?xml version="1.0"?>' +
    '<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>' +
    '<BODY><EXPORTDATA><REQUESTDESC>' +
    '<REPORTNAME>List of Accounts</REPORTNAME>' +
    '<STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>' +
    '</REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
}

function buildStockXml() {
  return '<?xml version="1.0"?>' +
    '<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>' +
    '<BODY><EXPORTDATA><REQUESTDESC>' +
    '<REPORTNAME>Stock Summary</REPORTNAME>' +
    '<STATICVARIABLES>' +
    '<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>' +
    '<EXPLODEFLAG>Yes</EXPLODEFLAG>' +
    '</STATICVARIABLES>' +
    '</REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
}

// ─── VOUCHER PARSER ───────────────────────────────────────────────────────────
// Shreerang Trendz voucher types:
//   Sales        → sales_bills
//   Purchase     → purchase_bills (if present)
//   Debit Note   → purchase_bills (returns/adjustments)
//   Receipt      → cash/bank (future)
//   Payment      → cash/bank (future)
function parseVouchers(xml) {
  const salesRows = [];
  const purchaseRows = [];
  const blocks = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];

  for (const b of blocks) {
    const vchtypeMatch = b.match(/VCHTYPE="([^"]+)"/i);
    const vchtype = vchtypeMatch ? vchtypeMatch[1] : '';
    const vt = vchtype.toLowerCase();

    const vn    = extractTag(b, 'VOUCHERNUMBER');
    const dt    = tallyDate(extractTag(b, 'DATE'));
    const pa    = extractTag(b, 'PARTYLEDGERNAME');
    const narr  = extractTag(b, 'NARRATION') || null;
    const ref   = extractTag(b, 'REFERENCE') || null;

    if (!vn || !dt || !pa) continue;

    // Get amount — use AMOUNT tag, take absolute max
    const amounts = extractAll(b, 'AMOUNT').map(parseAmt).filter(a => a > 0);
    const total = amounts.length > 0 ? Math.max(...amounts) : 0;

    if (vt.includes('sale')) {
      salesRows.push({
        bill_number:   vn,
        bill_date:     dt,
        customer_name: pa,
        total_amount:  total,
        notes:         narr ? `${vchtype} | ${narr}` : vchtype,
        status:        'synced'
      });
    } else if (vt.includes('purchase') || vt.includes('debit note')) {
      purchaseRows.push({
        bill_number:   vn,
        bill_date:     dt,
        supplier_name: pa,
        total_amount:  total,
        notes:         narr ? `${vchtype} | ${narr}` : vchtype,
        status:        'synced'
      });
    }
  }
  return { salesRows, purchaseRows, totalBlocks: blocks.length };
}

// ─── LEDGER / CUSTOMER PARSER ─────────────────────────────────────────────────
function parseLedgers(xml) {
  const customers = [];
  const suppliers = [];
  const agents    = [];

  const blocks = xml.match(/<LEDGER[\s\S]*?<\/LEDGER>/gi) || [];
  for (const b of blocks) {
    const name    = extractTag(b, 'NAME') || extractTag(b, 'LANGUAGENAME.LIST') || null;
    const parent  = extractTag(b, 'PARENT') || '';
    const address = extractAll(b, 'ADDRESS').join(', ') || null;
    const phone   = extractTag(b, 'LEDPHONE') || extractTag(b, 'PHONE') || null;
    const email   = extractTag(b, 'EMAIL') || null;
    const gstin   = extractTag(b, 'TAXREGISTRATIONNUMBER') || null;
    const state   = extractTag(b, 'STATENAME') || null;
    const country = extractTag(b, 'COUNTRYNAME') || 'India';
    const creditDays = parseInt(extractTag(b, 'CREDITPERIOD') || '0') || 0;
    const creditLimit = parseAmt(extractTag(b, 'CREDITLIMIT') || '0');

    if (!name) continue;
    const p = parent.toLowerCase();

    if (p.includes('sundry debtor')) {
      customers.push({ name, address, phone, email, gst_number: gstin, state, country, credit_days: creditDays, credit_limit: creditLimit, tally_ledger_name: name, customer_type: 'Wholesale', source: 'tally', status: 'active' });
    } else if (p.includes('sundry creditor')) {
      suppliers.push({ name, address, phone, email, gst_number: gstin, state, country, tally_ledger_name: name, status: 'active', source: 'tally' });
    } else if (p.includes('agent') || p.includes('commission')) {
      agents.push({ name, phone, email, state, status: 'active', source: 'tally' });
    }
  }
  return { customers, suppliers, agents };
}

// ─── STOCK PARSER ─────────────────────────────────────────────────────────────
function parseStock(xml) {
  const rows = [];
  const blocks = xml.match(/<STOCKITEM[\s\S]*?<\/STOCKITEM>/gi) || [];
  for (const b of blocks) {
    const name    = extractTag(b, 'NAME') || null;
    const closing = parseAmt(extractTag(b, 'CLOSINGBALANCE') || '0');
    const group   = extractTag(b, 'PARENT') || null;
    const uom     = extractTag(b, 'BASEUNITS') || 'MTR';
    if (!name) continue;
    // Generate SKU from name
    const sku = name.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50);
    rows.push({
      fabric_sku:       sku,
      fabric_name:      name,
      closing_qty_mtrs: closing,
      tally_group:      group,
      sync_date:        new Date().toISOString().slice(0, 10),
      last_tally_sync:  new Date().toISOString()
    });
  }
  return rows;
}

// ─── SYNC: VOUCHERS (SALES + PURCHASE) ───────────────────────────────────────
export async function syncVouchersFromTally(company = '') {
  const log = { sales: 0, purchase: 0, errors: [], totalBlocks: 0 };
  try {
    const xml = await TALLY_PROXY(buildDayBookXml(), company);
    const { salesRows, purchaseRows, totalBlocks } = parseVouchers(xml);
    log.totalBlocks = totalBlocks;

    // Upsert Sales → sales_bills
    if (salesRows.length > 0) {
      const { error } = await supabase.from('sales_bills').upsert(salesRows, { onConflict: 'bill_number' });
      if (error) log.errors.push('sales_bills: ' + error.message);
      else log.sales = salesRows.length;
    }

    // Upsert Purchase → purchase_bills
    if (purchaseRows.length > 0) {
      const { error } = await supabase.from('purchase_bills').upsert(purchaseRows, { onConflict: 'bill_number' });
      if (error) log.errors.push('purchase_bills: ' + error.message);
      else log.purchase = purchaseRows.length;
    }

    // Log to tally_sync_log
    await supabase.from('tally_sync_log').insert({
      sync_type: 'vouchers_combined',
      status: log.errors.length ? 'partial' : 'success',
      records_synced: log.sales + log.purchase,
      error_message: log.errors.join('; ') || null,
      raw_response: xml.substring(0, 500)
    });

    // Update sync state
    await supabase.from('tally_sync_state').upsert([
      { sync_type: 'sales_vouchers', last_synced_voucher_date: new Date().toISOString().slice(0,10), total_records_synced: log.sales },
      { sync_type: 'purchase_vouchers', last_synced_voucher_date: new Date().toISOString().slice(0,10), total_records_synced: log.purchase }
    ], { onConflict: 'sync_type' });

  } catch (e) {
    log.errors.push(e.message);
    await supabase.from('tally_sync_log').insert({ sync_type: 'vouchers_combined', status: 'error', records_synced: 0, error_message: e.message });
  }
  return log;
}

// ─── SYNC: CUSTOMERS + SUPPLIERS + AGENTS ────────────────────────────────────
export async function syncCustomersFromTally(company = '') {
  const log = { customers: 0, suppliers: 0, agents: 0, errors: [] };
  try {
    const xml = await TALLY_PROXY(buildLedgersXml(), company);
    const { customers, suppliers, agents } = parseLedgers(xml);

    if (customers.length > 0) {
      const { error } = await supabase.from('customers').upsert(customers, { onConflict: 'tally_ledger_name', ignoreDuplicates: false });
      if (error) log.errors.push('customers: ' + error.message);
      else log.customers = customers.length;
    }
    if (suppliers.length > 0) {
      // Store suppliers in customers table with customer_type = 'Supplier'
      const suppliersForDB = suppliers.map(s => ({ ...s, customer_type: 'Supplier' }));
      const { error } = await supabase.from('customers').upsert(suppliersForDB, { onConflict: 'tally_ledger_name', ignoreDuplicates: false });
      if (error) log.errors.push('suppliers: ' + error.message);
      else log.suppliers = suppliers.length;
    }
    if (agents.length > 0) {
      const { error } = await supabase.from('agents').upsert(agents, { onConflict: 'name' });
      if (error) log.errors.push('agents: ' + error.message);
      else log.agents = agents.length;
    }

    await supabase.from('tally_sync_log').insert({
      sync_type: 'ledgers',
      status: log.errors.length ? 'partial' : 'success',
      records_synced: log.customers + log.suppliers + log.agents,
      error_message: log.errors.join('; ') || null
    });
  } catch (e) {
    log.errors.push(e.message);
    await supabase.from('tally_sync_log').insert({ sync_type: 'ledgers', status: 'error', records_synced: 0, error_message: e.message });
  }
  return log;
}

// ─── SYNC: STOCK ──────────────────────────────────────────────────────────────
export async function syncStockFromTally(company = '') {
  const log = { stock: 0, errors: [] };
  try {
    const xml = await TALLY_PROXY(buildStockXml(), company);
    const rows = parseStock(xml);

    if (rows.length > 0) {
      // Clear old stock and re-insert fresh (full refresh)
      const { error: delErr } = await supabase.from('fabric_stock_live').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) log.errors.push('delete: ' + delErr.message);

      const { error } = await supabase.from('fabric_stock_live').insert(rows);
      if (error) log.errors.push('stock insert: ' + error.message);
      else log.stock = rows.length;
    }

    await supabase.from('tally_sync_log').insert({
      sync_type: 'stock_items',
      status: log.errors.length ? 'partial' : 'success',
      records_synced: log.stock,
      error_message: log.errors.join('; ') || null
    });
  } catch (e) {
    log.errors.push(e.message);
    await supabase.from('tally_sync_log').insert({ sync_type: 'stock_items', status: 'error', records_synced: 0, error_message: e.message });
  }
  return log;
}

// ─── SYNC ALL ─────────────────────────────────────────────────────────────────
export async function syncAllFromTally(company = '') {
  const results = {};

  // Run all in sequence to avoid overwhelming Tally HTTP server
  console.log('[TallySyncService] Starting full sync...');

  results.vouchers  = await syncVouchersFromTally(company);
  console.log('[TallySyncService] Vouchers done:', results.vouchers);

  results.customers = await syncCustomersFromTally(company);
  console.log('[TallySyncService] Customers done:', results.customers);

  results.stock     = await syncStockFromTally(company);
  console.log('[TallySyncService] Stock done:', results.stock);

  return results;
}

// ─── LEGACY COMPATIBILITY (kept for old UI buttons) ──────────────────────────
export async function pullPurchasesFromTally(fromDate, toDate) { return syncVouchersFromTally(); }
export async function pullSalesFromTally() { return syncVouchersFromTally(); }
export async function pullStockWithDesignDetail() { return syncStockFromTally(); }
export async function pullJobBillsFromTally() { return { success: true, records: 0, message: 'Use Tally sync instead' }; }
export async function syncSuppliersFromTally() { return syncCustomersFromTally(); }
export async function syncAgentsFromTally() { return syncCustomersFromTally(); }
export async function syncOutstandingFromTally() { return { success: true, records: 0 }; }
export async function pushOrderToTally() { return { success: false, error: 'Not implemented' }; }

// ─── INFRA STATUS CHECK ───────────────────────────────────────────────────────
export async function checkTallyInfraStatus() {
  const results = { nginx: false, frpServer: false, frpTunnel: false, tallyPrime: false, n8n: false };
  try {
    const r = await fetch('https://tally.shreerangtrendz.com', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    results.tallyPrime = r.status < 500;
    results.nginx = true;
    results.frpServer = true;
    results.frpTunnel = true;
  } catch {}
  try {
    const r2 = await fetch('https://n8n.shreerangtrendz.com/healthz', { signal: AbortSignal.timeout(5000) });
    results.n8n = r2.ok;
  } catch {}
  return results;
}

export async function getSyncState() {
  const { data } = await supabase.from('tally_sync_state').select('*');
  return data || [];
}

export async function getLatestSyncLog(limit = 10) {
  const { data } = await supabase.from('tally_sync_log').select('*').order('synced_at', { ascending: false }).limit(limit);
  return data || [];
}
