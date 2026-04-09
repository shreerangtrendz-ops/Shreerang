// N8N_CODE_v26.js — 03-Apr-2026
// NEW vs v25:
//   + buildAccountingVoucherRow: reads allledgerentries (not just ledgerentries)
//     captures EVERY bank field, ALL bill allocations with UDF broker fields
//   + buildReceiptPaymentLines: new function creates per-bill rows in receipt_payment_lines
//     captures: broker_name, comm_rate, comm_amount, comm_ass_value, comm_net_rate,
//     credit_period, instrument_no, urn, transfer_mode, bank_ledger, payment_mode
//   + S_AV_LINES: new upsert for receipt_payment_lines (Receipt,Payment,Journal,Contra)
//   + receipt_payments: now stores bill_allocations JSONB + all bank fields
//   + ledger_entries stored as full JSONB in accounting_vouchers.ledger_entries
//   + total_lines and multi_bill flags
// ════════════════════════════════════════════════════════
// KEY BUSINESS RULE (per Shrikumar 01-Apr-2026):
//   Tally Voucher Number = OPTIONAL/INTERNAL — not the business key
//   REAL unique keys per voucher type:
//     Purchase      → reference  = supplier invoice no  (e.g. "19/24-25")
//     Issue to Mill → reference  = issue challan no     (e.g. "927/25-26") — same as lot_no batchname
//     REC FROM MILL → reference  = jobworker GP/challan (e.g. "4228")
//     Sales         → reference  = sales bill no        (e.g. "SRTPL/1297/25-26")
//     Credit Note   → vouchernumber = "Cn550" (meaningful), reference = original sales bill
//     Debit Note    → vouchernumber = "D.N115" (meaningful), reference = original purchase
//     Jobwork       → reference  = mill invoice no      (e.g. "30282/25-26")
//     Payment/Receipt/Journal/Contra → vouchernumber + vouchertype (unique combo)
//
// NEW vs v24:
//   + issue_to_mill table (Issue to Mill vouchers with lot_no as key)
//   + grey_purchase table (Purchase vouchers with supplier_invoice_no as key)
//   + credit_note + credit_note_items tables
//   + debit_note table
//   + jobwork_expenses table (Jobwork + Expenses voucher types)
//   + accounting_vouchers table (Payment/Receipt/Journal/Contra with bill_allocations JSONB)
//   + cleanDesignNo handles both "D No.4784" and "D No-5349" formats
//   + parseTallyDate handles "17-1-2026" format (numeric day-month, no zero padding)
//   + sales_bills: uses reference field as bill_number (the real SRTPL/XXXX/YY-YY)
//   + purchase_bills: uses reference field as supplier_invoice_no
// ════════════════════════════════════════════════════════

const TALLY_URL = 'http://172.19.0.1:9080';
const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';
const XFMT    = '$' + '$SysName:XML';
const COMPANY = 'ShreeRang Trendz Pvt. Ltd. - (from 1-Apr-2019)';
const log     = [];

// ─── Helpers ────────────────────────────────────────────────────────────────
function toISO(d)       { return d.toISOString().slice(0,10); }
function addDays(d,n)   { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function toTallyDate(d) { return d.toISOString().slice(0,10).replace(/-/g,''); }

function parseTallyDate(s) {
  if (!s) return null;
  s = s.toString().trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  const M={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const m1 = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m1) return `${m1[3]}-${M[m1[2]]||'01'}-${m1[1].padStart(2,'0')}`;
  const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;
  return null;
}

function getXmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return '';
  // Strip any nested XML tags — keep only direct text content
  return m[1].replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '').replace(/<[^>]+>/g, '').trim();
}
// cleanRef: strips embedded XML tags from a reference field value
// Tally sometimes embeds XML inside <REFERENCE>VALUE</OTHERDATE>...) 
// We want just the first text token before any < character
function cleanRef(val) {
  if (!val) return '';
  // Strip all XML tags first
  const stripped = val.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped) return '';
  // Find the first token that looks like a real reference (contains / or letters+digits)
  // Skip pure dates (8 digits), UUIDs, and plain keywords
  const tokens = stripped.split(/\s+/);
  for (const t of tokens) {
    if (!t) continue;
    if (/^\d{8}$/.test(t)) continue;          // skip Tally date tokens like 20220415
    if (/^[0-9a-f-]{36}$/i.test(t)) continue; // skip UUIDs
    if (t.length < 2) continue;
    return t;
  }
  return stripped.split(/\s+/)[0] || '';
}
function parseQty(s)  { if (!s) return 0; return parseFloat(s.replace(/mtrs?/gi,'').replace(/nos?/gi,'').trim()) || 0; }
function parseRate(s) { if (!s) return 0; return parseFloat(s.replace(/\/mtrs?/gi,'').replace(/\/nos?/gi,'').trim()) || 0; }
function parseNum(s)  { if (!s) return 0; const n=parseFloat(s.replace(/,/g,'').trim()); return isFinite(n)?n:0; }
// decodeHtml: Tally XML encodes " as &quot;, & as &amp; etc — decode before storing
function decodeHtml(s) {
  if (!s) return s;
  return s.replace(/&quot;/g,'"').replace(/&#34;/g,'"').replace(/&apos;/g,"'")
           .replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function sanitizeRow(row) {
  // Deep sanitize: replace NaN/Infinity/undefined with null at all levels
  return JSON.parse(JSON.stringify(row, (_k, v) => {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (v === undefined) return null;
    return v;
  }));
}

function getUdfVal(xml, udfName) {
  const re = new RegExp(`<UDF:${udfName}(?:\\.LIST)?[^>]*>[\\s\\S]*?<ALTEREDVALUE>([^<]+)<\\/ALTEREDVALUE>`, 'i');
  const m = xml.match(re); if (m) return m[1].trim();
  const re2 = new RegExp(`<UDF:${udfName}[^>]*>([^<]+)<\\/UDF:${udfName}>`, 'i');
  const m2 = xml.match(re2); if (m2) return m2[1].trim();
  return '';
}

function cleanDesignNo(s) {
  if (!s) return null;
  const c = s.replace(/^D\s*No[.\-]?\s*/i, '').trim();
  return c || null;
}

function getBlocks(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out = []; let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}
const getLedgerEntries      = v => getBlocks(v, 'LEDGERENTRIES\\.LIST');
const getAllLedgerEntries    = v => getBlocks(v, 'ALLLEDGERENTRIES\\.LIST');
const getInventoryEntries   = v => getBlocks(v, 'ALLINVENTORYENTRIES\\.LIST');
const getBillAllocations    = v => getBlocks(v, 'BILLALLOCATIONS\\.LIST');
const getBatchAllocations   = v => getBlocks(v, 'BATCHALLOCATIONS\\.LIST');
const getBankAllocations    = v => getBlocks(v, 'BANKALLOCATIONS\\.LIST');

function parseAllVouchers(xml) {
  const re = /<VOUCHER\b[^>]*>[\s\S]*?<\/VOUCHER>/gi;
  const out = []; let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[0].includes('REMOTECMPINFO') || m[0].includes('REMOTECMPNAME')) continue;
    out.push(m[0]);
  }
  return out;
}

function parseInvEntry(inv) {
  const batches = getBatchAllocations(inv).map(b => ({
    batch_name:     getXmlVal(b,'BATCHNAME'),
    godown:         getXmlVal(b,'GODOWNNAME'),
    dest_godown:    getXmlVal(b,'DESTINATIONGODOWNNAME'),
    qty:            parseQty(getXmlVal(b,'ACTUALQTY') || getXmlVal(b,'BILLEDQTY')),
    rate:           parseRate(getXmlVal(b,'RATE')),
    amount:         parseNum(getXmlVal(b,'AMOUNT')),
    taka_abc:       getUdfVal(b,'BATCHITMTAKA'),
    taka_no:        getUdfVal(b,'BATCHITMTAKANO'),
    track_party:    getUdfVal(b,'TRACKREFPARTY'),
    track_date:     parseTallyDate(getUdfVal(b,'TRACKREFDATE')),
    track_ref_no:   getUdfVal(b,'TRACKREFNO'),
    process_lot_no: getUdfVal(b,'PROCESSLOTNO'),
    process_mill:   getUdfVal(b,'PROCESSMILLNAME'),
  }));
  return {
    stock_item: decodeHtml(getXmlVal(inv,'STOCKITEMNAME')),
    qty:        parseQty(getXmlVal(inv,'ACTUALQTY') || getXmlVal(inv,'BILLEDQTY')),
    billed_qty: parseQty(getXmlVal(inv,'BILLEDQTY')),
    rate:       parseRate(getXmlVal(inv,'RATE')),
    amount:     parseNum(getXmlVal(inv,'AMOUNT')),
    hsn:        getXmlVal(inv,'GSTHSNNAME') || getXmlVal(inv,'HSNCODE'),
    godown:     getXmlVal(inv,'GODOWNNAME'),
    discount:   parseNum(getXmlVal(inv,'DISCOUNT')),
    taka_pcs:   parseInt(getUdfVal(inv,'VCHTAKA') || '0') || 0,
    batches,
  };
}

