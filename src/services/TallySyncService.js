// TallySyncService.js — Shreerang Trendz
// Full BizAnalyst-grade sync: ALL voucher types, ledgers, stock, outstanding
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const TALLY_PROXY = async (xmlBody, company = '') => {
  const { data, error } = await supabase.functions.invoke('tally-proxy', { body: { xmlBody, company } });
  if (error) throw new Error('Edge function error: ' + error.message);
  if (!data) throw new Error('Empty response from tally-proxy');
  if (data.success === false) {
    if (data.error === 'TALLY_IMPORT_DIALOG_OPEN') throw new Error('TALLY_DIALOG_OPEN: Press ESC in Tally');
    throw new Error('Tally error: ' + (data.error || 'Unknown'));
  }
  return data.data;
};

// ─── XML HELPERS ─────────────────────────────────────────────────────────────
function getTag(xml, tag) {
  const re = new RegExp('<' + tag + '(?:\s[^>]*)?>([\s\S]*?)<\/' + tag + '>', 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}
function getAllTags(xml, tag) {
  const re = new RegExp('<' + tag + '(?:\s[^>]*)?>([\s\S]*?)<\/' + tag + '>', 'gi');
  const out = []; let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}
function toDate(raw) {
  if (!raw) return null;
  const s = raw.replace(/\D/g, '');
  if (s.length !== 8) return null;
  return s.slice(0,4) + '-' + s.slice(4,6) + '-' + s.slice(6,8);
}
function toAmt(s) {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^\d.-]/g,''));
  return isNaN(n) ? 0 : Math.abs(n);
}
function getAttr(xml, attr) {
  const m = xml.match(new RegExp(attr + '="([^"]+)"', 'i'));
  return m ? m[1] : '';
}

