// ============================================================
// TallySyncService.js
// Shreerang Trendz — All Tally ERP communication functions
// Tally must be OPEN on PC with HTTP port 9000 enabled
// ============================================================

import { supabase } from '../lib/supabase';

const TALLY_URL = 'https://tally.shreerangtrendz.com';

// ─── HELPER: POST XML to Tally ──────────────────────────────
// Uses /api/tally-proxy (Vercel serverless function) which forwards to tally.shreerangtrendz.com
async function postToTally(xml) {
    console.log(`[TallySyncService] Sending XML to /api/tally-proxy...`);
    let res;
    try {
        res = await fetch('/api/tally-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml' },
            body: xml,
            signal: AbortSignal.timeout(30000),
        });
    } catch (err) {
        throw new Error(`Network error reaching Tally proxy: ${err.message}. Check Vercel is deployed and Tally is running.`);
    }

    if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = j.error || j.detail || ''; } catch {}
        throw new Error(`Tally proxy returned ${res.status}: ${detail || 'FRP tunnel may be offline'}`);
    }

    const contentType = res.headers.get('content-type') || '';
    let responseXml;

    if (contentType.includes('application/json')) {
        const j = await res.json();
        if (j.error) throw new Error(`Tally Server error: ${j.error}. Detail: ${j.detail || ''}`);
        responseXml = j.xml || j;
    } else {
        responseXml = await res.text();
    }

    if (typeof responseXml !== 'string') {
        console.error('[TallySyncService] Unexpected response format:', responseXml);
        throw new Error('Received non-string response from Tally Proxy');
    }

    console.log(`[TallySyncService] Received XML (${responseXml.length} chars)`);
    return responseXml;
}

// ─── HELPER: Log sync error to Supabase ─────────────────────
async function logSyncError(syncType, direction, recordId, errorMessage) {
    await supabase.from('tally_sync_errors').insert({
        sync_type: syncType,
        direction,
        record_id: String(recordId),
        error_message: errorMessage,
    });
}

// ─── HELPER: Extract XML tag value ──────────────────────────
function extractTag(xml, tag) {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i'));
    return match ? match[1].trim() : null;
}

// ─── HELPER: Tally date YYYYMMDD → YYYY-MM-DD ───────────────
function formatTallyDate(tallyDate) {
    if (!tallyDate || tallyDate.length !== 8) return null;
    return `${tallyDate.slice(0, 4)}-${tallyDate.slice(4, 6)}-${tallyDate.slice(6, 8)}`;
}

// ─── HELPER: Extract voucher number from response ────────────
function extractVoucherNo(xml) {
    return extractTag(xml, 'VOUCHERNUMBER') || extractTag(xml, 'VCHNO');
}