function findBestBatch(invEntries) {
  let designNo = '', godown = '', millGodown = '';
  for (const inv of invEntries) {
    const parsed = typeof inv === 'string' ? parseInvEntry(inv) : inv;
    for (const b of (parsed.batches || [])) {
      if (b.batch_name && b.batch_name !== 'Primary Batch' && !designNo) designNo = b.batch_name;
      if (b.godown && b.godown !== 'Main Location' && !millGodown) millGodown = b.godown;
      if (b.godown && !godown) godown = b.godown;
    }
  }
  return { designNo, godown, millGodown };
}

function countTakaPcs(invEntries) {
  let t = 0;
  for (const inv of invEntries) t += getBatchAllocations(inv).length;
  return t || null;
}

function parseVoucher(vxml) {
  const attrM = vxml.match(/\bVCHTYPE="([^"]+)"/i);
  const vtype = (attrM ? attrM[1] : getXmlVal(vxml,'VOUCHERTYPENAME')).trim();
  const vnum       = getXmlVal(vxml,'VOUCHERNUMBER');
  const reference  = cleanRef(getXmlVal(vxml,'REFERENCE'));
  const date       = parseTallyDate(getXmlVal(vxml,'EFFECTIVEDATE') || getXmlVal(vxml,'DATE'));
  const party      = getXmlVal(vxml,'PARTYLEDGERNAME') || getXmlVal(vxml,'BASICBUYERNAME');
  const partyGstin = getXmlVal(vxml,'PARTYGSTIN') || getXmlVal(vxml,'CONSIGNEEGSTIN');
  const stateName  = getXmlVal(vxml,'STATENAME');
  const placeOfSupply = getXmlVal(vxml,'PLACEOFSUPPLY');
  const refDate    = parseTallyDate(getXmlVal(vxml,'REFERENCEDATE'));
  const enteredBy  = getXmlVal(vxml,'ENTEREDBY');
  const irn        = getXmlVal(vxml,'IRN');
  const irnAckDate = parseTallyDate(getXmlVal(vxml,'IRNACKDATE'));
  const transporter = getXmlVal(vxml,'BASICSHIPPEDBY');
  const lrNumber   = getXmlVal(vxml,'BASICSHIPDOCUMENTNO');
  const destCity   = getXmlVal(vxml,'BASICFINALDESTINATION');
  const destGodown = getXmlVal(vxml,'DESTINATIONGODOWN');
  const srcGodown  = getXmlVal(vxml,'VOUCHERSOURCEGODOWN') || getXmlVal(vxml,'SOURCEGODOWN');
  const narration  = getXmlVal(vxml,'NARRATION');
  const voucherClass = getXmlVal(vxml,'VOUCHERCLASSNAME');
  const gstRegType = getXmlVal(vxml,'GSTREGISTRATIONTYPE');
  const natureOfReturn = getXmlVal(vxml,'GSTNATUREOFRETURN');
  const guid = getXmlVal(vxml,'GUID');
  const ewayBlock  = vxml.match(/<EWAYBILLDETAILS\.LIST[^>]*>([\s\S]*?)<\/EWAYBILLDETAILS\.LIST>/i);
  const ewayBillNo = ewayBlock ? getXmlVal(ewayBlock[1],'BILLNUMBER') : '';

  const ledgers = getLedgerEntries(vxml);
  const allLedgers = getAllLedgerEntries(vxml);
  let totalAmount=0, igstAmount=0, cgstAmount=0, sgstAmount=0, roundOff=0;
  let brokerName='', commRate=0, commAmount=0, commAssValue=0, commNetRate=0;
  let creditDays='', billRefNo='', salesLedger='', purchaseLedger='';
  let discountAmount=0, expenseLedger='', expenseAmount=0, tdsAmount=0;
  const ledgerItems = [];

  for (const le of ledgers) {
    const lname  = getXmlVal(le,'LEDGERNAME');
    const lamt   = parseNum(getXmlVal(le,'AMOUNT'));
    const isParty = getXmlVal(le,'ISPARTYLEDGER').toUpperCase() === 'YES';
    ledgerItems.push({name:lname, amount:lamt, is_party:isParty});
    const lU = lname.toUpperCase();
    if (isParty) {
      totalAmount = Math.abs(lamt);
      const bills = getBillAllocations(le);
      if (bills.length > 0) {
        const b = bills[0];
        brokerName   = getUdfVal(b,'ERPBROKERNAME')  || getXmlVal(b,'UDF:ERPBROKERNAME');
        commRate     = parseNum(getUdfVal(b,'ERPCOMMRATE')     || getXmlVal(b,'UDF:ERPCOMMRATE'));
        commAmount   = parseNum(getUdfVal(b,'ERPCOMMAMOUNT')   || getXmlVal(b,'UDF:ERPCOMMAMOUNT'));
        commAssValue = parseNum(getUdfVal(b,'ERPCOMMASSVALUE') || getXmlVal(b,'UDF:ERPCOMMASSVALUE'));
        commNetRate  = parseNum(getUdfVal(b,'ERPCOMMNETRATE')  || getXmlVal(b,'UDF:ERPCOMMNETRATE'));
        creditDays   = getXmlVal(b,'BILLCREDITPERIOD');
        billRefNo    = getXmlVal(b,'NAME');
      }
    } else if (lU.includes('IGST'))   { igstAmount = Math.abs(lamt); }
    else if (lU.includes('CGST'))     { cgstAmount = Math.abs(lamt); }
    else if (lU.includes('SGST'))     { sgstAmount = Math.abs(lamt); }
    else if (lU.includes('ROUND'))    { roundOff = lamt; }
    else if (lU.includes('DISCOUNT')) { discountAmount = Math.abs(lamt); }
    else if (lU.match(/TDS|TAX DEDUCTED/)) { tdsAmount = Math.abs(lamt); }
    else if (lU.includes('SALES') || lU === 'SALES A/C') { salesLedger = lname; }
    else if (lU.includes('GREY') || lU.includes('PURCHASE')) { purchaseLedger = lname; }
    else if (!isParty && !lU.match(/GST|CGST|SGST|IGST|ROUND|DISCOUNT|TDS|TAX DEDUCTED|SALES/)) {
      if (!expenseLedger) { expenseLedger = lname; expenseAmount = Math.abs(lamt); }
    }
  }
  if (!brokerName) {
    brokerName   = getUdfVal(vxml,'ERPBROKERNAME');
    commRate     = commRate     || parseNum(getUdfVal(vxml,'ERPCOMMRATE'));
    commAmount   = commAmount   || parseNum(getUdfVal(vxml,'ERPCOMMAMOUNT'));
    commAssValue = commAssValue || parseNum(getUdfVal(vxml,'ERPCOMMASSVALUE'));
    commNetRate  = commNetRate  || parseNum(getUdfVal(vxml,'ERPCOMMNETRATE'));
  }

  return {
    vtype, vnum, reference, refDate,
    date, party, partyGstin, stateName, placeOfSupply,
    enteredBy, irn, irnAckDate, transporter, lrNumber,
    destCity, destGodown, srcGodown, ewayBillNo, narration, voucherClass,
    gstRegType, natureOfReturn, guid,
    totalAmount, igstAmount, cgstAmount, sgstAmount, roundOff,
    discountAmount, expenseLedger, expenseAmount, tdsAmount,
    brokerName, commRate, commAmount, commAssValue, commNetRate,
    creditDays, billRefNo, salesLedger, purchaseLedger, ledgerItems, allLedgers,
    _vxml: vxml
  };
}

// ─── ROW BUILDERS ────────────────────────────────────────────────────────────

function extractLineItems(v) {
  const outEntries = getBlocks(v._vxml, 'INVENTORYENTRIESOUT\\.LIST');
  const invEntries = outEntries.length > 0 ? outEntries : getBlocks(v._vxml, 'ALLINVENTORYENTRIES\\.LIST');
  const allItems = invEntries.map(parseInvEntry);
  const lines = [];
  for (const item of allItems) {
    if (item.batches && item.batches.length > 0) {
      for (const b of item.batches) {
        lines.push({
          design_no: cleanDesignNo(b.batch_name),
          batch_name: b.batch_name,
          item_name: item.stock_item,
          hsn_code: item.hsn,
          godown: b.godown || item.godown,
          qty_mtrs: b.qty,
          rate: b.rate || item.rate,
          discount_pct: item.discount || 0,
          item_amount: Math.abs(b.amount)
        });
      }
    } else {
      lines.push({
        design_no: cleanDesignNo(item.stock_item),
        batch_name: null,
        item_name: item.stock_item,
        hsn_code: item.hsn,
        godown: item.godown,
        qty_mtrs: item.qty,
        rate: item.rate,
        discount_pct: item.discount || 0,
        item_amount: Math.abs(item.amount)
      });
    }
  }
  return lines.length > 0 ? lines : null;
}

