// ============================================================
// TallySyncService.js
// Shreerang Trendz — All Tally ERP communication functions
// Tally must be OPEN on PC with HTTP port 9000 enabled
// ============================================================

import { supabase } from '../lib/supabase';

const TALLY_URL = 'https://yvone-unincreased-wilford.ngrok-free.app';
// Future: const TALLY_URL = 'https://tally.shreerangtrendz.com';

// ─── HELPER: POST XML to Tally ──────────────────────────────
async function postToTally(xml) {
    const response = await fetch(TALLY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml,
    });
    if (!response.ok) throw new Error(`Tally HTTP error: ${response.status}`);
    return await response.text();
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
// 3. PULL STOCK SUMMARY FROM TALLY
// ============================================================
export async function pullStockFromTally() {
    const xml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Stock Summary</REPORTNAME>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    try {
        const responseXml = await postToTally(xml);
        const { stockItems } = parseTallyXMLResponse(responseXml);
        const today = new Date().toISOString().split('T')[0];

        for (const item of stockItems) {
            await supabase.from('fabric_stock_live').upsert({
                fabric_sku: item.name,
                fabric_name: item.name,
                closing_qty_mtrs: item.closingQty || 0,
                sync_date: today,
                last_tally_sync: new Date().toISOString(),
            }, { onConflict: 'fabric_sku,sync_date' });
        }

        return { success: true, count: stockItems.length };
    } catch (err) {
        await logSyncError('stock_pull', 'tally_to_supabase', 'batch', err.message);
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
        stockItems.push({
            name: extractTag(block, 'NAME'),
            closingQty: parseFloat(extractTag(block, 'CLOSINGBALANCE') || '0'),
        });
    }

    return { vouchers, stockItems };
}
