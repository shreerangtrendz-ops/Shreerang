import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Utility Functions ───────────────────────────────────────────────────────
function toISO(d) { return d.toISOString().slice(0,10); }
function parseTallyDate(s) {
  if (!s) return null;
  s = s.trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  const M = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const m = s.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (m) return `${m[3]}-${M[m[2]]||'01'}-${m[1].padStart(2,'0')}`;
  return null;
}
function getXmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}
function parseQty(s) { return s ? parseFloat(s.replace(/mtrs?/gi,'').replace(/nos?/gi,'').trim()) || 0 : 0; }
function parseRate(s) { return s ? parseFloat(s.replace(/\/mtrs?/gi,'').replace(/\/nos?/gi,'').trim()) || 0 : 0; }
function parseNum(s) { return s ? parseFloat(s.replace(/,/g,'').trim()) || 0 : 0; }
function cleanDesignNo(s) { return s ? s.trim() : ''; }

function getUdfVal(xml, udfName) {
  const re = new RegExp(`<UDF:${udfName}(?:\\.LIST)?[^>]*>[\\s\\S]*?<ALTEREDVALUE>([^<]+)<\\/ALTEREDVALUE>`, 'i');
  const m = xml.match(re);
  if (m) return m[1].trim();
  const re2 = new RegExp(`<UDF:${udfName}[^>]*>([^<]+)<\\/UDF:${udfName}>`, 'i');
  const m2 = xml.match(re2);
  return m2 ? m2[1].trim() : '';
}

function getLedgerEntries(vxml) {
  const re = /<LEDGERENTRIES\.LIST[^>]*>([\s\S]*?)<\/LEDGERENTRIES\.LIST>/gi;
  const entries = []; let m;
  while ((m = re.exec(vxml)) !== null) entries.push(m[1]); return entries;
}
function getInventoryEntries(vxml) {
  const re = /<ALLINVENTORYENTRIES\.LIST[^>]*>([\s\S]*?)<\/ALLINVENTORYENTRIES\.LIST>/gi;
  const entries = []; let m;
  while ((m = re.exec(vxml)) !== null) entries.push(m[1]); return entries;
}
function getInventoryEntriesOut(vxml) {
  const re = /<INVENTORYENTRIESOUT\.LIST[^>]*>([\s\S]*?)<\/INVENTORYENTRIESOUT\.LIST>/gi;
  const entries = []; let m;
  while ((m = re.exec(vxml)) !== null) entries.push(m[1]);
  if (entries.length === 0) {
    const re2 = /<INVENTORYENTRIESIN\.LIST[^>]*>([\s\S]*?)<\/INVENTORYENTRIESIN\.LIST>/gi;
    while ((m = re2.exec(vxml)) !== null) entries.push(m[1]);
  }
  return entries;
}
function getInventoryEntriesIn(vxml) {
  const re = /<INVENTORYENTRIESIN\.LIST[^>]*>([\s\S]*?)<\/INVENTORYENTRIESIN\.LIST>/gi;
  const entries = []; let m;
  while ((m = re.exec(vxml)) !== null) entries.push(m[1]); return entries;
}
function getBillAllocations(entryXml) {
  const re = /<BILLALLOCATIONS\.LIST[^>]*>([\s\S]*?)<\/BILLALLOCATIONS\.LIST>/gi;
  const entries = []; let m;
  while ((m = re.exec(entryXml)) !== null) entries.push(m[1]); return entries;
}
function getBatchAllocations(invXml) {
  const re = /<BATCHALLOCATIONS\.LIST[^>]*>([\s\S]*?)<\/BATCHALLOCATIONS\.LIST>/gi;
  const entries = []; let m;
  while ((m = re.exec(invXml)) !== null) entries.push(m[1]); return entries;
}
function parseAllVouchers(xml) {
  const re = /<VOUCHER\b[^>]*>[\s\S]*?<\/VOUCHER>/gi;
  const blocks = []; let m;
  while ((m = re.exec(xml)) !== null) blocks.push(m[0]); return blocks;
}

function isTrulyBadResponse(body) {
  if (!body || body.length < 50) return true;
  return false;
}