function extractAllDesignNos(v) {
  const outEntries = getBlocks(v._vxml, 'INVENTORYENTRIESOUT\\.LIST');
  const allItems = outEntries.length > 0 ? outEntries.map(parseInvEntry) : getInventoryEntries(v._vxml).map(parseInvEntry);
  const designs = [];
  for (const item of allItems) {
    if (item.batches && item.batches.length > 0) {
      for (const b of item.batches) {
        const dNo = cleanDesignNo(b.batch_name);
        if (dNo && dNo !== 'Primary Batch' && !designs.includes(dNo)) {
          designs.push(dNo);
        }
      }
    } else {
      const dNo = cleanDesignNo(item.stock_item);
      if (dNo && !designs.includes(dNo)) designs.push(dNo);
    }
  }
  return designs.length > 0 ? JSON.stringify(designs) : null;
}

function buildSalesRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  const allItems   = invEntries.map(parseInvEntry);
  const first      = allItems[0] || {};
  const best       = findBestBatch(invEntries);
  return {
    bill_number:      v.reference || v.vnum,
    bill_date:        v.date,
    customer_name:    v.party,
    customer_gstin:   v.partyGstin   || null,
    customer_state:   v.stateName    || null,
    place_of_supply:  v.placeOfSupply|| null,
    total_amount:     v.totalAmount  || null,
    taxable_value:    Math.abs(first.amount) || null,
    fabric_name:      first.stock_item || null,
    rate_per_mtr:     first.rate       || null,
    quantity_mtrs:    first.qty        || null,
    hsn_code:         first.hsn        || null,
    design_no:        cleanDesignNo(best.designNo) || null,
    all_design_nos:   extractAllDesignNos(v) || null,
    line_items:       extractLineItems(v) || null,
    batch_name:       (first.batches&&first.batches[0]?.batch_name) || null,
    godown:           best.godown      || null,
    igst_amount:      v.igstAmount     || null,
    cgst_amount:      v.cgstAmount     || null,
    sgst_amount:      v.sgstAmount     || null,
    broker_name:      v.brokerName     || null,
    comm_rate:        v.commRate       || null,
    comm_amount:      v.commAmount     || null,
    comm_assessed_value: v.commAssValue || null,
    credit_days:      v.creditDays     || null,
    bill_ref_number:  v.billRefNo      || null,
    transporter_name: v.transporter    || null,
    lr_number:        v.lrNumber       || null,
    destination_city: v.destCity       || null,
    eway_bill_no:     v.ewayBillNo     || null,
    irn:              v.irn            || null,
    irn_ack_no:       v.irnAckDate     || null,
    entered_by:       v.enteredBy      || null,
    tally_voucher_no: v.vnum           || null,
    voucher_class:    v.voucherClass   || null,
    narration:        v.narration      || null,
    sales_ledger:     v.salesLedger    || null,
    round_off:        v.roundOff       || null,
    total_taka_pcs:   countTakaPcs(invEntries),
    tally_sync_status: 'synced',
    tally_synced_at:  new Date().toISOString()
  };
}

function buildPurchaseRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  const allItems   = invEntries.map(parseInvEntry);
  const first      = allItems[0] || {};
  const best       = findBestBatch(invEntries);
  const fb         = (first.batches && first.batches[0]) || {};
  return {
    bill_number:        v.vnum,
    supplier_invoice_no: v.reference || null,
    bill_date:          v.date,
    supplier_name:      v.party,
    party_name:         v.party,
    supplier_gstin:     v.partyGstin  || null,
    supplier_state:     v.stateName   || null,
    total_amount:       v.totalAmount || null,
    taxable_value:      Math.abs(first.amount) || null,
    fabric_name:        first.stock_item || null,
    rate_per_mtr:       first.rate       || null,
    quantity_mtrs:      first.qty        || null,
    hsn_code:           first.hsn        || null,
    design_no:          cleanDesignNo(best.designNo) || null,
    batch_name:         fb.batch_name    || null,
    godown:             best.godown      || null,
    discount_pct:       first.discount   || null,
    igst_amount:        v.igstAmount     || null,
    cgst_amount:        v.cgstAmount     || null,
    sgst_amount:        v.sgstAmount     || null,
    broker_name:        v.brokerName     || null,
    comm_rate:          v.commRate       || null,
    credit_days:        v.creditDays     || null,
    lr_number:          v.lrNumber       || null,
    destination_city:   v.destCity       || null,
    entered_by:         v.enteredBy      || null,
    tally_voucher_no:   v.vnum           || null,
    narration:          v.narration      || null,
    purchase_ledger:    v.purchaseLedger || null,
    tally_sync_status:  'synced',
    tally_synced_at:    new Date().toISOString()
  };
}

function buildGreyPurchaseRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  const entry = invEntries[0] ? parseInvEntry(invEntries[0]) : {};
  const batches = (entry.batches && entry.batches.length > 0) ? entry.batches : [{}];
  return batches.map(fb => ({
    supplier_invoice_no:   v.reference || v.vnum,
    tally_voucher_no:      v.vnum || null,
    voucher_date:          v.date,
    supplier_invoice_date: v.refDate   || null,
    supplier_name:         v.party,
    supplier_gstin:        v.partyGstin || null,
    broker_name:           v.brokerName || null,
    purchase_ledger:       v.purchaseLedger || null,
    process_lot_no:        fb.process_lot_no || null,
    process_mill_name:     fb.process_mill   || null,
    place_of_supply:       v.placeOfSupply   || null,
    narration:             v.narration       || null,
    item_name:             entry.stock_item  || null,
    hsn_code:              entry.hsn         || null,
    taka_pcs:              entry.taka_pcs    || 0,
    actual_qty_mtrs:       entry.qty         || 0,
    billed_qty_mtrs:       entry.billed_qty  || 0,
    rate:                  entry.rate        || 0,
    item_amount:           Math.abs(entry.amount) || 0,
    godown_name:           fb.godown         || null,
    lot_no:                fb.batch_name     || null,
    taka_abc:              fb.taka_abc       || null,
    taka_no:               fb.taka_no        || null,
    track_party:           fb.track_party    || null,
    track_date:            fb.track_date     || null,
    track_ref_no:          fb.track_ref_no   || null,
    comm_rate:             v.commRate        || 0,
    comm_amount:           v.commAmount      || 0,
    assessable_value:      v.commAssValue    || 0,
    net_rate:              v.commNetRate     || 0,
    cgst_amount:           v.cgstAmount      || 0,
    sgst_amount:           v.sgstAmount      || 0,
    igst_amount:           v.igstAmount      || 0,
    round_off:             v.roundOff        || 0,
    total_amount:          v.totalAmount     || 0,
    tally_synced_at:       new Date().toISOString()
  }));
}

function buildIssueToMillRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  const entry = invEntries[0] ? parseInvEntry(invEntries[0]) : {};
  const fb = (entry.batches && entry.batches[0]) || {};
  const lotNo = fb.batch_name || v.reference || v.vnum;
  return {
    lot_no:            lotNo,
    tally_voucher_no:  v.vnum       || null,
    voucher_date:      v.date,
    mill_name:         v.party,
    destination_godown: fb.godown   || null,
    narration:         v.narration  || null,
    item_name:         entry.stock_item || null,
    hsn_code:          entry.hsn    || null,
    taka_pcs:          entry.taka_pcs || 0,
    qty_mtrs:          entry.qty    || 0,
    rate:              entry.rate   || 0,
    amount:            Math.abs(entry.amount) || 0,
    godown_name:       fb.godown    || null,
    taka_no:           fb.taka_no   || null,
    pcs:               parseInt(fb.taka_abc || '0') || 0,
    batch_qty_mtrs:    fb.qty       || 0,
    batch_amount:      Math.abs(fb.amount) || 0,
    track_party_name:  fb.track_party  || null,
    track_date:        fb.track_date   || null,
    track_ref_no:      fb.track_ref_no || null,
    tally_synced_at:   new Date().toISOString()
  };
}

// ─── Build mill_challan_takas rows from Issue to Mill batch allocations ───────
// Each batch allocation in Issue to Mill = one taka (roll) with its metres
function buildMillChallanTakaRows(v) {
  const invEntries = getInventoryEntries(v._vxml);
  if (!invEntries.length) return [];
  const entry = invEntries[0] ? parseInvEntry(invEntries[0]) : {};
  const lotNo = (entry.batches?.[0]?.batch_name) || v.reference || v.vnum;
  if (!lotNo) return [];

  const rows = [];
  let takaGroup = 'part1';
  let takaCount = 0;

  // Each batch allocation = one taka
  for (const inv of invEntries) {
    const batches = getBatchAllocations(inv);
    for (const b of batches) {
      const batchName = getXmlVal(b, 'BATCHNAME');
      const qty = parseQty(getXmlVal(b, 'ACTUALQTY') || getXmlVal(b, 'BILLEDQTY'));
      if (!qty || qty <= 0) continue;

      takaCount++;
      // Group by 12s (typical challan part structure)
      takaGroup = takaCount <= 12 ? 'part1' : takaCount <= 24 ? 'part2' : 'part3';

      rows.push({
        lot_no:            lotNo,
        taka_sr_no:        takaCount,
        taka_mtrs:         qty,
        taka_group:        takaGroup,
        issue_voucher_number: v.vnum || null,
        tally_synced_at:   new Date().toISOString(),
      });
    }
  }

  // If no batch-level data, create summary row from UDF taka count
  if (rows.length === 0 && entry.taka_pcs > 0 && entry.qty > 0) {
    const avgQty = parseFloat((entry.qty / entry.taka_pcs).toFixed(2));
    for (let i = 1; i <= entry.taka_pcs; i++) {
      rows.push({
        lot_no: lotNo, taka_sr_no: i, taka_mtrs: avgQty,
        taka_group: i <= 12 ? 'part1' : i <= 24 ? 'part2' : 'part3',
        issue_voucher_number: v.vnum || null,
        tally_synced_at: new Date().toISOString(),
      });
    }
  }
  return rows;
}