// ============================================================
// 1. PULL PURCHASES FROM TALLY
// ============================================================
export async function pullPurchasesFromTally(fromDate, toDate) {
    const from = fromDate.replace(/-/g, '');
    const to = toDate.replace(/-/g, '');

    const xml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES>
      <SVFROMDATE>${from}</SVFROMDATE>
      <SVTODATE>${to}</SVTODATE>
      <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    try {
        const responseXml = await postToTally(xml);
        const { vouchers } = parseTallyXMLResponse(responseXml);

        for (const v of vouchers) {
            await supabase.from('purchase_fabric').upsert({
                tally_voucher_no: v.voucherNumber,
                supplier_name: v.partyLedgerName,
                invoice_date: v.date,
                total_amount: v.amount,
                tally_sync_status: 'synced',
            }, { onConflict: 'tally_voucher_no' });
        }

        return { success: true, count: vouchers.length };
    } catch (err) {
        await logSyncError('purchase_pull', 'tally_to_supabase', 'batch', err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================
// 2. PULL JOB BILLS FROM TALLY
// ============================================================
export async function pullJobBillsFromTally(fromDate, toDate) {
    const from = fromDate.replace(/-/g, '');
    const to = toDate.replace(/-/g, '');

    const xml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES>
      <SVFROMDATE>${from}</SVFROMDATE>
      <SVTODATE>${to}</SVTODATE>
      <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    try {
        const responseXml = await postToTally(xml);
        const { vouchers } = parseTallyXMLResponse(responseXml);

        for (const v of vouchers) {
            await supabase.from('process_charges').upsert({
                tally_voucher_no: v.voucherNumber,
                job_worker_name: v.partyLedgerName,
                bill_date: v.date,
                job_charge: v.amount,
                tally_sync_status: 'synced',
            }, { onConflict: 'tally_voucher_no' });
        }

        return { success: true, count: vouchers.length };
    } catch (err) {
        await logSyncError('job_bill_pull', 'tally_to_supabase', 'batch', err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================
// 3. PULL STOCK WITH DESIGN DETAIL
// ============================================================
export async function pullStockWithDesignDetail() {
    const xml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Stock Summary</REPORTNAME>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <EXPLODEFLAG>Yes</EXPLODEFLAG>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    try {
        const responseXml = await postToTally(xml);
        const { stockItems } = parseTallyXMLResponse(responseXml);
        const today = new Date().toISOString().split('T')[0];

        let count = 0;
        for (const item of stockItems) {
            if (item.batches && item.batches.length > 0) {
                for (const batch of item.batches) {
                    let designNo = batch.name;
                    if (designNo) {
                        // Strip out "D", "D No.", "D No" from the beginning
                        designNo = designNo.replace(/^D\s*(No\.?)?\s*/i, '').trim();
                        // Ignore default batch names
                        if (designNo.toLowerCase() === 'primary batch') designNo = 'MAIN';
                    } else {
                        designNo = 'MAIN';
                    }

                    await supabase.from('fabric_stock_live').upsert({
                        fabric_sku: item.name,
                        fabric_name: item.name,
                        design_no: designNo,
                        closing_qty_mtrs: batch.closingQty || 0,
                        sync_date: today,
                        last_tally_sync: new Date().toISOString(),
                    }, { onConflict: 'fabric_sku,design_no,sync_date' });
                    count++;
                }
            } else {
                // Fallback if no batch found
                await supabase.from('fabric_stock_live').upsert({
                    fabric_sku: item.name,
                    fabric_name: item.name,
                    design_no: 'MAIN',
                    closing_qty_mtrs: item.closingQty || 0,
                    sync_date: today,
                    last_tally_sync: new Date().toISOString(),
                }, { onConflict: 'fabric_sku,design_no,sync_date' });
                count++;
            }
        }

        return { success: true, count };
    } catch (err) {
        await logSyncError('stock_pull_with_design', 'tally_to_supabase', 'batch', err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================
// 4. PUSH SALES ORDER TO TALLY
// ============================================================
export async function pushOrderToTally(orderId) {
    const { data: order, error } = await supabase
        .from('sales_orders')
        .select('*, customers(tally_ledger_name, name)')
        .eq('id', orderId)
        .single();

    if (error || !order) return { success: false, error: 'Order not found' };

    if (!order.customers?.tally_ledger_name) {
        return {
            success: false,
            error: `Customer "${order.customers?.name}" has no tally_ledger_name — set it first`,
        };
    }

    const xml = buildSalesVoucherXML(order);

    try {
        const responseXml = await postToTally(xml);
        const voucherNo = extractVoucherNo(responseXml);

        await supabase.from('sales_orders').update({
            tally_voucher_no: voucherNo,
            tally_sync_status: 'synced',
            tally_synced_at: new Date().toISOString(),
        }).eq('id', orderId);

        return { success: true, voucherNo };
    } catch (err) {
        await supabase.from('sales_orders').update({
            tally_sync_status: 'failed',
            tally_error_msg: err.message,
        }).eq('id', orderId);
        await logSyncError('order_push', 'supabase_to_tally', orderId, err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================
// 5. PUSH CHALLAN TO TALLY
// ============================================================
export async function pushChallanToTally(challanId) {
    const { data: challan, error } = await supabase
        .from('process_issues')
        .select('*, job_workers(name, tally_ledger_name)')
        .eq('id', challanId)
        .single();

    if (error || !challan) return { success: false, error: 'Challan not found' };

    const xml = buildDeliveryNoteXML(challan);

    try {
        const responseXml = await postToTally(xml);
        const voucherNo = extractVoucherNo(responseXml);

        await supabase.from('process_issues').update({
            tally_voucher_no: voucherNo,
            tally_sync_status: 'synced',
        }).eq('id', challanId);

        return { success: true, voucherNo };
    } catch (err) {
        await logSyncError('challan_push', 'supabase_to_tally', challanId, err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================
// 6. BUILD SALES VOUCHER XML
// ============================================================
export function buildSalesVoucherXML(order) {
    const dateStr = new Date(order.created_at)
        .toISOString().split('T')[0].replace(/-/g, '');
    const ledger = order.customers.tally_ledger_name;
    const amount = order.total_amount;

    return `<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY><IMPORTDATA><REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
  </REQUESTDESC><REQUESTDATA>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Sales" ACTION="Create">
    <DATE>${dateStr}</DATE>
    <VOUCHERNUMBER>WEB-${order.order_no}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${ledger}</PARTYLEDGERNAME>
    <NARRATION>Website order - ${order.order_no}</NARRATION>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${ledger}</LEDGERNAME>
      <AMOUNT>${amount}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Sales</LEDGERNAME>
      <AMOUNT>-${amount}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  </VOUCHER>
  </TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
}

// ============================================================
// 7. BUILD DELIVERY NOTE XML
// ============================================================
export function buildDeliveryNoteXML(challan) {
    const dateStr = new Date(challan.created_at)
        .toISOString().split('T')[0].replace(/-/g, '');
    const ledger = challan.job_workers?.tally_ledger_name || challan.job_worker_name;

    return `<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY><IMPORTDATA><REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
  </REQUESTDESC><REQUESTDATA>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Delivery Note" ACTION="Create">
    <DATE>${dateStr}</DATE>
    <VOUCHERNUMBER>${challan.challan_no}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${ledger}</PARTYLEDGERNAME>
    <NARRATION>Fabric issue - ${challan.process_type} - ${challan.challan_no}</NARRATION>
  </VOUCHER>
  </TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
}

// ============================================================
// 8. PARSE TALLY XML RESPONSE
// ============================================================
export function parseTallyXMLResponse(xml) {
    const vouchers = [];
    const stockItems = [];

    // Extract vouchers
    const voucherMatches = [...xml.matchAll(/<VOUCHER[^>]*>([\s\S]*?)<\/VOUCHER>/gi)];
    for (const match of voucherMatches) {
        const block = match[1];
        vouchers.push({
            voucherNumber: extractTag(block, 'VOUCHERNUMBER'),
            partyLedgerName: extractTag(block, 'PARTYLEDGERNAME'),
            date: formatTallyDate(extractTag(block, 'DATE')),
            amount: parseFloat(extractTag(block, 'AMOUNT') || '0'),
        });
    }

    // Extract stock items
    const stockMatches = [...xml.matchAll(/<STOCKITEM[^>]*>([\s\S]*?)<\/STOCKITEM>/gi)];
    for (const match of stockMatches) {
        const block = match[1];

        // Extract batches if EXPLODEFLAG gives BATCHALLOCATIONS.LIST
        const batches = [];
        const batchMatches = [...block.matchAll(/<BATCHALLOCATIONS\.LIST[^>]*>([\s\S]*?)<\/BATCHALLOCATIONS\.LIST>/gi)];
        for (const bMatch of batchMatches) {
            const bBlock = bMatch[1];
            batches.push({
                name: extractTag(bBlock, 'BATCHNAME') || extractTag(bBlock, 'NAME'),
                closingQty: parseFloat(extractTag(bBlock, 'CLOSINGBALANCE') || '0'),
            });
        }

        stockItems.push({
            name: extractTag(block, 'NAME'),
            closingQty: parseFloat(extractTag(block, 'CLOSINGBALANCE') || '0'),
            batches: batches,
        });
    }

    return { vouchers, stockItems };
}

// ─── SYNC CUSTOMERS FROM TALLY ──────────────────────────────
export async function syncCustomersFromTally() {
    const xml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Ledger</REPORTNAME>
    <STATICVARIABLES>
      <SVCURRENTCOMPANY>Shreerang Trendz Pvt Ltd</SVCURRENTCOMPANY>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <LEDGERGROUPSFILTER>Sundry Debtors</LEDGERGROUPSFILTER>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    try {
        const xml_response = await postToTally(xml);
        const ledgers = parseLedgersFromXML(xml_response);
        let count = 0;
        for (const ledger of ledgers) {
            await supabase.from('customers').upsert({
                name: ledger.name,
                tally_ledger_name: ledger.name,
                phone: ledger.phone || null,
                address: ledger.address || null,
                gst_number: ledger.gstin || null,
                credit_days: ledger.creditDays || 30,
                status: 'active',
            }, { onConflict: 'tally_ledger_name' });
            count++;
        }
        return { success: true, count };
    } catch (err) {
        await logSyncError('customer_sync', 'tally_to_supabase', 'batch', err.message);
        return { success: false, error: err.message };
    }
}

// ─── SYNC SUPPLIERS/CREDITORS FROM TALLY ────────────────────
export async function syncSuppliersFromTally() {
    const xml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Ledger</REPORTNAME>
    <STATICVARIABLES>
      <SVCURRENTCOMPANY>Shreerang Trendz Pvt Ltd</SVCURRENTCOMPANY>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <LEDGERGROUPSFILTER>Sundry Creditors</LEDGERGROUPSFILTER>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    try {
        const xml_response = await postToTally(xml);
        const ledgers = parseLedgersFromXML(xml_response);
        let count = 0;
        for (const ledger of ledgers) {
            await supabase.from('customers').upsert({
                name: ledger.name,
                tally_ledger_name: ledger.name,
                phone: ledger.phone || null,
                address: ledger.address || null,
                gst_number: ledger.gstin || null,
                business_type: 'supplier',
                credit_days: 30,
                status: 'active',
            }, { onConflict: 'tally_ledger_name' });
            count++;
        }
        return { success: true, count };
    } catch (err) {
        await logSyncError('supplier_sync', 'tally_to_supabase', 'batch', err.message);
        return { success: false, error: err.message };
    }
}

// ─── SYNC AGENTS FROM TALLY ─────────────────────────────────
export async function syncAgentsFromTally() {
    const xml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Ledger</REPORTNAME>
    <STATICVARIABLES>
      <SVCURRENTCOMPANY>Shreerang Trendz Pvt Ltd</SVCURRENTCOMPANY>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <LEDGERGROUPSFILTER>Sales Accounts</LEDGERGROUPSFILTER>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    try {
        const xml_response = await postToTally(xml);
        const ledgers = parseLedgersFromXML(xml_response);
        let count = 0;
        for (const ledger of ledgers) {
            await supabase.from('sales_team').upsert({
                name: ledger.name,
                phone: ledger.phone || null,
                email: ledger.email || null,
                is_active: true,
            }, { onConflict: 'name' });
            count++;
        }
        return { success: true, count };
    } catch (err) {
        await logSyncError('agent_sync', 'tally_to_supabase', 'batch', err.message);
        return { success: false, error: err.message };
    }
}

// ─── SYNC OUTSTANDING FROM TALLY ────────────────────────────
export async function syncOutstandingFromTally() {
    const xml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Bill Outstanding</REPORTNAME>
    <STATICVARIABLES>
      <SVCURRENTCOMPANY>Shreerang Trendz Pvt Ltd</SVCURRENTCOMPANY>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    try {
        const xml_response = await postToTally(xml);
        // Parse and upsert into payment_followups
        const bills = parseBillsFromXML(xml_response);
        for (const bill of bills) {
            await supabase.from('payment_followups').upsert({
                customer_name: bill.partyName,
                total_outstanding: bill.amount,
                committed_date: bill.dueDate,
                status: 'pending',
            }, { onConflict: 'customer_name' });
        }
        return { success: true, count: bills.length };
    } catch (err) {
        await logSyncError('outstanding_sync', 'tally_to_supabase', 'batch', err.message);
        return { success: false, error: err.message };
    }
}

// ─── PARSE LEDGERS FROM TALLY XML ───────────────────────────
function parseLedgersFromXML(xml) {
    const ledgers = [];
    const matches = [...xml.matchAll(/<LEDGER[^>]*NAME="([^"]*)"[^>]*>([\s\S]*?)<\/LEDGER>/gi)];
    for (const match of matches) {
        const name = match[1];
        const block = match[2];
        ledgers.push({
            name,
            gstin: extractTag(block, 'PARTYGSTIN'),
            phone: extractTag(block, 'LEDGERPHONE'),
            address: extractTag(block, 'ADDRESS'),
            email: extractTag(block, 'EMAIL'),
            creditDays: parseInt(extractTag(block, 'CREDITLIMITDAYS') || '30'),
        });
    }
    return ledgers;
}

function parseBillsFromXML(xml) {
    const bills = [];
    const matches = [...xml.matchAll(/<BILLDETAILS[^>]*>([\s\S]*?)<\/BILLDETAILS>/gi)];
    for (const match of matches) {
        const block = match[1];
        bills.push({
            partyName: extractTag(block, 'PARTYLEDGERNAME'),
            amount: parseFloat(extractTag(block, 'CLOSINGBALANCE') || '0'),
            dueDate: formatTallyDate(extractTag(block, 'BILLDATE')),
        });
    }
    return bills;
}
