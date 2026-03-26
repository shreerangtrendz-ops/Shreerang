/**
 * Tally XML Push Engine — Supabase Edge Function
 * Phase 15: tally-push-vouchers
 * 
 * Scans Supabase for vouchers marked `tally_sync_status = 'pending'`
 * and `status = 'pending_push'`, compiles them into native Tally XML,
 * and HTTP POSTs them to the on-premise Tally server via FRP tunnel.
 * 
 * Supported Voucher Types:
 *   - Sales Bills  → Tally "Sales" voucher
 *   - Purchase Bills → Tally "Purchase" voucher
 *   - Job Work Bills → Tally "Job Work" voucher
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TALLY_URL = Deno.env.get('TALLY_SERVER_URL') || 'http://tally.shreerangtrendz.com:9000';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// ─── XML Builders ────────────────────────────────────────────────────────────

function formatTallyDate(dateStr) {
  // Tally expects YYYYMMDD
  if (!dateStr) return '';
  return dateStr.replace(/-/g, '');
}

function buildLedgerEntry(ledgerName, amount, isDr = false) {
  return `
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${ledgerName}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>${isDr ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
      <AMOUNT>${isDr ? '-' : ''}${Math.abs(amount).toFixed(2)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>`;
}

function buildInventoryEntry(item) {
  return `
    <ALLINVENTORYENTRIES.LIST>
      <STOCKITEMNAME>${item.item_name || 'Fabric'}</STOCKITEMNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <RATE>${(item.rate || 0).toFixed(2)}/Nos</RATE>
      <AMOUNT>${(item.amount || item.charges || 0).toFixed(2)}</AMOUNT>
      <ACTUALQTY>${(item.quantity || 0).toFixed(3)} Nos</ACTUALQTY>
      <BILLEDQTY>${(item.quantity || 0).toFixed(3)} Nos</BILLEDQTY>
    </ALLINVENTORYENTRIES.LIST>`;
}

function buildSalesXML(bill) {
  const lineItems = (bill.line_items || []).map(buildInventoryEntry).join('');
  const taxEntries = [
    bill.igst_amount > 0 ? buildLedgerEntry('IGST', bill.igst_amount) : '',
    bill.cgst_amount > 0 ? buildLedgerEntry('CGST', bill.cgst_amount) : '',
    bill.sgst_amount > 0 ? buildLedgerEntry('SGST Output', bill.sgst_amount) : '',
  ].join('');

  return `
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
    <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
      <DATE>${formatTallyDate(bill.bill_date)}</DATE>
      <VOUCHERNUMBER>${bill.bill_number}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${bill.customer_name}</PARTYLEDGERNAME>
      <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
      ${bill.transporter_name ? `<BASICSHIPDELIVERYNAME>${bill.transporter_name}</BASICSHIPDELIVERYNAME>` : ''}
      ${bill.lr_no ? `<EWAYBILLDETAILS.LIST><EBWAYBILLNO>${bill.lr_no}</EBWAYBILLNO></EWAYBILLDETAILS.LIST>` : ''}
      ${bill.destination ? `<BASICSHIPDESTINATIONNAME>${bill.destination}</BASICSHIPDESTINATIONNAME>` : ''}
      ${buildLedgerEntry(bill.customer_name, bill.total_amount, true)}
      ${bill.agent_name && bill.commission_amount > 0 ? buildLedgerEntry(bill.agent_name, bill.commission_amount) : ''}
      ${taxEntries}
      ${buildLedgerEntry('Sales Account', (bill.total_amount - (bill.igst_amount||0) - (bill.cgst_amount||0) - (bill.sgst_amount||0)))}
      ${lineItems}
      <NARRATION>${bill.notes || ''}</NARRATION>
    </VOUCHER>
  </TALLYMESSAGE>`;
}

function buildSalesOrderXML(order) {
  const lineItems = (order.order_details?.items || order.line_items || []).map(item => `
    <ALLINVENTORYENTRIES.LIST>
      <STOCKITEMNAME>${item.item_name || 'Fabric'}</STOCKITEMNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <RATE>${(item.rate || 0).toFixed(2)}/Nos</RATE>
      <AMOUNT>${(item.amount || 0).toFixed(2)}</AMOUNT>
      <ACTUALQTY>${(item.quantity || 0).toFixed(3)} Nos</ACTUALQTY>
      <BILLEDQTY>${(item.quantity || 0).toFixed(3)} Nos</BILLEDQTY>
    </ALLINVENTORYENTRIES.LIST>`).join('');

  return `
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
    <VOUCHER VCHTYPE="Sales Order" ACTION="Create">
      <DATE>${formatTallyDate(order.created_at || order.order_date || new Date().toISOString())}</DATE>
      <VOUCHERNUMBER>${order.order_no || order.order_number}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${order.customer_name || order.party_name}</PARTYLEDGERNAME>
      ${order.shipping_address ? `<BASICSHIPDESTINATIONNAME>${order.shipping_address}</BASICSHIPDESTINATIONNAME>` : ''}
      ${buildLedgerEntry(order.customer_name || order.party_name, order.total_amount, true)}
      ${buildLedgerEntry('Sales Account', order.subtotal_amount || order.total_amount)}
      ${lineItems}
      <NARRATION>${order.notes || 'Field Sales Order via Shreerang App'}</NARRATION>
    </VOUCHER>
  </TALLYMESSAGE>`;
}

function buildPurchaseXML(bill) {
  const lineItems = (bill.line_items || []).map(buildInventoryEntry).join('');
  return `
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
    <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
      <DATE>${formatTallyDate(bill.bill_date)}</DATE>
      <VOUCHERNUMBER>${bill.bill_number}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${bill.supplier_name}</PARTYLEDGERNAME>
      <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
      ${buildLedgerEntry('Purchase Account', bill.total_amount, true)}
      ${bill.igst_amount > 0 ? buildLedgerEntry('IGST Input', bill.igst_amount, true) : ''}
      ${bill.cgst_amount > 0 ? buildLedgerEntry('CGST Input', bill.cgst_amount, true) : ''}
      ${bill.sgst_amount > 0 ? buildLedgerEntry('SGST Input', bill.sgst_amount, true) : ''}
      ${buildLedgerEntry(bill.supplier_name, bill.total_amount)}
      ${lineItems}
      <NARRATION>${bill.notes || ''}</NARRATION>
    </VOUCHER>
  </TALLYMESSAGE>`;
}

function buildJobWorkXML(bill) {
  const lineItems = (bill.line_items || []).map(item => buildInventoryEntry({ ...item, amount: item.charges })).join('');
  return `
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
    <VOUCHER VCHTYPE="Job Work In Orders" ACTION="Create">
      <DATE>${formatTallyDate(bill.bill_date)}</DATE>
      <VOUCHERNUMBER>${bill.bill_number}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${bill.job_worker_name}</PARTYLEDGERNAME>
      ${buildLedgerEntry('Job Work Charges', bill.amount, true)}
      ${bill.igst_amount > 0 ? buildLedgerEntry('IGST Input', bill.igst_amount, true) : ''}
      ${buildLedgerEntry(bill.job_worker_name, bill.amount)}
      ${lineItems}
      <NARRATION>${bill.notes || ''}</NARRATION>
    </VOUCHER>
  </TALLYMESSAGE>`;
}

function wrapEnvelope(messages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        ${messages}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results = { pushed: 0, failed: 0, errors: [] };

  try {
    // 1. Fetch all pending bills and orders
    const [{ data: sales }, { data: purchases }, { data: jobWorks }, { data: salesOrders }] = await Promise.all([
      supabase.from('sales_bills').select('*').eq('tally_sync_status', 'pending').eq('status', 'pending_push').limit(50),
      supabase.from('purchase_bills').select('*').eq('tally_sync_status', 'pending').eq('status', 'pending_push').limit(50),
      supabase.from('job_work_bills').select('*').eq('tally_sync_status', 'pending').eq('status', 'pending_push').limit(50),
      supabase.from('sales_orders').select('*').eq('tally_sync_status', 'pending').limit(50),
    ]);

    const batches = [
      { bills: sales || [], type: 'sales_bills', builder: buildSalesXML },
      { bills: purchases || [], type: 'purchase_bills', builder: buildPurchaseXML },
      { bills: jobWorks || [], type: 'job_work_bills', builder: buildJobWorkXML },
      { bills: salesOrders || [], type: 'sales_orders', builder: buildSalesOrderXML },
    ];

    for (const { bills, type, builder } of batches) {
      if (!bills.length) continue;

      // Build a single XML envelope for all bills of this type
      const messages = bills.map(b => builder(b)).join('\n');
      const xml = wrapEnvelope(messages);

      // POST to Tally server
      let tallyOk = false;
      try {
        const tallyResp = await fetch(TALLY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
          body: xml,
          signal: AbortSignal.timeout(15000)
        });
        const tallyBody = await tallyResp.text();
        tallyOk = tallyResp.ok && !tallyBody.includes('LINEERROR');
        if (!tallyOk) results.errors.push(`${type}: ${tallyBody.slice(0, 200)}`);
      } catch (fetchErr) {
        results.errors.push(`${type} fetch error: ${fetchErr.message}`);
      }

      // Update Supabase status
      const ids = bills.map(b => b.id);
      await supabase.from(type).update({
        tally_sync_status: tallyOk ? 'pushed' : 'failed',
        status: tallyOk ? 'synced' : 'push_failed',
        tally_pushed_at: new Date().toISOString()
      }).in('id', ids);

      if (tallyOk) results.pushed += bills.length;
      else results.failed += bills.length;
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