function buildProcessRow(v) {
  const isReceipt  = v.vtype === 'REC FROM MILL';
  const outEntries = getBlocks(v._vxml, 'INVENTORYENTRIESOUT\\.LIST');
  const inEntries  = getBlocks(v._vxml, 'INVENTORYENTRIESIN\\.LIST');
  const rawEntries = isReceipt ? inEntries : (outEntries.length ? outEntries : inEntries);
  const allItems   = rawEntries.map(parseInvEntry);
  const first      = allItems[0] || {};
  const best       = findBestBatch(rawEntries);
  let consumptionItems=[], consumptionQty=0, consumptionRate=0, consumptionAmount=0, greyFabricName=null;
  if (isReceipt && outEntries.length > 0) {
    consumptionItems = outEntries.map(parseInvEntry);
    const cF = consumptionItems[0] || {};
    consumptionQty=cF.qty||0; consumptionRate=cF.rate||0;
    consumptionAmount=Math.abs(cF.amount||0); greyFabricName=cF.stock_item||null;
  }
  let workerName = v.party || best.millGodown || null;
  let designNo = cleanDesignNo(best.designNo) || null;
  let finishedDesignNo = null;
  if (isReceipt) {
    for (const item of allItems) {
      for (const b of (item.batches||[])) {
        const dn = cleanDesignNo(b.batch_name);
        if (dn && dn!=='Primary Batch') { finishedDesignNo=dn; break; }
      }
      if (finishedDesignNo) break;
    }
    designNo = finishedDesignNo || designNo;
  }
  let lotNo = null;
  if (isReceipt && consumptionItems.length > 0) lotNo = consumptionItems[0].batches?.[0]?.batch_name || null;
  else if (!isReceipt && first.batches?.length > 0) lotNo = first.batches[0].batch_name || null;
  const shortageMtrs = isReceipt ? Math.max(0,consumptionQty-(first.qty||0)) : 0;
  const shortagePct  = isReceipt && consumptionQty>0 ? parseFloat(((shortageMtrs/consumptionQty)*100).toFixed(2)) : 0;
  const challanNo = isReceipt ? (v.reference || v.vnum) : (v.vnum || v.reference);
  return {
    challan_no: challanNo, issue_date: v.date,
    worker_name: workerName, party_name: v.party||null,
    process_type: isReceipt?'received':'issued',
    status: isReceipt?'received':'pending',
    grey_fabric_name: isReceipt?greyFabricName:(first.stock_item||null),
    finished_fabric_name: isReceipt?(first.stock_item||null):null,
    metres_issued: isReceipt?consumptionQty:(first.qty||0),
    metres_received: isReceipt?(first.qty||0):0,
    job_rate: first.rate||0, job_amount: Math.abs(first.amount||0),
    mill_godown: best.millGodown||v.destGodown||null,
    source_godown: v.srcGodown||null, design_no: designNo,
    batch_name: (first.batches&&first.batches[0]?.batch_name)||null,
    godown: best.godown||null, narration: v.narration||null,
    lot_no: lotNo, shortage_mtrs: shortageMtrs, shortage_pct: shortagePct,
    party_ch_no: v.reference||null, finished_design_no: finishedDesignNo,
    consumption_rate: isReceipt?consumptionRate:null,
    consumption_amount: isReceipt?consumptionAmount:null,
    production_rate: isReceipt?(first.rate||0):null,
    production_amount: isReceipt?Math.abs(first.amount||0):null,
    our_godown: v.destGodown||'Main Location', job_godown: best.millGodown||null,
    total_taka_pcs: countTakaPcs(rawEntries),
    tally_synced_at: new Date().toISOString()
  };
}

function buildRecFromMillRow(v) {
  const outEntries = getBlocks(v._vxml, 'INVENTORYENTRIESOUT\\.LIST');
  const inEntries  = getBlocks(v._vxml, 'INVENTORYENTRIESIN\\.LIST');

  // Build shared grey item info from OUT entries (consumption side)
  let greyItem = {};
  if (outEntries.length > 0) {
    const g = parseInvEntry(outEntries[0]);
    const gb = g.batches?.[0] || {};
    const jobRate   = parseNum(getUdfVal(outEntries[0],'JOBRATE')||getXmlVal(outEntries[0],'JOBRATE'))||0;
    const jobAmt    = parseNum(getUdfVal(outEntries[0],'JOBAMOUNT')||getXmlVal(outEntries[0],'JOBAMOUNT'))||0;
    let grossAmt    = parseNum(getUdfVal(outEntries[0],'GROSSAMT')||getXmlVal(outEntries[0],'GROSSAMT'))||0;
    const greyAmt   = Math.abs(g.amount)||0;
    if (!grossAmt && greyAmt && jobAmt) grossAmt = greyAmt + jobAmt;
    greyItem = {
      grey_item_name: g.stock_item||null, source_godown: gb.godown||g.godown||null,
      grey_lot_no: gb.batch_name||null, grey_issued_qty_mtrs: g.qty||0,
      grey_rate: g.rate||0, grey_amount: greyAmt,
      job_rate: jobRate, job_amount: jobAmt, gross_amount: grossAmt,
      short_qty_mtrs: parseNum(getUdfVal(outEntries[0],'SHORTQTY')||'0'),
    };
  }

  // Shared voucher-level UDF fields
  const shortageMtrsVch  = parseNum(getUdfVal(v._vxml,'SHORTMTR')||getXmlVal(v._vxml,'SHORTMTR')||'0');
  const shortagePctVch   = parseNum(getUdfVal(v._vxml,'SHORTPERC')||getXmlVal(v._vxml,'SHORTPERC')||'0');
  const issueChNo        = getUdfVal(v._vxml,'ISSUECHALLANNO')||getXmlVal(v._vxml,'ISSUECHALLANNO')||null;
  const jobGodown        = getUdfVal(v._vxml,'JOBGODOWN')||getXmlVal(v._vxml,'JOBGODOWN')||greyItem.source_godown||null;
  const weaverName       = getUdfVal(v._vxml,'WEAVERNAME')||getXmlVal(v._vxml,'WEAVERNAME')||null;
  const qualityName      = getUdfVal(v._vxml,'QUALITYNAME')||getXmlVal(v._vxml,'QUALITYNAME')||null;
  const vchLotNo         = cleanDesignNo(getUdfVal(v._vxml,'LOTNO')||getXmlVal(v._vxml,'BATCHNAME')||greyItem.grey_lot_no||'')||greyItem.grey_lot_no||null;

  // One row per IN entry (each IN entry = one design/lot received back from mill)
  const entries = inEntries.length > 0 ? inEntries : [null];
  return entries.map((inEntry, idx) => {
    let finishItem = {};
    let lotNo = vchLotNo;
    if (inEntry) {
      const f  = parseInvEntry(inEntry);
      const fb = f.batches?.[0] || {};
      const rawDN = getUdfVal(inEntry,'DESIGNNO')||getXmlVal(inEntry,'DESIGNNO')||fb.batch_name||'';
      // lot_no: prefer batch name from IN entry (= the design/run lot), fall back to voucher-level
      lotNo = cleanDesignNo(fb.batch_name||rawDN||'')||vchLotNo||(v.vnum + '_' + idx);
      finishItem = {
        finish_item_name: f.stock_item||null,
        dest_godown: fb.godown||fb.dest_godown||f.godown||'Main Location',
        design_no: cleanDesignNo(rawDN)||null,
        finish_qty_mtrs: f.qty||0, finish_rate: f.rate||0,
        finish_amount: Math.abs(f.amount)||0,
        issue_qty_mtrs: parseNum(getUdfVal(inEntry,'ISSUEDQTY')||'0')||greyItem.grey_issued_qty_mtrs||0,
      };
    }
    const shortageMtrs = shortageMtrsVch
      ||(greyItem.grey_issued_qty_mtrs&&finishItem.finish_qty_mtrs?Math.max(0,greyItem.grey_issued_qty_mtrs-finishItem.finish_qty_mtrs):0);
    const shortagePct  = shortagePctVch
      ||(shortageMtrs&&greyItem.grey_issued_qty_mtrs?parseFloat(((shortageMtrs/greyItem.grey_issued_qty_mtrs)*100).toFixed(2)):0);
    return {
      party_challan_no: v.reference || v.vnum,
      tally_voucher_no: v.vnum||null, voucher_date: v.date,
      mill_name: v.party || greyItem.grey_item_name?.match(/^(.+?)\s+\d/)?.[1] || null,
      lot_no: lotNo,
      issue_challan_no: issueChNo,
      job_godown: jobGodown, our_godown: v.destGodown||'Main Location',
      weaver_name: weaverName, quality_name: qualityName,
      shortage_mtrs: shortageMtrs, shortage_pct: shortagePct,
      narration: v.narration||null,
      ...greyItem, ...finishItem,
      grey_recd_qty_mtrs: finishItem.finish_qty_mtrs || greyItem.grey_issued_qty_mtrs || 0,
      tally_synced_at: new Date().toISOString()
    };
  });
}

function buildCreditNoteRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  const allItems   = invEntries.map(parseInvEntry);
  const header = {
    tally_voucher_no: v.vnum, voucher_date: v.date,
    party_name: v.party, party_gstin: v.partyGstin||null,
    place_of_supply: v.placeOfSupply||null, state_name: v.stateName||null,
    original_voucher_no: v.reference||null, original_bill_date: v.refDate||null,
    bill_ref: v.billRefNo||null, irn: v.irn||null, irn_ack_date: v.irnAckDate||null,
    entered_by: v.enteredBy||null, narration: v.narration||null,
    cgst_amount: v.cgstAmount||0, sgst_amount: v.sgstAmount||0, igst_amount: v.igstAmount||0,
    discount_amount: v.discountAmount||0, round_off: v.roundOff||0, party_amount: v.totalAmount||0,
    tally_synced_at: new Date().toISOString()
  };
  const items = allItems.map((item) => ({
    tally_voucher_no: v.vnum,
    item_name: item.stock_item||null, hsn_code: item.hsn||null,
    design_no: cleanDesignNo((item.batches?.[0]?.batch_name))||null,
    godown_name: (item.batches?.[0]?.godown)||item.godown||null,
    qty_mtrs: item.qty||0, rate: item.rate||0,
    discount_pct: item.discount||0, item_amount: Math.abs(item.amount)||0
  }));
  return { header, items };
}

function buildDebitNoteRow(v) {
  return {
    tally_voucher_no: v.vnum, voucher_date: v.date,
    party_name: v.party, party_gstin: v.partyGstin||null,
    place_of_supply: v.placeOfSupply||null, state_name: v.stateName||null,
    original_bill_ref: v.reference||null, original_bill_date: v.refDate||null,
    nature_of_return: v.natureOfReturn||null, entered_by: v.enteredBy||null,
    user_description: getUdfVal(v._vxml,'USERDESCRIPTION')||null,
    narration: v.narration||null, bill_ref: v.billRefNo||null,
    expense_ledger: v.expenseLedger||null, expense_amount: v.expenseAmount||0,
    cgst_amount: v.cgstAmount||0, sgst_amount: v.sgstAmount||0, igst_amount: v.igstAmount||0,
    round_off: v.roundOff||0, party_amount: v.totalAmount||0,
    tally_synced_at: new Date().toISOString()
  };
}

function buildJobworkExpensesRow(v) {
  const billBlock = v._vxml.match(/<BILLALLOCATIONS\.LIST[^>]*>([\s\S]*?)<\/BILLALLOCATIONS\.LIST>/i);
  const billType  = billBlock ? getXmlVal(billBlock[1],'BILLTYPE') : null;
  return {
    voucher_number: v.vnum, supplier_invoice_no: v.reference||null,
    supplier_invoice_date: v.refDate||null, voucher_date: v.date, voucher_type: v.vtype,
    party_name: v.party, party_gstin: v.partyGstin||null,
    gst_reg_type: v.gstRegType||null, place_of_supply: v.placeOfSupply||null,
    entered_by: v.enteredBy||null, narration: v.narration||null,
    bill_ref: v.billRefNo||null, bill_type: billType||null,
    expense_ledger: v.expenseLedger||null, expense_amount: v.expenseAmount||0,
    tds_amount: v.tdsAmount||0, cgst_amount: v.cgstAmount||0,
    sgst_amount: v.sgstAmount||0, igst_amount: v.igstAmount||0,
    round_off: v.roundOff||0, party_amount: v.totalAmount||0,
    total_amount: (v.expenseAmount||0)+(v.cgstAmount||0)+(v.sgstAmount||0)+(v.igstAmount||0)+(v.roundOff||0)-(v.tdsAmount||0),
    tally_synced_at: new Date().toISOString()
  };
}

// ─── Helper: extract UDF value from a bill allocation block ─────────────────
function getUdfFromBill(block, fieldName) {
  // Try both <UDF:FIELDNAME> tag and the value array format used in JSON export
  const re1 = new RegExp(`<UDF:${fieldName}[^>]*>([^<]+)<\\/UDF:${fieldName}>`, 'i');
  const m1 = block.match(re1); if (m1) return m1[1].trim();
  // Tally JSON export puts UDF values in arrays — parse via key name
  const key = `"udf:${fieldName.toLowerCase()}"`;
  const idx = block.toLowerCase().indexOf(key);
  if (idx >= 0) {
    const snip = block.slice(idx, idx+400);
    const vm = snip.match(/"value"\s*:\s*"([^"]+)"/i);
    if (vm) return vm[1].trim();
  }
  return '';
}

function buildAccountingVoucherRow(v) {
  // Use allledgerentries for JSON-export vouchers (Receipt_2253 format), fall back to ledgerentries
  const ledgers = getAllLedgerEntries(v._vxml).length > 0
    ? getAllLedgerEntries(v._vxml)
    : getLedgerEntries(v._vxml);

  const allBillAllocs = [];
  let bankLedger='', paymentMode='', instrumentNo='', instrumentDate='', paymentFavouring='';
  let chequeCrossComment='', urn='', adviceStatus='', transferMode='', ifscCode='', bankName='', accountNumber='';
  let bankAmt=0, maxAmt=0;
  const ledgerEntries = [];

  for (const le of ledgers) {
    const lname = getXmlVal(le,'LEDGERNAME').replace(/\r\n|\r|\n/g,'').trim();
    const lamt  = Math.abs(parseNum(getXmlVal(le,'AMOUNT')));
    const isParty = getXmlVal(le,'ISPARTYLEDGER').toUpperCase() === 'YES'
                  || getXmlVal(le,'STRDGSTISPARTYLEDGER').toLowerCase() === 'true';
    if (lamt>maxAmt) maxAmt=lamt;

    // Collect bill allocations with ALL UDF broker fields
    for (const b of getBillAllocations(le)) {
      const billRef = getXmlVal(b,'NAME').trim();
      if (!billRef) continue;
      const billAmt = parseNum(getXmlVal(b,'AMOUNT'));
      const brokerName    = getUdfVal(b,'ERPBROKERNAME')   || getUdfFromBill(b,'ERPBROKERNAME');
      const commRate      = parseNum(getUdfVal(b,'ERPCOMMRATE')     || getUdfFromBill(b,'ERPCOMMRATE'));
      const commAmount    = parseNum(getUdfVal(b,'ERPCOMMAMOUNT')   || getUdfFromBill(b,'ERPCOMMAMOUNT'));
      const commAssValue  = parseNum(getUdfVal(b,'ERPCOMMASSVALUE') || getUdfFromBill(b,'ERPCOMMASSVALUE'));
      const commNetRate   = parseNum(getUdfVal(b,'ERPCOMMNETRATE')  || getUdfFromBill(b,'ERPCOMMNETRATE'));
      const creditPeriod  = getXmlVal(b,'BILLCREDITPERIOD');
      allBillAllocs.push({
        name: billRef, bill_type: getXmlVal(b,'BILLTYPE'), amount: billAmt,
        credit_period: creditPeriod||null,
        broker_name: brokerName||null, comm_rate: commRate||null,
        comm_amount: commAmount||null, comm_ass_value: commAssValue||null, comm_net_rate: commNetRate||null
      });
    }

    // Bank allocations — capture all fields
    const banks = getBankAllocations(le);
    if (banks.length>0 && (!bankLedger||lamt>bankAmt)) {
      bankLedger=lname; bankAmt=lamt;
      const ba=banks[0];
      paymentMode     = getXmlVal(ba,'TRANSACTIONTYPE');
      instrumentNo    = getXmlVal(ba,'INSTRUMENTNUMBER');
      instrumentDate  = parseTallyDate(getXmlVal(ba,'INSTRUMENTDATE'))||'';
      paymentFavouring= getXmlVal(ba,'PAYMENTFAVOURING');
      chequeCrossComment = getXmlVal(ba,'CHEQUECROSSCOMMENT');
      urn             = getXmlVal(ba,'UNIQUEREFERENCENUMBER');
      adviceStatus    = getXmlVal(ba,'PYMTADVICESTATUS');
      transferMode    = getXmlVal(ba,'TRANSFERMODE');
      ifscCode        = getXmlVal(ba,'IFSCODE');
      bankName        = getXmlVal(ba,'BANKNAME');
      accountNumber   = getXmlVal(ba,'ACCOUNTNUMBER');
    }

    ledgerEntries.push({
      ledger_name: lname, amount: parseNum(getXmlVal(le,'AMOUNT')),
      is_party: isParty, bill_count: getBillAllocations(le).length
    });
  }

  // Fallback bank detection
  if (!bankLedger) {
    const BK=['BANK','HDFC','ICICI','AXIS','SBI','KOTAK','CASH','CHEQUE','CANARA','BOB','UNION','PNB','IDBI','INDUS'];
    for (const le of ledgers) {
      const ln=getXmlVal(le,'LEDGERNAME').trim();
      if (BK.some(k=>ln.toUpperCase().includes(k))) { bankLedger=ln; break; }
    }
  }

  const finalAmount = v.totalAmount||maxAmt||0;
  return {
    voucher_number: v.vnum, voucher_type: v.vtype, voucher_date: v.date,
    party_name: v.party||null, entered_by: v.enteredBy||null,
    narration: v.narration||null, guid: v.guid||null,
    dr_ledger: v.party||null, dr_amount: finalAmount,
    cr_ledger: bankLedger||null, cr_amount: finalAmount, total_amount: finalAmount,
    bank_ledger: bankLedger||null, payment_mode: paymentMode||null,
    instrument_no: instrumentNo||null, instrument_date: instrumentDate||null,
    payment_favouring: paymentFavouring||null, cheque_cross_comment: chequeCrossComment||null,
    urn: urn||null, advice_status: adviceStatus||null, transfer_mode: transferMode||null,
    ifsc_code: ifscCode||null, bank_name: bankName||null, account_number: accountNumber||null,
    bill_allocations: allBillAllocs.length ? JSON.stringify(allBillAllocs) : null,
    ledger_entries:   ledgerEntries.length ? JSON.stringify(ledgerEntries) : null,
    total_lines:      allBillAllocs.length,
    multi_bill:       allBillAllocs.length > 1,
    tally_synced_at: new Date().toISOString()
  };
}

