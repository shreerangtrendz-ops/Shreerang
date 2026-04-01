import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// ── Helpers ──────────────────────────────────────────────────────────────────
function toISO(d)        { return d.toISOString().slice(0,10); }
function addDays(d,n)    { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function toTallyDate(d)  { return d.toISOString().slice(0,10).replace(/-/g,''); }
function parseTallyDate(s) {
  if (!s) return null; s = s.trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  const M={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const m = s.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (m) return `${m[3]}-${M[m[2]]||'01'}-${m[1].padStart(2,'0')}`;
  return null;
}
function getXmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}
function parseQty(s) { if (!s) return 0; return parseFloat(s.replace(/mtrs?/gi,'').replace(/nos?/gi,'').trim()) || 0; }
function parseRate(s) { if (!s) return 0; return parseFloat(s.replace(/\/mtrs?/gi,'').replace(/\/nos?/gi,'').trim()) || 0; }
function parseNum(s) { if (!s) return 0; return parseFloat(s.replace(/,/g,'').trim()) || 0; }
function getUdfVal(xml, udfName) {
  const re = new RegExp(`<UDF:${udfName}(?:\\.LIST)?[^>]*>[\\s\\S]*?<ALTEREDVALUE>([^<]+)<\\/ALTEREDVALUE>`, 'i');
  const m = xml.match(re); if (m) return m[1].trim();
  const re2 = new RegExp(`<UDF:${udfName}[^>]*>([^<]+)<\\/UDF:${udfName}>`, 'i');
  const m2 = xml.match(re2); if (m2) return m2[1].trim();
  return '';
}

// ── XML Block Extractors ─────────────────────────────────────────────────────
function getBlocks(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const entries = []; let m;
  while ((m = re.exec(xml)) !== null) entries.push(m[1]);
  return entries;
}
function getLedgerEntries(vxml) { return getBlocks(vxml, 'LEDGERENTRIES\\.LIST'); }
function getInventoryEntries(vxml) { return getBlocks(vxml, 'ALLINVENTORYENTRIES\\.LIST'); }
function getInventoryEntriesIn(vxml) { return getBlocks(vxml, 'INVENTORYENTRIESIN\\.LIST'); }
function getInventoryEntriesOut(vxml) {
  let entries = getBlocks(vxml, 'INVENTORYENTRIESOUT\\.LIST');
  if (entries.length === 0) entries = getBlocks(vxml, 'INVENTORYENTRIESIN\\.LIST');
  return entries;
}
function getBillAllocations(xml) { return getBlocks(xml, 'BILLALLOCATIONS\\.LIST'); }
function getBatchAllocations(xml) { return getBlocks(xml, 'BATCHALLOCATIONS\\.LIST'); }

function parseAllVouchers(xml) {
  const re = /<VOUCHER\b[^>]*>[\s\S]*?<\/VOUCHER>/gi;
  const blocks = []; let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[0].includes('REMOTECMPINFO')) continue;
    if (m[0].includes('REMOTECMPNAME')) continue;
    blocks.push(m[0]);
  }
  return blocks;
}

// ── Parse a single inventory entry into a line item object ───────────────────
function parseInvEntry(inv) {
  const batches = getBatchAllocations(inv);
  const batchItems = batches.map(b => ({
    batch_name: getXmlVal(b, 'BATCHNAME'),
    godown: getXmlVal(b, 'GODOWNNAME'),
    dest_godown: getXmlVal(b, 'DESTINATIONGODOWNNAME'),
    qty: parseQty(getXmlVal(b, 'ACTUALQTY') || getXmlVal(b, 'BILLEDQTY')),
    rate: parseRate(getXmlVal(b, 'RATE')),
    amount: parseNum(getXmlVal(b, 'AMOUNT'))
  }));
  return {
    stock_item: getXmlVal(inv, 'STOCKITEMNAME'),
    qty: parseQty(getXmlVal(inv, 'ACTUALQTY') || getXmlVal(inv, 'BILLEDQTY')),
    billed_qty: parseQty(getXmlVal(inv, 'BILLEDQTY')),
    rate: parseRate(getXmlVal(inv, 'RATE')),
    amount: parseNum(getXmlVal(inv, 'AMOUNT')),
    hsn: getXmlVal(inv, 'GSTHSNNAME') || getXmlVal(inv, 'HSNCODE'),
    godown: getXmlVal(inv, 'GODOWNNAME'),
    discount: parseNum(getXmlVal(inv, 'DISCOUNT')),
    batches: batchItems
  };
}