// ─── Core Voucher Parser ─────────────────────────────────────────────────────
function parseVoucher(vxml) {
  const attrM = vxml.match(/\bVCHTYPE="([^"]+)"/i);
  const vtype = (attrM ? attrM[1] : getXmlVal(vxml, 'VOUCHERTYPENAME')).trim();
  const vnum        = getXmlVal(vxml, 'VOUCHERNUMBER');
  const date        = parseTallyDate(getXmlVal(vxml,'EFFECTIVEDATE') || getXmlVal(vxml,'DATE'));
  const party       = getXmlVal(vxml, 'PARTYLEDGERNAME') || getXmlVal(vxml, 'BASICBUYERNAME');
  const partyGstin  = getXmlVal(vxml, 'PARTYGSTIN') || getXmlVal(vxml, 'CONSIGNEEGSTIN');
  const stateName   = getXmlVal(vxml, 'STATENAME');
  const placeOfSupply = getXmlVal(vxml, 'PLACEOFSUPPLY');
  const reference   = getXmlVal(vxml, 'REFERENCE');
  const enteredBy   = getXmlVal(vxml, 'ENTEREDBY');
  const destGodown  = getXmlVal(vxml, 'DESTINATIONGODOWN');
  const srcGodown   = getXmlVal(vxml, 'VOUCHERSOURCEGODOWN') || getXmlVal(vxml, 'SOURCEGODOWN');
  const narration   = getXmlVal(vxml, 'NARRATION');
  const guid        = getXmlVal(vxml, 'GUID');
  // Bank/instrument details
  const instrumentNo   = getXmlVal(vxml, 'INSTRUMENTNO') || getXmlVal(vxml, 'CHEQUENO');
  const instrumentDate = parseTallyDate(getXmlVal(vxml, 'INSTRUMENTDATE') || getXmlVal(vxml, 'CHEQUEDATE'));
  const paymentFavouring = getXmlVal(vxml, 'PAYMENTFAVOURING');
  const transferMode   = getXmlVal(vxml, 'TRANSFERMODE');
  const urn            = getXmlVal(vxml, 'URN');

  const ledgers = getLedgerEntries(vxml);
  let totalAmount=0, igstAmount=0, cgstAmount=0, sgstAmount=0;
  let brokerName='', commRate=0, commAmount=0;
  let bankLedger='', billRef='', billAmount=0;
  let drLedger='', crLedger='', drAmount=0, crAmount=0;
  const allLedgerEntries = [];

  for (const le of ledgers) {
    const lname = getXmlVal(le, 'LEDGERNAME');
    const lnameUpper = lname.toUpperCase();
    const lamt  = parseNum(getXmlVal(le, 'AMOUNT'));
    const isParty = getXmlVal(le, 'ISPARTYLEDGER').toUpperCase() === 'YES';

    // Collect full ledger entries for JSONB
    allLedgerEntries.push({ name: lname, amount: lamt, is_party: isParty });

    if (isParty) {
      totalAmount = Math.abs(lamt);
      crLedger = lname; crAmount = Math.abs(lamt);
      const bills = getBillAllocations(le);
      if (bills.length > 0) {
        const b = bills[0];
        brokerName   = getUdfVal(b, 'ERPBROKERNAME') || getXmlVal(b, 'UDF:ERPBROKERNAME');
        commRate     = parseNum(getUdfVal(b, 'ERPCOMMRATE') || getXmlVal(b, 'UDF:ERPCOMMRATE'));
        commAmount   = parseNum(getUdfVal(b, 'ERPCOMMAMOUNT') || getXmlVal(b, 'UDF:ERPCOMMAMOUNT'));
        billRef      = getXmlVal(b, 'NAME');
        billAmount   = Math.abs(parseNum(getXmlVal(b, 'BILLCREDITAMOUNT') || getXmlVal(b, 'AMOUNT')));
      }
    } else if (lnameUpper.includes('IGST')) igstAmount = Math.abs(lamt);
      else if (lnameUpper.includes('CGST')) cgstAmount = Math.abs(lamt);
      else if (lnameUpper.includes('SGST')) sgstAmount = Math.abs(lamt);
      else if (lnameUpper.includes('BANK') || lnameUpper.includes('HDFC') ||
               lnameUpper.includes('ICICI') || lnameUpper.includes('AXIS') ||
               lnameUpper.includes('CASH') || lnameUpper.includes('CHEQUE')) {
        bankLedger = lname;
        drLedger = lname; drAmount = Math.abs(lamt);
      }
  }

  if (!brokerName) {
    brokerName = getUdfVal(vxml, 'ERPBROKERNAME');
    commRate   = commRate || parseNum(getUdfVal(vxml, 'ERPCOMMRATE'));
  }

  return { vtype, vnum, date, party, partyGstin, stateName, placeOfSupply, reference, enteredBy,
           destGodown, srcGodown, narration, guid, instrumentNo, instrumentDate, paymentFavouring,
           transferMode, urn, totalAmount, igstAmount, cgstAmount, sgstAmount,
           brokerName, commRate, commAmount, bankLedger, billRef, billAmount,
           drLedger, crLedger, drAmount, crAmount, allLedgerEntries, _vxml: vxml };
}