// ─── Build per-bill receipt_payment_lines rows ──────────────────────────────
function buildReceiptPaymentLines(v) {
  const ledgers = getAllLedgerEntries(v._vxml).length > 0
    ? getAllLedgerEntries(v._vxml)
    : getLedgerEntries(v._vxml);

  // Find bank info
  let bankLedger='', paymentMode='', instrumentNo='', instrumentDate='',
      paymentFavouring='', urn='', transferMode='', ifscCode='', bankName='', accountNumber='';
  let bankAmt=0;
  for (const le of ledgers) {
    const lname = getXmlVal(le,'LEDGERNAME').trim();
    const lamt  = Math.abs(parseNum(getXmlVal(le,'AMOUNT')));
    const banks = getBankAllocations(le);
    if (banks.length>0 && (!bankLedger||lamt>bankAmt)) {
      bankLedger=lname; bankAmt=lamt;
      const ba=banks[0];
      paymentMode=getXmlVal(ba,'TRANSACTIONTYPE')||getXmlVal(ba,'TRANSFERMODE');
      instrumentNo=getXmlVal(ba,'INSTRUMENTNUMBER');
      instrumentDate=parseTallyDate(getXmlVal(ba,'INSTRUMENTDATE'))||null;
      paymentFavouring=getXmlVal(ba,'PAYMENTFAVOURING');
      urn=getXmlVal(ba,'UNIQUEREFERENCENUMBER');
      transferMode=getXmlVal(ba,'TRANSFERMODE');
      ifscCode=getXmlVal(ba,'IFSCODE');
      bankName=getXmlVal(ba,'BANKNAME');
      accountNumber=getXmlVal(ba,'ACCOUNTNUMBER');
    }
  }

  const totalVoucherAmount = v.totalAmount || 0;
  const lines = [];
  for (const le of ledgers) {
    const lname = getXmlVal(le,'LEDGERNAME').replace(/\r\n|\r|\n/g,'').trim();
    const bills = getBillAllocations(le);
    if (!bills.length) continue;
    for (const b of bills) {
      const billRef = getXmlVal(b,'NAME').trim();
      if (!billRef) continue;
      lines.push({
        voucher_number: v.vnum,
        voucher_type:   v.vtype,
        voucher_date:   v.date,
        party_name:     v.party||null,
        bank_ledger:    bankLedger||null,
        payment_mode:   paymentMode||null,
        instrument_no:  instrumentNo||null,
        instrument_date: instrumentDate||null,
        urn:            urn||null,
        payment_favouring: paymentFavouring||null,
        transfer_mode:  transferMode||null,
        ifsc_code:      ifscCode||null,
        bank_name:      bankName||null,
        account_number: accountNumber||null,
        total_voucher_amount: totalVoucherAmount,
        bill_ref:       billRef,
        bill_type:      getXmlVal(b,'BILLTYPE')||null,
        bill_amount:    parseNum(getXmlVal(b,'AMOUNT')),
        credit_period:  getXmlVal(b,'BILLCREDITPERIOD')||null,
        broker_name:    parseNum(getUdfVal(b,'ERPBROKERNAME')||getUdfFromBill(b,'ERPBROKERNAME'))||
                        (getUdfVal(b,'ERPBROKERNAME')||getUdfFromBill(b,'ERPBROKERNAME'))||null,
        comm_rate:      parseNum(getUdfVal(b,'ERPCOMMRATE')     || getUdfFromBill(b,'ERPCOMMRATE'))   ||0,
        comm_amount:    parseNum(getUdfVal(b,'ERPCOMMAMOUNT')   || getUdfFromBill(b,'ERPCOMMAMOUNT')) ||0,
        comm_ass_value: parseNum(getUdfVal(b,'ERPCOMMASSVALUE') || getUdfFromBill(b,'ERPCOMMASSVALUE'))||0,
        comm_net_rate:  parseNum(getUdfVal(b,'ERPCOMMNETRATE')  || getUdfFromBill(b,'ERPCOMMNETRATE'))||0,
        entered_by:     v.enteredBy||null,
        narration:      v.narration||null,
        tally_synced_at: new Date().toISOString()
      });
      // fix broker_name (string, not numeric)
      const last = lines[lines.length-1];
      last.broker_name = getUdfVal(b,'ERPBROKERNAME') || getUdfFromBill(b,'ERPBROKERNAME') || null;
    }
  }
  return lines;
}

function buildStockJournalRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  const allItems   = invEntries.map(parseInvEntry);
  let greyItem   = allItems.find(i=>i.amount<0)||allItems[0];
  let finishItem = allItems.find(i=>i.amount>0)||allItems[1];
  const greyB   = greyItem?.batches?.[0]  ||{};
  const finishB = finishItem?.batches?.[0]||{};
  const gQ=Math.abs(greyItem?.qty||0), fQ=Math.abs(finishItem?.qty||0);
  const sQ=gQ>fQ?parseFloat((gQ-fQ).toFixed(2)):0;
  return {
    tally_voucher_no: v.vnum, voucher_date: v.date,
    grey_item_name: greyItem?.stock_item||null, finished_item_name: finishItem?.stock_item||null,
    lot_no: greyB.batch_name||null, design_no: cleanDesignNo(finishB.batch_name||greyB.batch_name||'')||null,
    grey_qty_mtrs: gQ, finished_qty_mtrs: fQ, short_qty_mtrs: sQ,
    shortage_pct: gQ>0?parseFloat(((sQ/gQ)*100).toFixed(2)):0,
    quality_name: getUdfVal(v._vxml,'QUALITYNAME')||null, narration: v.narration||null,
    tally_synced_at: new Date().toISOString()
  };
}

// ─── S1: Sync state ───────────────────────────────────────────────────────────
log.push('S1:start');
let lastSynced = new Date('2022-03-31');
try {
  const r = await this.helpers.httpRequest({
    method:'GET',
    url:`${SUPABASE_URL}/rest/v1/tally_sync_state?sync_type=eq.vouchers&select=last_synced_voucher_date&limit=1`,
    headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Accept':'application/json'},
    returnFullResponse:true
  });
  const data = typeof r.body==='string'?JSON.parse(r.body):(r.body||[]);
  if (Array.isArray(data)&&data[0]?.last_synced_voucher_date) lastSynced=new Date(data[0].last_synced_voucher_date);
  log.push(`S1:ok lastSynced=${toISO(lastSynced)}`);
} catch(e) { return [{json:{failedAt:'S1',error:e.message,log}}]; }

const today=new Date(); today.setHours(0,0,0,0); lastSynced.setHours(0,0,0,0);
const daysBehind=Math.max(0,Math.floor((today-lastSynced)/86400000));
const batchStart=daysBehind<=0?today:addDays(lastSynced,1);
const batchEnd=daysBehind<=7?today:addDays(lastSynced,7);
log.push(`S1:batch ${toISO(batchStart)}→${toISO(batchEnd)} behind=${daysBehind}`);

// ─── S2: Tally fetch ──────────────────────────────────────────────────────────
log.push('S2:start');
let parsedVouchers=[];
try {
  const xml=`<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Voucher Register</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>${XFMT}</SVEXPORTFORMAT><EXPLODEFLAG>Yes</EXPLODEFLAG><SVFROMDATE>${toTallyDate(batchStart)}</SVFROMDATE><SVTODATE>${toTallyDate(batchEnd)}</SVTODATE><SVCURRENTCOMPANY>${COMPANY}</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>`;
  const r=await this.helpers.httpRequest({method:'POST',url:TALLY_URL,headers:{'Content-Type':'text/xml'},body:xml,returnFullResponse:true,timeout:120000});
  const body=typeof r.body==='string'?r.body:JSON.stringify(r.body||'');
  log.push(`S2:httpStatus=${r.statusCode} bodyLen=${body.length}`);
  if (r.statusCode>=400) return [{json:{failedAt:'S2_tallyRequest',error:`status ${r.statusCode}`,log}}];
  if (!body||body.length<100) return [{json:{failedAt:'S2_empty',error:'Empty response',log}}];
  if (body.includes('KASHVI APPARELS')||body.includes('26-Apr-2026'))
    return [{json:{failedAt:'S2_cache',error:'TallyNET cache — disconnect TallyCapital and restart',log}}];
  const vBlocks=parseAllVouchers(body);
  parsedVouchers=vBlocks.map(parseVoucher).filter(v=>v.vnum&&v.date);
  const tc={};for(const v of parsedVouchers)tc[v.vtype]=(tc[v.vtype]||0)+1;
  log.push(`S2:ok total=${parsedVouchers.length} types=${JSON.stringify(tc)}`);
} catch(e) { return [{json:{failedAt:'S2_tally',error:e.message,log}}]; }