// ── Find the best design_no and godown from ALL batch allocations ────────────
function findBestBatch(allInvEntries) {
  let designNo = '', godown = '', millGodown = '';
  for (const inv of allInvEntries) {
    const parsed = typeof inv === 'string' ? parseInvEntry(inv) : inv;
    for (const b of (parsed.batches || [])) {
      if (b.batch_name && b.batch_name !== 'Primary Batch' && !designNo) {
        designNo = b.batch_name;
      }
      if (b.godown && b.godown !== 'Main Location' && !millGodown) {
        millGodown = b.godown;
      }
      if (b.godown && !godown) {
        godown = b.godown;
      }
    }
  }
  return { designNo, godown, millGodown };
}

// ── Count total taka/pcs from batch allocations ─────────────────────────────
function countTakaPcs(invEntries) {
  let total = 0;
  for (const inv of invEntries) {
    const batches = getBatchAllocations(inv);
    total += batches.length;
  }
  return total || null;
}

// ── Main Voucher Parser ───────────────────────────────────────────────────────
function parseVoucher(vxml) {
  const attrM = vxml.match(/\bVCHTYPE="([^"]+)"/i);
  const vtype = (attrM ? attrM[1] : getXmlVal(vxml, 'VOUCHERTYPENAME')).trim();
  const vnum = getXmlVal(vxml, 'VOUCHERNUMBER');
  const date = parseTallyDate(getXmlVal(vxml,'EFFECTIVEDATE') || getXmlVal(vxml,'DATE'));
  const effectiveDate = parseTallyDate(getXmlVal(vxml,'EFFECTIVEDATE'));
  const party = getXmlVal(vxml, 'PARTYLEDGERNAME') || getXmlVal(vxml, 'BASICBUYERNAME');
  const partyGstin = getXmlVal(vxml, 'PARTYGSTIN') || getXmlVal(vxml, 'CONSIGNEEGSTIN');
  const stateName = getXmlVal(vxml, 'STATENAME');
  const placeOfSupply = getXmlVal(vxml, 'PLACEOFSUPPLY');
  const reference = getXmlVal(vxml, 'REFERENCE');
  const enteredBy = getXmlVal(vxml, 'ENTEREDBY');
  const irn = getXmlVal(vxml, 'IRN');
  const irnAckNo = getXmlVal(vxml, 'IRNACKNO');
  const transporter = getXmlVal(vxml, 'BASICSHIPPEDBY');
  const lrNumber = getXmlVal(vxml, 'BASICSHIPDOCUMENTNO');
  const destCity = getXmlVal(vxml, 'BASICFINALDESTINATION');
  const destGodown = getXmlVal(vxml, 'DESTINATIONGODOWN');
  const srcGodown = getXmlVal(vxml, 'VOUCHERSOURCEGODOWN') || getXmlVal(vxml, 'SOURCEGODOWN');
  const narration = getXmlVal(vxml, 'NARRATION');
  const voucherClass = getXmlVal(vxml, 'VOUCHERCLASSNAME');
  const ewayBillBlock = vxml.match(/<EWAYBILLDETAILS\.LIST[^>]*>([\s\S]*?)<\/EWAYBILLDETAILS\.LIST>/i);
  const ewayBillNo = ewayBillBlock ? getXmlVal(ewayBillBlock[1], 'BILLNUMBER') : '';

  const ledgers = getLedgerEntries(vxml);
  let totalAmount=0, igstAmount=0, cgstAmount=0, sgstAmount=0, roundOff=0;
  let brokerName='', commRate=0, commAmount=0, commAssValue=0, commNetRate=0;
  let creditDays='', billRefNo='', salesLedger='', purchaseLedger='';
  const ledgerItems = [];

  for (const le of ledgers) {
    const lname = getXmlVal(le, 'LEDGERNAME');
    const lamt = parseNum(getXmlVal(le, 'AMOUNT'));
    const isParty = getXmlVal(le, 'ISPARTYLEDGER').toUpperCase() === 'YES';
    ledgerItems.push({ name: lname, amount: lamt, is_party: isParty });
    const lnameUpper = lname.toUpperCase();
    if (isParty) {
      totalAmount = Math.abs(lamt);
      const bills = getBillAllocations(le);
      if (bills.length > 0) {
        const b = bills[0];
        brokerName = getUdfVal(b,'ERPBROKERNAME') || getXmlVal(b,'UDF:ERPBROKERNAME');
        commRate = parseNum(getUdfVal(b,'ERPCOMMRATE') || getXmlVal(b,'UDF:ERPCOMMRATE'));
        commAmount = parseNum(getUdfVal(b,'ERPCOMMAMOUNT') || getXmlVal(b,'UDF:ERPCOMMAMOUNT'));
        commAssValue = parseNum(getUdfVal(b,'ERPCOMMASSVALUE') || getXmlVal(b,'UDF:ERPCOMMASSVALUE'));
        commNetRate = parseNum(getUdfVal(b,'ERPCOMMNETRATE') || getXmlVal(b,'UDF:ERPCOMMNETRATE'));
        creditDays = getXmlVal(b, 'BILLCREDITPERIOD');
        billRefNo = getXmlVal(b, 'NAME');
      }
    } else if (lnameUpper.includes('IGST')) { igstAmount = Math.abs(lamt); }
    else if (lnameUpper.includes('CGST')) { cgstAmount = Math.abs(lamt); }
    else if (lnameUpper.includes('SGST')) { sgstAmount = Math.abs(lamt); }
    else if (lnameUpper.includes('ROUND')) { roundOff = lamt; }
    else if (lnameUpper.includes('SALES') && lnameUpper.includes('A/C')) { salesLedger = lname; }
    else if (lnameUpper === 'SALES A/C') { salesLedger = lname; }
    else if (lnameUpper.includes('GREY') || lnameUpper.includes('PURCHASE')) { purchaseLedger = lname; }
  }
  if (!brokerName) {
    brokerName = getUdfVal(vxml,'ERPBROKERNAME');
    commRate = commRate || parseNum(getUdfVal(vxml,'ERPCOMMRATE'));
    commAmount = commAmount || parseNum(getUdfVal(vxml,'ERPCOMMAMOUNT'));
    commAssValue = commAssValue || parseNum(getUdfVal(vxml,'ERPCOMMASSVALUE'));
    commNetRate = commNetRate || parseNum(getUdfVal(vxml,'ERPCOMMNETRATE'));
  }

  return {
    vtype, vnum, date, effectiveDate, party, partyGstin, stateName, placeOfSupply,
    reference, enteredBy, irn, irnAckNo, transporter, lrNumber,
    destCity, destGodown, srcGodown, ewayBillNo, narration, voucherClass,
    totalAmount, igstAmount, cgstAmount, sgstAmount, roundOff,
    brokerName, commRate, commAmount, commAssValue, commNetRate,
    creditDays, billRefNo, salesLedger, purchaseLedger, ledgerItems,
    _vxml: vxml
  };
}