// ─── Row Builders ────────────────────────────────────────────────────────────

function buildSalesRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  let itemName='', ratePer=0, qty=0, taxableValue=0, hsnCode='', designNo='', godown='', batchName='';
  const lineItems = [];

  for (const inv of invEntries) {
    const iName     = getXmlVal(inv, 'STOCKITEMNAME');
    const iRate     = parseRate(getXmlVal(inv, 'RATE'));
    const iQty      = parseQty(getXmlVal(inv, 'ACTUALQTY') || getXmlVal(inv, 'BILLEDQTY'));
    const iAmt      = parseNum(getXmlVal(inv, 'AMOUNT'));
    const iHsn      = getXmlVal(inv, 'GSTHSNNAME') || getXmlVal(inv, 'HSNCODE');
    const batches   = getBatchAllocations(inv);
    let bName = '', bGodown = '';
    if (batches.length > 0) {
      bName   = cleanDesignNo(getXmlVal(batches[0], 'BATCHNAME'));
      bGodown = getXmlVal(batches[0], 'GODOWNNAME') || getXmlVal(batches[0], 'DESTINATIONGODOWN');
    }
    lineItems.push({ item: iName, qty: iQty, rate: iRate, amount: iAmt, hsn: iHsn, batch: bName, godown: bGodown });
    if (!itemName) { itemName = iName; ratePer = iRate; qty = iQty; taxableValue = Math.abs(iAmt); hsnCode = iHsn; designNo = bName; godown = bGodown; batchName = bName; }
    else { qty += iQty; taxableValue += Math.abs(iAmt); }
  }

  return {
    bill_number:         v.vnum,
    bill_date:           v.date,
    customer_name:       v.party,
    customer_gstin:      v.partyGstin      || null,
    customer_state:      v.stateName       || null,
    place_of_supply:     v.placeOfSupply   || null,
    total_amount:        v.totalAmount     || null,
    taxable_value:       taxableValue      || null,
    item_name:           itemName          || null,
    fabric_name:         itemName          || null,
    rate_per_mtr:        ratePer           || null,
    quantity_mtrs:       qty               || null,
    hsn_code:            hsnCode           || null,
    design_no:           designNo          || null,
    batch_name:          batchName         || null,
    godown:              godown            || null,
    igst_amount:         v.igstAmount      || null,
    cgst_amount:         v.cgstAmount      || null,
    sgst_amount:         v.sgstAmount      || null,
    broker_name:         v.brokerName      || null,
    comm_rate:           v.commRate        || null,
    commission_amount:   v.commAmount      || null,
    comm_amount:         v.commAmount      || null,
    entered_by:          v.enteredBy       || null,
    narration:           v.narration       || null,
    line_items:          lineItems.length > 0 ? lineItems : null,
    tally_sync_status:   'synced',
    tally_synced_at:     new Date().toISOString()
  };
}

function buildPurchaseRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  let itemName='', ratePer=0, qty=0, taxableValue=0, hsnCode='', designNo='', batchName='', godown='';
  const lineItems = [];

  for (const inv of invEntries) {
    const iName   = getXmlVal(inv, 'STOCKITEMNAME');
    const iRate   = parseRate(getXmlVal(inv, 'RATE'));
    const iQty    = parseQty(getXmlVal(inv, 'ACTUALQTY') || getXmlVal(inv, 'BILLEDQTY'));
    const iAmt    = parseNum(getXmlVal(inv, 'AMOUNT'));
    const iHsn    = getXmlVal(inv, 'GSTHSNNAME') || getXmlVal(inv, 'HSNCODE');
    const batches = getBatchAllocations(inv);
    let bName = '', bGodown = '';
    if (batches.length > 0) {
      bName   = cleanDesignNo(getXmlVal(batches[0], 'BATCHNAME'));
      bGodown = getXmlVal(batches[0], 'GODOWNNAME');
    }
    lineItems.push({ item: iName, qty: iQty, rate: iRate, amount: iAmt, hsn: iHsn, batch: bName, godown: bGodown });
    if (!itemName) { itemName = iName; ratePer = iRate; qty = iQty; taxableValue = Math.abs(iAmt); hsnCode = iHsn; designNo = bName; batchName = bName; godown = bGodown; }
    else { qty += iQty; taxableValue += Math.abs(iAmt); }
  }

  return {
    bill_number:          v.vnum,
    bill_date:            v.date,
    supplier_name:        v.party,
    supplier_gstin:       v.partyGstin      || null,
    supplier_state:       v.stateName       || null,
    supplier_invoice_no:  v.reference       || null,
    total_amount:         v.totalAmount     || null,
    taxable_value:        taxableValue      || null,
    item_name:            itemName          || null,
    fabric_name:          itemName          || null,
    rate_per_mtr:         ratePer           || null,
    quantity_mtrs:        qty               || null,
    hsn_code:             hsnCode           || null,
    design_no:            designNo          || null,
    batch_name:           batchName         || null,
    godown:               godown            || null,
    igst_amount:          v.igstAmount      || null,
    cgst_amount:          v.cgstAmount      || null,
    sgst_amount:          v.sgstAmount      || null,
    broker_name:          v.brokerName      || null,
    comm_rate:            v.commRate        || null,
    entered_by:           v.enteredBy       || null,
    narration:            v.narration       || null,
    line_items:           lineItems.length > 0 ? lineItems : null,
    tally_sync_status:    'synced',
    tally_synced_at:      new Date().toISOString()
  };
}

function buildProcessRow(v) {
  const vTypeUpper = v.vtype.toUpperCase();
  const isReceipt = vTypeUpper.includes('REC') || vTypeUpper.includes('IN');
  let itemName='', qty=0, rate=0, designNo='', batchName='', challanNo='', lotNo='';
  const entries = isReceipt ? getInventoryEntriesIn(v._vxml) : getInventoryEntriesOut(v._vxml);
  const lineItems = [];

  for (const inv of entries) {
    const iName   = getXmlVal(inv, 'STOCKITEMNAME');
    const iQty    = parseQty(getXmlVal(inv, 'ACTUALQTY') || getXmlVal(inv, 'BILLEDQTY'));
    const iRate   = parseRate(getXmlVal(inv, 'RATE'));
    const batches = getBatchAllocations(inv);
    let bName = '';
    if (batches.length > 0) bName = cleanDesignNo(getXmlVal(batches[0], 'BATCHNAME'));
    lineItems.push({ item: iName, qty: iQty, rate: iRate, batch: bName });
    if (!itemName) { itemName = iName; qty = iQty; rate = iRate; designNo = bName; batchName = bName; }
    else { qty += iQty; }
  }

  // Extract challan no and lot no from narration or UDFs
  challanNo = getUdfVal(v._vxml, 'ERPCHALLANNO') || getXmlVal(v._vxml, 'CHALNNO') || '';
  lotNo     = getUdfVal(v._vxml, 'ERPLOTNO') || '';

  return {
    voucher_number:        v.vnum,
    issue_date:            v.date,
    mill_name:             v.party            || null,
    party_name:            v.party            || null,
    process_type:          isReceipt ? 'received' : 'issued',
    grey_fabric_name:      isReceipt ? null : (itemName || null),
    finished_fabric_name:  isReceipt ? (itemName || null) : null,
    metres_issued:         isReceipt ? 0  : (qty || 0),
    metres_received:       isReceipt ? (qty || 0) : 0,
    job_rate:              isReceipt ? (rate || 0) : 0,
    job_amount:            isReceipt ? (qty * rate) : 0,
    mill_godown:           v.destGodown       || null,
    source_godown:         v.srcGodown        || null,
    design_no:             designNo           || null,
    batch_name:            batchName          || null,
    challan_no:            challanNo          || null,
    lot_no:                lotNo              || null,
    narration:             v.narration        || null,
    entered_by:            v.enteredBy        || null,
    line_items:            lineItems.length > 0 ? lineItems : null,
    tally_synced_at:       new Date().toISOString()
  };
}