const salesV       =parsedVouchers.filter(v=>v.vtype==='Sales');
const purchaseV    =parsedVouchers.filter(v=>v.vtype==='Purchase');
const issueToMillV =parsedVouchers.filter(v=>v.vtype==='Issue to Mill');
const recFromMillV =parsedVouchers.filter(v=>v.vtype==='REC FROM MILL');
const processV     =parsedVouchers.filter(v=>['Issue to Mill','REC FROM MILL'].includes(v.vtype));
const creditNoteV  =parsedVouchers.filter(v=>v.vtype==='Credit Note');
const debitNoteV   =parsedVouchers.filter(v=>v.vtype==='Debit Note');
const jobworkV     =parsedVouchers.filter(v=>['Jobwork','Expenses'].includes(v.vtype));
const stockJournalV=parsedVouchers.filter(v=>v.vtype==='Stock Journal');
const accountingV  =parsedVouchers.filter(v=>['Receipt','Payment','Journal','Contra'].includes(v.vtype));
log.push(`S2:f sales=${salesV.length} pur=${purchaseV.length} itm=${issueToMillV.length} rfm=${recFromMillV.length} cn=${creditNoteV.length} dn=${debitNoteV.length} jw=${jobworkV.length} sj=${stockJournalV.length} acct=${accountingV.length}`);

// ─── Upsert ───────────────────────────────────────────────────────────────────
async function upsert(table, rows, conflict, step) {
  log.push(`${step}:start rows=${rows.length}`);
  if (!rows.length) { log.push(`${step}:skipped`); return true; }
  if (rows.length > 0) log.push(`${step}:sample ${JSON.stringify(rows[0]).slice(0,300)}`);
  try {
    const r=await this.helpers.httpRequest({
      method:'POST', url:`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`,
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(rows), returnFullResponse:true
    });
    if(r.statusCode>=400){
      const b = typeof r.body==='string' ? r.body : JSON.stringify(r.body);
      log.push(`${step}:FAIL ${r.statusCode} body=${b.slice(0,500)}`);
      return false;
    }
    log.push(`${step}:ok status=${r.statusCode}`); return true;
  } catch(e){
    log.push(`${step}:ERR ${e.message}`);
    return false;
  }
}

async function upsertCreditNotes(vouchers) {
  log.push('S_CN:start rows='+vouchers.length);
  if (!vouchers.length){log.push('S_CN:skipped');return true;}
  const parsed=vouchers.map(buildCreditNoteRow);
  const ok1=await upsert.call(this,'credit_note',parsed.map(p=>p.header),'tally_voucher_no','S_CN_hdr');
  const items=parsed.flatMap(p=>p.items);
  if(items.length) // S_CN_items: DELETE existing rows for these vouchers, then INSERT fresh
  log.push('S_CN_items:start rows='+items.length);
  if (items.length) {
    if (items.length > 0) log.push('S_CN_items:sample '+JSON.stringify(items[0]).slice(0,300));
    try {
      // Delete existing items for all voucher nos in this batch
      const vnums = [...new Set(items.map(i=>i.tally_voucher_no))];
      const delUrl = `${SUPABASE_URL}/rest/v1/credit_note_items?tally_voucher_no=in.(${vnums.join(',')})`;
      await this.helpers.httpRequest({
        method:'DELETE', url:delUrl,
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'},
        returnFullResponse:true
      });
      // Insert fresh rows
      const r = await this.helpers.httpRequest({
        method:'POST', url:`${SUPABASE_URL}/rest/v1/credit_note_items`,
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,
          'Content-Type':'application/json','Prefer':'return=minimal'},
        body:JSON.stringify(items), returnFullResponse:true
      });
      if (r.statusCode>=400) {
        const b=typeof r.body==='string'?r.body:JSON.stringify(r.body);
        log.push('S_CN_items:FAIL '+r.statusCode+' body='+b.slice(0,600));
      } else { log.push('S_CN_items:ok status='+r.statusCode); }
    } catch(e) { log.push('S_CN_items:ERR '+e.message); }
  }
  return ok1;
}

// S3: sales_bills — chunked + full error body logging
const salesRows = salesV.map(buildSalesRow).map(sanitizeRow).filter(r => r.bill_number);
log.push(`S3:start rows=${salesRows.length}`);
let s3 = true;
if (!salesRows.length) { log.push('S3:skipped'); }
else {
  if (salesRows.length > 0) log.push(`S3:sample ${JSON.stringify(salesRows[0]).slice(0,300)}`);
  // Log all column names sent to help diagnose schema mismatch
  log.push(`S3:cols ${Object.keys(salesRows[0]||{}).join(',')}`);
  const S3_CHUNK = 50;
  for (let _i=0; _i<salesRows.length && s3; _i+=S3_CHUNK) {
    const chunk = salesRows.slice(_i, _i+S3_CHUNK);
    let bodyStr;
    try { bodyStr = JSON.stringify(chunk); } catch(je) { log.push(`S3:JSON_ERR ${je.message}`); s3=false; break; }
    try {
      const r = await this.helpers.httpRequest({
        method:'POST', url:`${SUPABASE_URL}/rest/v1/sales_bills?on_conflict=bill_number`,
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:bodyStr, returnFullResponse:true
      });
      if (r.statusCode>=400) {
        const b = typeof r.body==='string'?r.body:JSON.stringify(r.body);
        log.push(`S3:FAIL chunk${_i} ${r.statusCode} ${b.slice(0,500)}`); s3=false;
      }
    } catch(e) { log.push(`S3:ERR chunk${_i} ${e.message} body_len=${bodyStr.length}`); s3=false; }
  }
  if (s3) log.push(`S3:ok status=201`);
}

// S4: purchase_bills — chunked + full error body logging
const purchaseRows = purchaseV.map(buildPurchaseRow).map(sanitizeRow).filter(r => r.bill_number);
log.push(`S4:start rows=${purchaseRows.length}`);
let s4 = true;
if (!purchaseRows.length) { log.push('S4:skipped'); }
else {
  if (purchaseRows.length > 0) log.push(`S4:sample ${JSON.stringify(purchaseRows[0]).slice(0,300)}`);
  log.push(`S4:cols ${Object.keys(purchaseRows[0]||{}).join(',')}`);
  const S4_CHUNK = 50;
  for (let _i=0; _i<purchaseRows.length && s4; _i+=S4_CHUNK) {
    const chunk = purchaseRows.slice(_i, _i+S4_CHUNK);
    let bodyStr4;
    try { bodyStr4 = JSON.stringify(chunk); } catch(je) { log.push(`S4:JSON_ERR ${je.message}`); s4=false; break; }
    try {
      const r = await this.helpers.httpRequest({
        method:'POST', url:`${SUPABASE_URL}/rest/v1/purchase_bills?on_conflict=bill_number`,
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:bodyStr4, returnFullResponse:true
      });
      if (r.statusCode>=400) {
        const b = typeof r.body==='string'?r.body:JSON.stringify(r.body);
        log.push(`S4:FAIL chunk${_i} ${r.statusCode} ${b.slice(0,500)}`); s4=false;
      }
    } catch(e) { log.push(`S4:ERR chunk${_i} ${e.message} body_len=${bodyStr4.length}`); s4=false; }
  }
  if (s4) log.push(`S4:ok status=201`);
}
const s4b  =await upsert.call(this,'grey_purchase',      purchaseV.flatMap(buildGreyPurchaseRow),      'tally_voucher_no,lot_no',               'S4b');
// S5: process_issues — dedupe by challan_no then chunk
const processAllRows = processV.flatMap(buildProcessRow).map(sanitizeRow);
const processSeen = new Map();
for (const r of processAllRows) {
  let k = r.challan_no+(r.lot_no||''); if(r.challan_no && !processSeen.has(k)) processSeen.set(k,r);
}
const processRows = Array.from(processSeen.values());
log.push(`S5:deduped ${processAllRows.length}→${processRows.length}`);
log.push(`S5:start rows=${processRows.length}`);
let s5 = true;
if (!processRows.length) { log.push('S5:skipped'); }
else {
  if (processRows.length > 0) log.push(`S5:sample ${JSON.stringify(processRows[0]).slice(0,200)}`);
  const S5_CHUNK = 50;
  for (let _i=0; _i<processRows.length && s5; _i+=S5_CHUNK) {
    const chunk = processRows.slice(_i, _i+S5_CHUNK);
    try {
      const r = await this.helpers.httpRequest({
        method:'POST', url:`${SUPABASE_URL}/rest/v1/process_issues?on_conflict=challan_no,lot_no`,
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(chunk), returnFullResponse:true
      });
      if (r.statusCode>=400) {
        const b = typeof r.body==='string'?r.body:JSON.stringify(r.body);
        log.push(`S5:FAIL chunk${_i} ${r.statusCode} ${b.slice(0,400)}`); s5=false;
      }
    } catch(e) { log.push(`S5:ERR chunk${_i} ${e.message}`); s5=false; }
  }
  if (s5) log.push(`S5:ok status=201`);
}
const s5b  =await upsert.call(this,'issue_to_mill',      issueToMillV.map(buildIssueToMillRow),    'lot_no,voucher_date',             'S5b');