// ── Sales row builder ────────────────────────────────────────────────────────
// NOTE: comm_net_rate and party_name columns DO NOT exist in sales_bills — never send them
function buildSalesRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  const allItems = invEntries.map(parseInvEntry);
  const first = allItems[0] || {};
  const best = findBestBatch(invEntries);
  return {
    bill_number: v.vnum, bill_date: v.date,
    customer_name: v.party,
    customer_gstin: v.partyGstin||null, customer_state: v.stateName||null,
    place_of_supply: v.placeOfSupply||null,
    total_amount: v.totalAmount||null, taxable_value: Math.abs(first.amount)||null,
    fabric_name: first.stock_item||null, rate_per_mtr: first.rate||null,
    quantity_mtrs: first.qty||null, hsn_code: first.hsn||null,
    design_no: best.designNo||null, batch_name: (first.batches&&first.batches[0]?.batch_name)||null,
    godown: best.godown||null,
    igst_amount: v.igstAmount||null, cgst_amount: v.cgstAmount||null, sgst_amount: v.sgstAmount||null,
    broker_name: v.brokerName||null, comm_rate: v.commRate||null,
    comm_amount: v.commAmount||null, comm_assessed_value: v.commAssValue||null,
    credit_days: v.creditDays||null,
    bill_ref_number: v.billRefNo||null, transporter_name: v.transporter||null,
    lr_number: v.lrNumber||null, destination_city: v.destCity||null,
    eway_bill_no: v.ewayBillNo||null, irn: v.irn||null, irn_ack_no: v.irnAckNo||null,
    entered_by: v.enteredBy||null, tally_voucher_no: v.vnum||null,
    narration: v.narration||null,
    sales_ledger: v.salesLedger||null,
    round_off: v.roundOff||null,
    effective_date: v.effectiveDate||null,
    voucher_class: v.voucherClass||null,
    total_taka_pcs: countTakaPcs(invEntries),
    line_items: null,
    tally_sync_status: 'synced', tally_synced_at: new Date().toISOString()
  };
}