// ─── NEW: Accounting Vouchers (Payment/Receipt/Journal/Contra) ───────────────
function buildAccountingVoucherRow(v) {
  const billAllocations = [];
  for (const le of getLedgerEntries(v._vxml)) {
    const bills = getBillAllocations(le);
    for (const b of bills) {
      billAllocations.push({
        name:        getXmlVal(b, 'NAME'),
        bill_type:   getXmlVal(b, 'BILLTYPE'),
        amount:      Math.abs(parseNum(getXmlVal(b, 'BILLCREDITAMOUNT') || getXmlVal(b, 'AMOUNT')))
      });
    }
  }

  return {
    voucher_number:    v.vnum,
    voucher_type:      v.vtype,
    voucher_date:      v.date,
    party_name:        v.party            || null,
    entered_by:        v.enteredBy        || null,
    narration:         v.narration        || null,
    guid:              v.guid             || null,
    dr_ledger:         v.drLedger         || null,
    dr_amount:         v.drAmount         || 0,
    cr_ledger:         v.crLedger         || null,
    cr_amount:         v.crAmount         || 0,
    total_amount:      v.totalAmount      || 0,
    bank_ledger:       v.bankLedger       || null,
    instrument_no:     v.instrumentNo     || null,
    instrument_date:   v.instrumentDate   || null,
    payment_favouring: v.paymentFavouring || null,
    transfer_mode:     v.transferMode     || null,
    urn:               v.urn              || null,
    bill_allocations:  billAllocations.length > 0 ? billAllocations : null,
    ledger_entries:    v.allLedgerEntries || [],
    tally_sync_status: 'synced'
  };
}