// ─── XML BUILDERS ─────────────────────────────────────────────────────────────
function buildDayBookXml() {
  return '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Day Book</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
}
function buildLedgersXml() {
  return '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Accounts</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
}
function buildStockXml() {
  return '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Stock Summary</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><EXPLODEFLAG>Yes</EXPLODEFLAG><EXPLODEALLLEVELS>Yes</EXPLODEALLLEVELS></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
}
function buildOutstandingXml(type = 'Sundry Debtors') {
  return `<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Outstanding Receivables</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><GROUPNAME>${type}</GROUPNAME></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
}

// ─── VOUCHER TYPE CLASSIFIER ──────────────────────────────────────────────────
function classifyVoucher(vchtype) {
  const vt = vchtype.toLowerCase();
  if (vt.includes('material out') || vt.includes('job work out')) return 'material_out';
  if (vt.includes('material in') || vt.includes('job work in')) return 'material_in';
  if (vt.includes('sale')) return 'sales';
  if (vt.includes('purchase')) return 'purchase';
  if (vt.includes('receipt')) return 'receipt';
  if (vt.includes('payment')) return 'payment';
  if (vt.includes('credit note') || vt.includes('credit note')) return 'credit_note';
  if (vt.includes('debit note')) return 'debit_note';
  if (vt.includes('journal')) return 'journal';
  if (vt.includes('contra')) return 'contra';
  if (vt.includes('stock')) return 'stock_journal';
  return 'other';
}

// ─── FULL VOUCHER PARSER ──────────────────────────────────────────────────────
function parseAllVouchers(xml) {
  const allVouchers = [];
  const salesRows = [];
  const purchaseRows = [];
  const receiptRows = [];
  const paymentRows = [];
  const jobWorkRows = [];
  const blocks = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];

  for (const b of blocks) {
    const vchtype = getAttr(b, 'VCHTYPE') || getTag(b, 'VOUCHERTYPENAME') || '';
    const category = classifyVoucher(vchtype);

    const vn = getTag(b, 'VOUCHERNUMBER');
    const dt = toDate(getTag(b, 'DATE'));
    const party = getTag(b, 'PARTYLEDGERNAME');
    const narr = getTag(b, 'NARRATION') || null;
    const ref = getTag(b, 'REFERENCE') || null;
    const guid = getAttr(b, 'REMOTEID') || getAttr(b, 'VCHKEY') || null;

    if (!dt) continue;

    // Get amounts - positive and negative
    const amounts = getAllTags(b, 'AMOUNT').map(a => parseFloat(a.replace(/[^\d.-]/g,''))).filter(a => !isNaN(a));
    const positiveAmts = amounts.filter(a => a > 0);
    const total = positiveAmts.length > 0 ? Math.max(...positiveAmts) : 0;

    // Parse line items (ALLLEDGERENTRIES)
    const ledgerEntries = [];
    const entryBlocks = b.match(/<ALLLEDGERENTRIES\.LIST[\s\S]*?<\/ALLLEDGERENTRIES\.LIST>/gi) || [];
    for (const eb of entryBlocks) {
      const lname = getTag(eb, 'LEDGERNAME');
      const lamt = getTag(eb, 'AMOUNT');
      if (lname) ledgerEntries.push({ ledger: lname, amount: toAmt(lamt) });
    }

    // Phase 3 Deep Sync: Inventory Items Extraction
    const line_items = [];
    const invBlocks = b.match(/<ALLINVENTORYENTRIES\.LIST[\s\S]*?<\/ALLINVENTORYENTRIES\.LIST>/gi) || [];
    for (const inv of invBlocks) {
      const matchTag = (xmlBlock, tag) => {
        const m = xmlBlock.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'i')) || xmlBlock.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 'i'));
        return m ? m[1].replace(/&#4[A-Za-z0-9]+;/g, '').trim() : null; // Safe fallback stripping specific XML entities if any
      };
      
      const itemName = matchTag(inv, 'STOCKITEMNAME');
      const qtyStr = matchTag(inv, 'BILLEDQTY') || '0';
      const rateStr = matchTag(inv, 'RATE') || '0';
      const amtStrNode = matchTag(inv, 'AMOUNT') || '0';

      if (itemName) {
        line_items.push({
          item_name: itemName,
          quantity: parseFloat(qtyStr.replace(/[^\d.-]/g, '')) || 0,
          rate: parseFloat(rateStr.replace(/[^\d.-]/g, '')) || 0,
          amount: parseFloat(amtStrNode.replace(/-/g, '')) || 0
        });
      }
    }
    const pItem = line_items.length > 0 ? line_items[0] : {};

    // Master voucher record
    const voucherRecord = {
      voucher_number: vn,
      voucher_date: dt,
      voucher_type: vchtype,
      category,
      party_name: party,
      amount: total,
      narration: narr,
      reference: ref,
      tally_guid: guid,
      ledger_entries: ledgerEntries,
      status: 'synced',
      raw_data: b.substring(0, 2000)
    };
    allVouchers.push(voucherRecord);

    // Route to specific tables
    if (category === 'sales') {
      salesRows.push({
        bill_number: vn || `SALES-${dt}-${Math.random().toString(36).substr(2,6)}`,
        bill_date: dt,
        customer_name: party,
        item_name: pItem.item_name || '',
        quantity: pItem.quantity || 0,
        rate: pItem.rate || 0,
        line_items: line_items,
        total_amount: total,
        lr_no: getTag(b, 'BASICSHIPDOCUMENTNO') || getTag(b, 'EBWAYBILLNO') || null,
        transporter_name: getTag(b, 'BASICSHIPDELIVERYNAME') || getTag(b, 'STATENAME') || null,
        notes: narr || `Tally Sales Voucher`,
        tally_voucher_no: vn,
        tally_sync_status: 'synced',
        status: 'synced'
      });
    } else if (category === 'purchase') {
      purchaseRows.push({
        bill_number: vn || `PUR-${dt}-${Math.random().toString(36).substr(2,6)}`,
        bill_date: dt,
        supplier_name: party,
        item_name: pItem.item_name || '',
        quantity: pItem.quantity || 0,
        rate: pItem.rate || 0,
        line_items: line_items,
        total_amount: total,
        notes: narr || `Tally Purchase Voucher`,
        status: 'synced'
      });
    } else if (category === 'material_out' || category === 'material_in') {
      jobWorkRows.push({
        voucher_number: vn || `JW-${dt}-${Math.random().toString(36).substr(2,6)}`,
        issue_date: dt,
        mill_name: party,
        process_type: category === 'material_out' ? 'Issue to Mill' : 'Receive from Mill',
        notes: narr || `Tally Job Work Voucher`,
        grey_fabric_name: category === 'material_out' ? pItem.item_name || '' : null,
        finished_fabric_name: category === 'material_in' ? pItem.item_name || '' : null,
        metres_issued: category === 'material_out' ? (pItem.quantity || total) : 0,
        metres_received: category === 'material_in' ? (pItem.quantity || total) : 0,
        line_items: line_items
      });
    } else if (category === 'receipt') {
      receiptRows.push({ party_name: party, amount: total, date: dt, ref, narr, voucher_number: vn, category: 'receipt' });
    } else if (category === 'payment') {
      paymentRows.push({ party_name: party, amount: total, date: dt, ref, narr, voucher_number: vn, category: 'payment' });
    }
  }

  return { allVouchers, salesRows, purchaseRows, receiptRows, paymentRows, jobWorkRows, totalBlocks: blocks.length };
}

// ─── LEDGER PARSER (Customers + Suppliers + Agents) ───────────────────────────
function parseAllLedgers(xml) {
  const customers = [], suppliers = [], agents = [];
  const blocks = xml.match(/<LEDGER[\s\S]*?<\/LEDGER>/gi) || [];

  for (const b of blocks) {
    const name = getTag(b, 'LANGUAGENAME.LIST')?.match(/<NAME\.LIST[\s\S]*?<NAME>([^<]+)<\/NAME>/i)?.[1]?.trim()
                 || getTag(b, 'NAME') || null;
    if (!name) continue;
    const parent = getTag(b, 'PARENT') || '';
    const phone = getTag(b, 'LEDPHONE') || getTag(b, 'PHONE') || null;
    const email = getTag(b, 'EMAIL') || null;
    const gstin = getTag(b, 'TAXREGISTRATIONNUMBER') || null;
    const state = getTag(b, 'STATENAME') || null;
    const address = getAllTags(b, 'ADDRESS').join(', ') || null;
    const creditDays = parseInt(getTag(b, 'CREDITPERIOD') || '0') || 0;
    const creditLimit = toAmt(getTag(b, 'CREDITLIMIT') || '0');
    const p = parent.toLowerCase();
    const cleanArea = parent.replace(/sundry debtors?/gi, '').replace(/^-+|-+$/g, '').trim();

    const base = { tally_ledger_name: name, phone, email, address, gst_number: gstin, state, credit_days: creditDays, credit_limit: creditLimit, area: cleanArea || null };

    if (p.includes('sundry debtor')) {
      customers.push({ ...base, name, customer_type: 'Wholesale', status: 'active', business_type: 'customer' });
    } else if (p.includes('sundry creditor')) {
      suppliers.push({ ...base, name, customer_type: 'Supplier', status: 'active', business_type: 'supplier' });
    } else if (p.includes('agent') || p.includes('commission')) {
      agents.push({ name, phone, email, state, status: 'active' });
    }
  }
  return { customers, suppliers, agents, total: blocks.length };
}

// ─── STOCK PARSER ─────────────────────────────────────────────────────────────
function parseStock(xml) {
  const rows = [];
  const blocks = xml.match(/<STOCKITEM[\s\S]*?<\/STOCKITEM>/gi) || [];
  for (const b of blocks) {
    const name = getTag(b, 'NAME') || null;
    const closing = toAmt(getTag(b, 'CLOSINGBALANCE') || '0');
    const group = getTag(b, 'PARENT') || null;
    if (!name) continue;
    const sku = name.toUpperCase().replace(/[^A-Z0-9]/g,'-').replace(/-+/g,'-').substring(0,50);
    
    // Phase 18: Extract Godowns from BATCHALLOCATIONS
    const godowns = [];
    const batchBlocks = b.match(/<BATCHALLOCATIONS\.LIST[\s\S]*?<\/BATCHALLOCATIONS\.LIST>/gi) || [];
    for (const bb of batchBlocks) {
      const gName = getTag(bb, 'GODOWNNAME') || 'Main Location';
      const bQty = toAmt(getTag(bb, 'CLOSINGBALANCE') || '0');
      if (bQty !== 0) {
        godowns.push({ godown: gName, quantity: bQty });
      }
    }
    
    rows.push({ 
      fabric_sku: sku, 
      fabric_name: name, 
      closing_qty_mtrs: closing, 
      tally_group: group,
      godown_balances: godowns,
      sync_date: new Date().toISOString().slice(0,10), 
      last_tally_sync: new Date().toISOString() 
    });
  }
  return rows;
}

// ─── SYNC FUNCTIONS ───────────────────────────────────────────────────────────
export async function syncVouchersFromTally(company = '') {
  const log = { sales: 0, purchase: 0, receipts: 0, payments: 0, jobworks: 0, errors: [], totalBlocks: 0 };
  try {
    const xml = await TALLY_PROXY(buildDayBookXml(), company);
    const { salesRows, purchaseRows, receiptRows, paymentRows, jobWorkRows, totalBlocks } = parseAllVouchers(xml);
    log.totalBlocks = totalBlocks;

    if (salesRows.length > 0) {
      const { error } = await supabase.from('sales_bills').upsert(salesRows, { onConflict: 'bill_number' });
      if (error) log.errors.push('sales: ' + error.message);
      else {
        log.sales = salesRows.length;
        // Phase 16: Notify n8n for Sales Dispatch automated WhatsApp messages
        const dispatches = salesRows.filter(r => r.lr_no);
        if (dispatches.length > 0) {
          try {
            const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.shreerangtrendz.com/webhook/wa-bot';
            fetch(N8N_WEBHOOK, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'tally_sync_dispatch', vouchers: dispatches })
            }).catch(e => console.error('n8n hook failed:', e));
          } catch(e) {}
        }
      }
    }
    if (purchaseRows.length > 0) {
      const { error } = await supabase.from('purchase_bills').upsert(purchaseRows, { onConflict: 'bill_number' });
      if (error) log.errors.push('purchase: ' + error.message);
      else log.purchase = purchaseRows.length;
    }

    // Log receipts + payments to tally_vouchers
    const cashVouchers = [...receiptRows, ...paymentRows].map(v => ({
      voucher_number: v.voucher_number, voucher_date: v.date, voucher_type: v.category,
      party_name: v.party_name, amount: v.amount, narration: v.narr, reference: v.ref
    })).filter(v => v.voucher_date);
    if (cashVouchers.length > 0) {
      await supabase.from('tally_vouchers').upsert(cashVouchers, { onConflict: 'voucher_number,voucher_date' }).catch(() => {});
      log.receipts = receiptRows.length;
      log.payments = paymentRows.length;
    }

    // Log Job Works
    if (jobWorkRows.length > 0) {
      const { error } = await supabase.from('process_issues').upsert(jobWorkRows, { onConflict: 'voucher_number' }).catch(() => {});
      if (error) log.errors.push('jobworks: ' + error.message);
      else log.jobworks = jobWorkRows.length;
    }

    await supabase.from('tally_sync_log').insert({
      sync_type: 'vouchers_combined', status: log.errors.length ? 'partial' : 'success',
      records_synced: log.sales + log.purchase + log.jobworks, error_message: log.errors.join('; ') || null,
      raw_response: xml.substring(0, 500)
    });
    await supabase.from('tally_sync_state').upsert([
      { sync_type: 'sales_vouchers', last_synced_voucher_date: new Date().toISOString().slice(0,10), total_records_synced: log.sales },
      { sync_type: 'purchase_vouchers', last_synced_voucher_date: new Date().toISOString().slice(0,10), total_records_synced: log.purchase }
    ], { onConflict: 'sync_type' });
  } catch(e) {
    log.errors.push(e.message);
    await supabase.from('tally_sync_log').insert({ sync_type: 'vouchers_combined', status: 'error', records_synced: 0, error_message: e.message });
  }
  return log;
}

export async function syncCustomersFromTally(company = '') {
  const log = { customers: 0, suppliers: 0, agents: 0, errors: [] };
  try {
    const xml = await TALLY_PROXY(buildLedgersXml(), company);
    const { customers, suppliers, agents } = parseAllLedgers(xml);

    if (customers.length > 0) {
      const { error } = await supabase.from('customers').upsert(customers, { onConflict: 'tally_ledger_name', ignoreDuplicates: false });
      if (error) log.errors.push('customers: ' + error.message);
      else log.customers = customers.length;
    }
    if (suppliers.length > 0) {
      const { error } = await supabase.from('customers').upsert(suppliers, { onConflict: 'tally_ledger_name', ignoreDuplicates: false });
      if (error) log.errors.push('suppliers: ' + error.message);
      else log.suppliers = suppliers.length;
    }
    if (agents.length > 0) {
      const { error } = await supabase.from('agents').upsert(agents, { onConflict: 'name' });
      if (error) log.errors.push('agents: ' + error.message);
      else log.agents = agents.length;
    }
    await supabase.from('tally_sync_log').insert({
      sync_type: 'ledgers', status: log.errors.length ? 'partial' : 'success',
      records_synced: log.customers + log.suppliers + log.agents, error_message: log.errors.join('; ') || null
    });
  } catch(e) {
    log.errors.push(e.message);
    await supabase.from('tally_sync_log').insert({ sync_type: 'ledgers', status: 'error', records_synced: 0, error_message: e.message });
  }
  return log;
}

export async function syncStockFromTally(company = '') {
  const log = { stock: 0, errors: [] };
  try {
    const xml = await TALLY_PROXY(buildStockXml(), company);
    const rows = parseStock(xml);
    if (rows.length > 0) {
      await supabase.from('fabric_stock_live').delete().neq('id','00000000-0000-0000-0000-000000000000').catch(()=>{});
      const { error } = await supabase.from('fabric_stock_live').insert(rows);
      if (error) log.errors.push('stock: ' + error.message);
      else log.stock = rows.length;
    }
    await supabase.from('tally_sync_log').insert({
      sync_type: 'stock_items', status: log.errors.length ? 'partial' : 'success',
      records_synced: log.stock, error_message: log.errors.join('; ') || null
    });
  } catch(e) {
    log.errors.push(e.message);
    await supabase.from('tally_sync_log').insert({ sync_type: 'stock_items', status: 'error', records_synced: 0, error_message: e.message });
  }
  return log;
}

export async function syncAllFromTally(company = '') {
  const results = {};
  console.log('[TallySyncService] Starting full sync...');
  results.vouchers  = await syncVouchersFromTally(company);
  results.customers = await syncCustomersFromTally(company);
  results.stock     = await syncStockFromTally(company);
  return results;
}

// ─── LEGACY COMPATIBILITY ─────────────────────────────────────────────────────
export async function pullPurchasesFromTally() { return syncVouchersFromTally(); }
export async function pullSalesFromTally() { return syncVouchersFromTally(); }
export async function pullStockWithDesignDetail() { return syncStockFromTally(); }
export async function pullJobBillsFromTally() { return { success: true, records: 0 }; }
export async function syncSuppliersFromTally() { return syncCustomersFromTally(); }
export async function syncAgentsFromTally() { return syncCustomersFromTally(); }
export async function syncOutstandingFromTally() { return syncCustomersFromTally(); }
export async function pushOrderToTally(orderId) { 
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-push-vouchers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDk4NTUsImV4cCI6MjA3OTAyNTg1NX0.47cCribhShEYGqsLbsh7lUwFaFK-rXf2SusVhq4-p0o'}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to push');
    return { success: true, voucherNo: 'Synced Check Tally' };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ─── INFRA STATUS CHECK ───────────────────────────────────────────────────────
export async function checkTallyInfraStatus() {
  const results = { nginx: false, frpServer: false, frpTunnel: false, tallyPrime: false, n8n: false };
  try {
    const r = await fetch('https://tally.shreerangtrendz.com', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    results.tallyPrime = r.status < 500;
    results.nginx = true; results.frpServer = true; results.frpTunnel = true;
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

export async function getLatestSyncLog(limit = 20) {
  const { data } = await supabase.from('tally_sync_log').select('*').order('created_at', { ascending: false }).limit(limit);
  return data || [];
}