// ── Purchase row builder ─────────────────────────────────────────────────────
function buildPurchaseRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  const allItems = invEntries.map(parseInvEntry);
  const first = allItems[0] || {};
  const best = findBestBatch(invEntries);
  return {
    bill_number: v.vnum, bill_date: v.date,
    supplier_name: v.party, party_name: v.party,
    supplier_gstin: v.partyGstin||null, supplier_state: v.stateName||null,
    supplier_invoice_no: v.reference||null,
    total_amount: v.totalAmount||null, taxable_value: Math.abs(first.amount)||null,
    fabric_name: first.stock_item||null, fabric_type: null, rate_per_mtr: first.rate||null,
    quantity_mtrs: first.qty||null, hsn_code: first.hsn||null,
    design_no: best.designNo||null, batch_name: (first.batches&&first.batches[0]?.batch_name)||null,
    godown: best.godown||null,
    discount_pct: first.discount||null,
    igst_amount: v.igstAmount||null, cgst_amount: v.cgstAmount||null, sgst_amount: v.sgstAmount||null,
    broker_name: v.brokerName||null, comm_rate: v.commRate||null,
    credit_days: v.creditDays||null, lr_number: v.lrNumber||null,
    destination_city: v.destCity||null, entered_by: v.enteredBy||null,
    tally_voucher_no: v.vnum||null,
    narration: v.narration||null,
    purchase_ledger: v.purchaseLedger||null,
    round_off: v.roundOff||null,
    billed_qty: first.billed_qty||null,
    transporter_name: v.transporter||null,
    total_taka_pcs: countTakaPcs(invEntries),
    line_items: { inventory: allItems, ledgers: v.ledgerItems },
    tally_sync_status: 'synced', tally_synced_at: new Date().toISOString()
  };
}

// ── Process issue/receipt row builder ───────────────────────────────────────
// NOTE: debug log lines removed — they were logging 2000+ chars per REC FROM MILL voucher
function buildProcessRow(v) {
  const isReceipt = v.vtype === 'REC FROM MILL';
  const outEntries = getBlocks(v._vxml, 'INVENTORYENTRIESOUT\\.LIST');
  const inEntries = getBlocks(v._vxml, 'INVENTORYENTRIESIN\\.LIST');
  const rawEntries = isReceipt ? inEntries : outEntries;
  const allItems = rawEntries.map(parseInvEntry);
  const first = allItems[0] || {};
  const best = findBestBatch(rawEntries);

  let consumptionItems = [];
  let consumptionQty = 0, consumptionRate = 0, consumptionAmount = 0;
  let greyFabricName = null;
  if (isReceipt && outEntries.length > 0) {
    consumptionItems = outEntries.map(parseInvEntry);
    const cFirst = consumptionItems[0] || {};
    consumptionQty = cFirst.qty || 0;
    consumptionRate = cFirst.rate || 0;
    consumptionAmount = Math.abs(cFirst.amount || 0);
    greyFabricName = cFirst.stock_item || null;
  }

  let workerName = v.party || null;
  if (!workerName && best.millGodown) workerName = best.millGodown;
  if (!workerName) {
    for (const inv of rawEntries) {
      const gn = getXmlVal(inv, 'GODOWNNAME');
      if (gn && gn !== 'Main Location') { workerName = gn; break; }
    }
  }
  if (!workerName && isReceipt) {
    const consBest = findBestBatch(outEntries);
    if (consBest.millGodown) workerName = consBest.millGodown;
  }

  const designNo = best.designNo || (first.batches&&first.batches[0]?.batch_name) || null;
  let finishedDesignNo = null;
  if (isReceipt && inEntries.length > 0) {
    const prodBest = findBestBatch(inEntries);
    finishedDesignNo = prodBest.designNo || null;
  }

  let shortageMtrs = null, shortagePct = null;
  if (isReceipt && consumptionQty > 0) {
    const receivedQty = first.qty || 0;
    shortageMtrs = parseFloat((consumptionQty - receivedQty).toFixed(2));
    shortagePct = parseFloat(((shortageMtrs / consumptionQty) * 100).toFixed(2));
  }

  let lotNo = null;
  if (isReceipt && consumptionItems.length > 0 && consumptionItems[0].batches?.length > 0) {
    lotNo = consumptionItems[0].batches[0].batch_name || null;
  } else if (!isReceipt && first.batches?.length > 0) {
    lotNo = first.batches[0].batch_name || null;
  }

  return {
    voucher_number: v.vnum,
    challan_no: isReceipt ? lotNo : v.vnum, 
    issue_date: v.date,
    worker_name: workerName,
    party_name: v.party||null,
    process_type: isReceipt ? 'received' : 'issued',
    status: isReceipt ? 'received' : 'pending',
    grey_fabric_name: isReceipt ? greyFabricName : (first.stock_item||null),
    finished_fabric_name: isReceipt ? (first.stock_item||null) : null,
    metres_issued: isReceipt ? consumptionQty : (first.qty||0),
    metres_received: isReceipt ? (first.qty||0) : 0,
    job_rate: first.rate||0,
    job_amount: Math.abs(first.amount||0),
    mill_godown: best.millGodown || v.destGodown || null,
    source_godown: v.srcGodown || null,
    design_no: designNo,
    batch_name: (first.batches&&first.batches[0]?.batch_name)||null,
    godown: best.godown || null,
    fabric_sku: v.narration || null,
    party_ch_no: v.reference||null,
    narration: v.narration||null,
    lot_no: lotNo,
    shortage_mtrs: shortageMtrs,
    shortage_pct: shortagePct,
    finished_design_no: finishedDesignNo,
    consumption_rate: isReceipt ? consumptionRate : null,
    consumption_amount: isReceipt ? consumptionAmount : null,
    production_rate: isReceipt ? (first.rate||0) : null,
    production_amount: isReceipt ? Math.abs(first.amount||0) : null,
    our_godown: v.destGodown||'Main Location',
    job_godown: best.millGodown||null,
    total_taka_pcs: countTakaPcs(rawEntries),
    supplier_bill_no: null,
    purchase_voucher_no: !isReceipt ? lotNo : null,
    mill_process_bill_no: isReceipt ? (v.reference || null) : null,
    line_items: { inventory: allItems, consumption: isReceipt ? consumptionItems : undefined },
    tally_synced_at: new Date().toISOString()
  };
}