// ─── NEW: Jobwork Expenses (Journal type for mill processing charges) ─────────
function buildJobworkExpenseRow(v) {
  let expenseLedger='', expenseAmount=0, tdsAmount=0, roundOff=0;

  for (const le of getLedgerEntries(v._vxml)) {
    const lname = getXmlVal(le, 'LEDGERNAME');
    const lnameUpper = lname.toUpperCase();
    const lamt = parseNum(getXmlVal(le, 'AMOUNT'));
    if (lnameUpper.includes('PROCESSING') || lnameUpper.includes('CHARGES') || lnameUpper.includes('JOBWORK')) {
      expenseLedger = lname; expenseAmount = Math.abs(lamt);
    } else if (lnameUpper.includes('TDS') || lnameUpper.includes('TAX DEDUCT')) {
      tdsAmount = Math.abs(lamt);
    } else if (lnameUpper.includes('ROUND')) {
      roundOff = lamt;
    }
  }

  const bills = getBillAllocations(getLedgerEntries(v._vxml)[0] || '');
  const billRef  = bills.length > 0 ? getXmlVal(bills[0], 'NAME') : '';
  const billType = bills.length > 0 ? getXmlVal(bills[0], 'BILLTYPE') : '';

  return {
    voucher_number:       v.vnum,
    voucher_type:         v.vtype,
    voucher_date:         v.date,
    supplier_invoice_no:  v.reference     || null,
    party_name:           v.party         || null,
    party_gstin:          v.partyGstin    || null,
    place_of_supply:      v.placeOfSupply || null,
    entered_by:           v.enteredBy     || null,
    narration:            v.narration     || null,
    bill_ref:             billRef         || null,
    bill_type:            billType        || null,
    expense_ledger:       expenseLedger   || null,
    expense_amount:       expenseAmount   || 0,
    tds_amount:           tdsAmount       || 0,
    cgst_amount:          v.cgstAmount    || 0,
    sgst_amount:          v.sgstAmount    || 0,
    igst_amount:          v.igstAmount    || 0,
    round_off:            roundOff        || 0,
    party_amount:         v.totalAmount   || 0,
    total_amount:         v.totalAmount   || 0,
    ledger_entries:       v.allLedgerEntries || [],
    tally_sync_status:    'synced'
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
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

  // ── Categorise vouchers ──────────────────────────────────────────────────
  const salesV    = parsedVouchers.filter(v => v.vtype === 'Sales' && v.date && v.vnum);
  const purchaseV = parsedVouchers.filter(v => v.vtype === 'Purchase' && v.date && v.vnum);

  const jobworkTypes = ['Issue to Mill','REC FROM MILL','Material Out','Material In',
                        'Job Work Out Order','Job Work In Order','Job Work In','Job Work Out'];
  const processV = parsedVouchers.filter(v => jobworkTypes.includes(v.vtype) && v.date);

  // Payment/Receipt/Contra/Journal → accounting_vouchers table
  const accountingTypes = ['Receipt','Payment','Contra','Journal'];
  const accountingV = parsedVouchers.filter(v => accountingTypes.includes(v.vtype) && v.date && v.vnum);

  // Credit Note / Debit Note → accounting_vouchers too
  const creditDebitV = parsedVouchers.filter(v => ['Credit Note','Debit Note'].includes(v.vtype) && v.date && v.vnum);

  // Jobwork expense journals (mill processing charges etc.)
  const jobworkExpenseV = parsedVouchers.filter(v => {
    if (v.vtype !== 'Journal') return false;
    const narr = (v.narration || '').toLowerCase();
    return narr.includes('processing') || narr.includes('mill') || narr.includes('jobwork') || narr.includes('job work');
  });
  // Remove jobwork expense journals from general accounting (avoid double insert)
  const jobworkExpenseVnums = new Set(jobworkExpenseV.map(v => v.vnum));
  const pureAccountingV = [...accountingV, ...creditDebitV].filter(v => !jobworkExpenseVnums.has(v.vnum));

  // Everything else
  const knownTypes = new Set(['Sales','Purchase',...jobworkTypes,...accountingTypes,'Credit Note','Debit Note']);
  const otherV = parsedVouchers.filter(v => !knownTypes.has(v.vtype) && v.date && v.vnum);

  const results = { sales: 0, purchase: 0, process: 0, accounting: 0, jobwork_expenses: 0, others: 0, errors: [] };

  // ── Sales ────────────────────────────────────────────────────────────────
  if (salesV.length > 0) {
    const rows = salesV.map(buildSalesRow);
    const { error } = await supabase.from('sales_bills').upsert(rows, { onConflict: 'bill_number' });
    if (error) results.errors.push(`Sales: ${error.message}`);
    else results.sales = rows.length;
  }

  // ── Purchase ─────────────────────────────────────────────────────────────
  if (purchaseV.length > 0) {
    const rows = purchaseV.map(buildPurchaseRow);
    const { error } = await supabase.from('purchase_bills').upsert(rows, { onConflict: 'bill_number' });
    if (error) results.errors.push(`Purchase: ${error.message}`);
    else results.purchase = rows.length;
  }

  // ── Process Issues (Job Work stock movements) ─────────────────────────────
  if (processV.length > 0) {
    const rows = processV.map(buildProcessRow);
    const { error } = await supabase.from('process_issues').upsert(rows, { onConflict: 'voucher_number' });
    if (error) results.errors.push(`Process: ${error.message}`);
    else results.process = rows.length;
  }

  // ── Accounting Vouchers (Payment/Receipt/Journal/Contra/Credit/Debit) ────
  if (pureAccountingV.length > 0) {
    const rows = pureAccountingV.map(buildAccountingVoucherRow);
    const { error } = await supabase.from('accounting_vouchers').upsert(rows, { onConflict: 'voucher_number,voucher_type' });
    if (error) results.errors.push(`Accounting: ${error.message}`);
    else results.accounting = rows.length;
  }

  // ── Jobwork Expenses (mill processing charge journals) ───────────────────
  if (jobworkExpenseV.length > 0) {
    const rows = jobworkExpenseV.map(buildJobworkExpenseRow);
    const { error } = await supabase.from('jobwork_expenses').upsert(rows, { onConflict: 'voucher_number' });
    if (error) results.errors.push(`Jobwork Expenses: ${error.message}`);
    else results.jobwork_expenses = rows.length;
  }

  // ── Others → tally_vouchers fallback ─────────────────────────────────────
  if (otherV.length > 0) {
    const rows = otherV.map(v => ({
      voucher_number:    v.vnum,
      voucher_type:      v.vtype,
      voucher_date:      v.date,
      party_name:        v.party,
      amount:            v.totalAmount,
      broker_name:       v.brokerName,
      comm_rate:         v.commRate,
      comm_amount:       v.commAmount,
      narration:         v.narration,
      tally_sync_status: 'synced',
      tally_synced_at:   new Date().toISOString()
    }));
    const { error } = await supabase.from('tally_vouchers').upsert(rows, { onConflict: 'voucher_number' });
    if (error) results.errors.push(`Others: ${error.message}`);
    else results.others = rows.length;
  }

  res.status(200).json({
    status: 'success',
    success: results.errors.length === 0,
    records_synced: results.sales + results.purchase + results.process + results.accounting + results.jobwork_expenses + results.others,
    synced: results
  });
}