// S5e: mill_challan_takas — taka-by-taka detail per Issue to Mill challan
const allTakaRows = issueToMillV.flatMap(v => buildMillChallanTakaRows(v));
log.push(`S5e:start rows=${allTakaRows.length}`);
let s5e = true;
if (allTakaRows.length) {
  try {
    const CHUNK = 200;
    for (let i=0; i<allTakaRows.length; i+=CHUNK) {
      const chunk = allTakaRows.slice(i, i+CHUNK);
      const r = await this.helpers.httpRequest({
        method:'POST',
        url:`${SUPABASE_URL}/rest/v1/mill_challan_takas?on_conflict=lot_no,taka_sr_no`,
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(chunk), returnFullResponse:true
      });
      if (r.statusCode>=400) { log.push(`S5e:FAIL ${r.statusCode} ${(typeof r.body==='string'?r.body:JSON.stringify(r.body)).slice(0,200)}`); s5e=false; break; }
    }
    if (s5e) log.push(`S5e:ok rows=${allTakaRows.length}`);
  } catch(e) { log.push(`S5e:ERR ${e.message}`); s5e=false; }
}
const s5c  =await upsert.call(this,'rec_from_mill', recFromMillV.flatMap(buildRecFromMillRow).map(sanitizeRow), 'tally_voucher_no,lot_no', 'S5c');
const s5d  =await upsert.call(this,'stock_journal',      stockJournalV.map(buildStockJournalRow),  'tally_voucher_no',               'S5d');
const s_cn =await upsertCreditNotes.call(this, creditNoteV);
const s_dn =await upsert.call(this,'debit_note',         debitNoteV.map(buildDebitNoteRow),        'tally_voucher_no',               'S_DN');
// S_JW: jobwork_expenses — dedupe then chunk to avoid 500 on large batches
const jwAllRows = jobworkV.map(buildJobworkExpensesRow).map(sanitizeRow);
const jwSeen = new Map();
for (const r of jwAllRows) {
  // Dedup strictly by voucher_number — same vnum across dates causes 500 on unique constraint
  if (!jwSeen.has(r.voucher_number)) jwSeen.set(r.voucher_number, r);
}
const jwRows = Array.from(jwSeen.values());
log.push(`S_JW:deduped ${jwAllRows.length}→${jwRows.length}`);
log.push(`S_JW:start rows=${jwRows.length}`);
let s_jw = true;
if (!jwRows.length) { log.push('S_JW:skipped'); }
else {
  if (jwRows.length > 0) log.push(`S_JW:sample ${JSON.stringify(jwRows[0]).slice(0,200)}`);
  const JW_CHUNK = 50;
  for (let _i=0; _i<jwRows.length && s_jw; _i+=JW_CHUNK) {
    const chunk = jwRows.slice(_i, _i+JW_CHUNK);
    try {
      const r = await this.helpers.httpRequest({
        method:'POST', url:`${SUPABASE_URL}/rest/v1/jobwork_expenses?on_conflict=voucher_number`,
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(chunk), returnFullResponse:true
      });
      if (r.statusCode>=400) {
        const b = typeof r.body==='string'?r.body:JSON.stringify(r.body);
        log.push(`S_JW:FAIL chunk${_i} ${r.statusCode} ${b.slice(0,400)}`); s_jw=false;
      }
    } catch(e) { log.push(`S_JW:ERR chunk${_i} ${e.message}`); s_jw=false; }
  }
  if (s_jw) log.push(`S_JW:ok status=201`);
}
const s_av =await upsert.call(this,'accounting_vouchers',accountingV.map(buildAccountingVoucherRow),'voucher_number,voucher_type',  'S_AV');

// S_AV_LINES: receipt_payment_lines — per-bill rows for Receipt, Payment, Journal, Contra
const allAccountingLines = accountingV.flatMap(v => buildReceiptPaymentLines(v)).map(sanitizeRow);
log.push(`S_AV_LINES:start rows=${allAccountingLines.length}`);
let s_av_lines = true;
if (allAccountingLines.length) {
  try {
    const CHUNK = 25;
    for (let i=0; i<allAccountingLines.length && s_av_lines; i+=CHUNK) {
      const chunk = allAccountingLines.slice(i, i+CHUNK);
      const r = await this.helpers.httpRequest({
        method:'POST',
        url:`${SUPABASE_URL}/rest/v1/receipt_payment_lines?on_conflict=voucher_number,voucher_type,bill_ref`,
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(chunk), returnFullResponse:true
      });
      if (r.statusCode>=400) {
        const b = typeof r.body==='string'?r.body:JSON.stringify(r.body);
        log.push(`S_AV_LINES:FAIL chunk${i} ${r.statusCode} body=${b.slice(0,800)}`);
        for (let ri=0; ri<chunk.length; ri++) {
          try {
            const rr = await this.helpers.httpRequest({
              method:'POST',
              url:`${SUPABASE_URL}/rest/v1/receipt_payment_lines?on_conflict=voucher_number,voucher_type,bill_ref`,
              headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
              body:JSON.stringify([chunk[ri]]), returnFullResponse:true
            });
            if (rr.statusCode>=400) {
              const rb=typeof rr.body==='string'?rr.body:JSON.stringify(rr.body);
              log.push(`S_AV_LINES:row${i+ri} FAIL ${rr.statusCode} body=${rb.slice(0,400)} row=${JSON.stringify(chunk[ri]).slice(0,300)}`);
              break;
            } else { log.push(`S_AV_LINES:row${i+ri} ok`); }
          } catch(re2) { log.push(`S_AV_LINES:row${i+ri} ERR ${re2.message}`); break; }
        }
        s_av_lines = false;
      }
    }
    if (s_av_lines) log.push(`S_AV_LINES:ok rows=${allAccountingLines.length}`);
  } catch(e) { log.push(`S_AV_LINES:ERR ${e.message}`); s_av_lines=false; }
}
log.push('S6:start');
try {
  await this.helpers.httpRequest({method:'POST',url:`${SUPABASE_URL}/rest/v1/tally_sync_state?on_conflict=sync_type`,
    headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify([{sync_type:'vouchers',last_synced_voucher_date:toISO(batchEnd)}]),returnFullResponse:true});
  log.push('S6:ok');
} catch(e){log.push(`S6:ERR ${e.message}`);}

const total=salesV.length+purchaseV.length+processV.length+recFromMillV.length
           +creditNoteV.length+debitNoteV.length+jobworkV.length+stockJournalV.length+accountingV.length;
try {
  await this.helpers.httpRequest({method:'POST',url:`${SUPABASE_URL}/rest/v1/tally_sync_log`,
    headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
    body:JSON.stringify([{sync_type:'vouchers',status:total>0?'success':'success_empty',records_synced:total}]),returnFullResponse:true});
  log.push('S7:ok');
} catch(e){log.push(`S7:warn ${e.message}`);}

return [{json:{
  status:s3&&s4&&s4b&&s5&&s5b&&s5c&&s5d&&s_cn&&s_dn&&s_jw&&s_av&&s_av_lines?'success':'partial',
  batch:`${toISO(batchStart)}→${toISO(batchEnd)}`,daysBehind,
  stepStatus:{
    S3_sales:s3?'ok':'FAIL',
    S4_purchase:s4?'ok':'FAIL',
    S4b_grey:s4b?'ok':'FAIL',
    S5_process:s5?'ok':'FAIL',
    S5b_issueMill:s5b?'ok':'FAIL',
    S5c_recMill:s5c?'ok':'FAIL',
    S5d_stockJournal:s5d?'ok':'FAIL',
    S_CN_creditNote:s_cn?'ok':'FAIL',
    S_DN_debitNote:s_dn?'ok':'FAIL',
    S_JW_jobwork:s_jw?'ok':'FAIL',
    S_AV_accounting:s_av?'ok':'FAIL',
    S_AV_LINES:s_av_lines?'ok':'FAIL',
  },
  synced:{sales:salesV.length,purchase:purchaseV.length,issueToMill:issueToMillV.length,
    recFromMill:recFromMillV.length,processIssues:processV.length,creditNotes:creditNoteV.length,
    debitNotes:debitNoteV.length,jobwork:jobworkV.length,stockJournal:stockJournalV.length,
    accounting:accountingV.length,accountingLines:allAccountingLines.length,
    challanTakas:allTakaRows.length,total},log
}}];