// ── Receipt/Payment row builder (v23 — FIXED amount extraction) ──────────────
// ROOT CAUSE of amount=null: Tally TDL Receipt/Payment vouchers do NOT set ISPARTYLEDGER=YES
// on the customer/supplier ledger. So v.totalAmount is always 0.
// FIX: extract amount from the bank/cash ledger (which IS reliably present and has the correct amount)
// Fallback: use the largest absolute ledger amount if no bank ledger found.
function buildReceiptPaymentRow(v) {
  const ledgers = getLedgerEntries(v._vxml);
  const BANK_KEYWORDS = ['BANK','HDFC','ICICI','AXIS','SBI','KOTAK','CASH','CHEQUE',
                         'CANARA','YES BANK','BOB','UNION','PNB','IDBI','INDUS'];
  let bankLedger = '', bankAmt = 0, billRef = '', billAmount = 0;
  let maxLedgerAmt = 0;

  for (const le of ledgers) {
    const lname = getXmlVal(le, 'LEDGERNAME');
    const lnameU = lname.toUpperCase();
    const lamt = parseNum(getXmlVal(le, 'AMOUNT'));
    const absAmt = Math.abs(lamt);
    const isParty = getXmlVal(le, 'ISPARTYLEDGER').toUpperCase() === 'YES';

    // Track max ledger amount as ultimate fallback
    if (absAmt > maxLedgerAmt) maxLedgerAmt = absAmt;

    // Detect bank/cash ledger — this carries the transaction amount
    if (BANK_KEYWORDS.some(k => lnameU.includes(k))) {
      if (!bankLedger || absAmt > bankAmt) {
        bankLedger = lname;
        bankAmt = absAmt;
      }
    }

    // Bill reference — from party ledger bill allocations
    // Check both isParty=YES AND any ledger with bill allocations (TDL may not set isParty)
    const bills = getBillAllocations(le);
    if (bills.length > 0 && !billRef) {
      billRef = getXmlVal(bills[0], 'NAME');
      billAmount = Math.abs(parseNum(getXmlVal(bills[0], 'AMOUNT')));
    }
  }

  // Amount priority: 1) v.totalAmount (set when isParty=YES, rare for receipts)
  //                 2) bank ledger amount (most reliable for receipts/payments)
  //                 3) largest ledger amount (last resort)
  const finalAmount = v.totalAmount || bankAmt || maxLedgerAmt || null;

  return {
    voucher_number:    v.vnum,
    voucher_date:      v.date,
    voucher_type:      v.vtype,
    party_name:        v.party          || null,
    amount:            finalAmount,
    bank_ledger:       bankLedger       || null,
    narration:         v.narration      || null,
    bill_ref:          billRef          || null,
    bill_amount:       billAmount       || null,
    broker_name:       v.brokerName     || null,
    entered_by:        v.enteredBy      || null,
    tally_sync_status: 'synced',
    tally_synced_at:   new Date().toISOString()
  };
}


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
  if (isTrulyBadResponse(body)) return res.status(400).json({ error: 'Empty or cached Tally response' });

  const vBlocks = parseAllVouchers(body);
  const parsedVouchers = vBlocks.map(parseVoucher);

  const salesV    = parsedVouchers.filter(v => v.vtype === 'Sales' && v.date && v.vnum);
  const purchaseV = parsedVouchers.filter(v => v.vtype === 'Purchase' && v.date && v.vnum);
  const jobworkTypes = ['Issue to Mill', 'REC FROM MILL', 'Material Out', 'Material In', 'Job Work Out Order', 'Job Work In Order', 'Job Work In', 'Job Work Out'];
  const processV  = parsedVouchers.filter(v => jobworkTypes.includes(v.vtype) && v.date);
  // Receipt, Payment, Journal, Credit Note, Contra → receipt_payments table
  const receiptPaymentTypes = ['Receipt', 'Payment', 'Credit Note', 'Debit Note', 'Journal', 'Contra'];
  const receiptPaymentV = parsedVouchers.filter(v => receiptPaymentTypes.includes(v.vtype) && v.date && v.vnum);
  // Remaining unknowns → tally_vouchers
  const knownTypes = new Set(['Sales', 'Purchase', ...jobworkTypes, ...receiptPaymentTypes]);
  const otherV    = parsedVouchers.filter(v => !knownTypes.has(v.vtype) && v.date && v.vnum);

  const results = { sales: 0, purchase: 0, process: 0, receipt_payments: 0, others: 0, errors: [] };

  if (salesV.length > 0) {
    const rows = salesV.map(buildSalesRow);
    const { error } = await supabase.from('sales_bills').upsert(rows, { onConflict: 'bill_number' });
    if (error) results.errors.push(`Sales error: ${error.message}`);
    else results.sales = rows.length;
  }

  if (purchaseV.length > 0) {
    const rows = purchaseV.map(buildPurchaseRow);
    const { error } = await supabase.from('purchase_bills').upsert(rows, { onConflict: 'bill_number' });
    if (error) results.errors.push(`Purchase error: ${error.message}`);
    else results.purchase = rows.length;
  }

  if (processV.length > 0) {
    const rows = processV.map(buildProcessRow);
    const { error } = await supabase.from('process_issues').upsert(rows, { onConflict: 'voucher_number' });
    if (error) results.errors.push(`Process error: ${error.message}`);
    else results.process = rows.length;
  }

  // NEW: Receipt/Payment sync for real outstanding tracking
  if (receiptPaymentV.length > 0) {
    const rows = receiptPaymentV.map(buildReceiptPaymentRow);
    const { error } = await supabase.from('receipt_payments').upsert(rows, { onConflict: 'voucher_number' });
    if (error) results.errors.push(`Receipt/Payment error: ${error.message}`);
    else results.receipt_payments = rows.length;
  }

  if (otherV.length > 0) {
    const rows = otherV.map(v => ({
      voucher_number: v.vnum,
      voucher_type: v.vtype,
      voucher_date: v.date,
      party_name: v.party,
      amount: v.totalAmount,
      broker_name: v.brokerName,
      comm_rate: v.commRate,
      comm_amount: v.commAmount,
      narration: v.narration,
      tally_sync_status: 'synced',
      tally_synced_at: new Date().toISOString()
    }));
    const { error } = await supabase.from('tally_vouchers').upsert(rows, { onConflict: 'voucher_number' });
    if (error) results.errors.push(`Other Vouchers error: ${error.message}`);
    else results.others = rows.length;
  }

  res.status(200).json({
    status: 'success',
    success: results.errors.length === 0,
    records_synced: results.sales + results.purchase + results.process + results.receipt_payments + results.others,
    synced: results
  });
}
