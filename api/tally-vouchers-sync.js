import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper functions for XML Regex Parsing (Fast, No memory overhead)
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

  const ledgers = getLedgerEntries(vxml);
  let totalAmount=0, igstAmount=0, cgstAmount=0, sgstAmount=0;
  let brokerName='', commRate=0, commAmount=0;

  for (const le of ledgers) {
    const lname = getXmlVal(le, 'LEDGERNAME').toUpperCase();
    const lamt  = parseNum(getXmlVal(le, 'AMOUNT'));
    const isParty = getXmlVal(le, 'ISPARTYLEDGER').toUpperCase() === 'YES';
    if (isParty) {
      totalAmount = Math.abs(lamt);
      const bills = getBillAllocations(le);
      if (bills.length > 0) {
        const b = bills[0];
        brokerName   = getUdfVal(b, 'ERPBROKERNAME') || getXmlVal(b, 'UDF:ERPBROKERNAME');
        commRate     = parseNum(getUdfVal(b, 'ERPCOMMRATE') || getXmlVal(b, 'UDF:ERPCOMMRATE'));
        commAmount   = parseNum(getUdfVal(b, 'ERPCOMMAMOUNT') || getXmlVal(b, 'UDF:ERPCOMMAMOUNT'));
      }
    } else if (lname.includes('IGST')) igstAmount = Math.abs(lamt);
      else if (lname.includes('CGST')) cgstAmount = Math.abs(lamt);
      else if (lname.includes('SGST')) sgstAmount = Math.abs(lamt);
  }

  if (!brokerName) {
    brokerName = getUdfVal(vxml, 'ERPBROKERNAME');
    commRate   = commRate || parseNum(getUdfVal(vxml, 'ERPCOMMRATE'));
  }

  return { vtype, vnum, date, party, partyGstin, stateName, placeOfSupply, reference, enteredBy, destGodown, srcGodown, narration, totalAmount, igstAmount, cgstAmount, sgstAmount, brokerName, commRate, commAmount, _vxml: vxml };
}

// Map Functions
function buildSalesRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  let itemName='', ratePer=0, qty=0, taxableValue=0, hsnCode='', designNo='', godown='';
  if (invEntries.length > 0) {
    const inv = invEntries[0];
    itemName     = getXmlVal(inv, 'STOCKITEMNAME');
    ratePer      = parseRate(getXmlVal(inv, 'RATE'));
    qty          = parseQty(getXmlVal(inv, 'ACTUALQTY') || getXmlVal(inv, 'BILLEDQTY'));
    taxableValue = parseNum(getXmlVal(inv, 'AMOUNT'));
    hsnCode      = getXmlVal(inv, 'GSTHSNNAME') || getXmlVal(inv, 'HSNCODE');
    const batches = getBatchAllocations(inv);
    if (batches.length > 0) {
      designNo = cleanDesignNo(getXmlVal(batches[0], 'BATCHNAME'));
      godown   = getXmlVal(batches[0], 'GODOWNNAME') || getXmlVal(batches[0], 'DESTINATIONGODOWN');
    }
  }
  return {
    bill_number:         v.vnum,
    bill_date:           v.date,
    customer_name:       v.party,
    customer_gstin:      v.partyGstin || null,
    total_amount:        v.totalAmount  || null,
    taxable_value:       taxableValue   || null,
    item_name:           itemName       || null,
    rate_per_mtr:        ratePer        || null,
    quantity_mtrs:       qty            || null,
    hsn_code:            hsnCode        || null,
    design_no:           designNo       || null,
    godown:              godown         || null,
    igst_amount:         v.igstAmount   || null,
    cgst_amount:         v.cgstAmount   || null,
    sgst_amount:         v.sgstAmount   || null,
    broker_name:         v.brokerName   || null,
    comm_rate:           v.commRate     || null,
    commission_amount:   v.commAmount   || null,
    tally_sync_status:   'synced',
    tally_synced_at:     new Date().toISOString()
  };
}

function buildPurchaseRow(v) {
  const invEntries = getInventoryEntries(v._vxml);
  let itemName='', ratePer=0, qty=0, taxableValue=0, hsnCode='', designNo='';
  if (invEntries.length > 0) {
    const inv = invEntries[0];
    itemName     = getXmlVal(inv, 'STOCKITEMNAME');
    ratePer      = parseRate(getXmlVal(inv, 'RATE'));
    qty          = parseQty(getXmlVal(inv, 'ACTUALQTY') || getXmlVal(inv, 'BILLEDQTY'));
    taxableValue = parseNum(getXmlVal(inv, 'AMOUNT'));
    hsnCode      = getXmlVal(inv, 'GSTHSNNAME') || getXmlVal(inv, 'HSNCODE');
    const batches = getBatchAllocations(inv);
    if (batches.length > 0) designNo = cleanDesignNo(getXmlVal(batches[0], 'BATCHNAME'));
  }
  return {
    bill_number:          v.vnum,
    bill_date:            v.date,
    supplier_name:        v.party,
    supplier_gstin:       v.partyGstin  || null,
    supplier_invoice_no:  v.reference   || null,
    total_amount:         v.totalAmount || null,
    taxable_value:        taxableValue  || null,
    item_name:            itemName      || null,
    rate_per_mtr:         ratePer       || null,
    quantity_mtrs:        qty           || null,
    hsn_code:             hsnCode       || null,
    design_no:            designNo      || null,
    igst_amount:          v.igstAmount  || null,
    cgst_amount:          v.cgstAmount  || null,
    sgst_amount:          v.sgstAmount  || null,
    broker_name:          v.brokerName  || null,
    comm_rate:            v.commRate    || null,
    tally_sync_status:    'synced',
    tally_synced_at:      new Date().toISOString()
  };
}

function buildProcessRow(v) {
  const vTypeUpper = v.vtype.toUpperCase();
  const isReceipt = vTypeUpper.includes('REC') || vTypeUpper.includes('IN');
  let itemName='', qty=0, rate=0, designNo='';
  const entries = isReceipt ? getInventoryEntriesIn(v._vxml) : getInventoryEntriesOut(v._vxml);
  if (entries.length > 0) {
    const inv = entries[0];
    itemName = getXmlVal(inv, 'STOCKITEMNAME');
    qty      = parseQty(getXmlVal(inv, 'ACTUALQTY') || getXmlVal(inv, 'BILLEDQTY'));
    rate     = parseRate(getXmlVal(inv, 'RATE'));
    const batches = getBatchAllocations(inv);
    if (batches.length > 0) designNo = cleanDesignNo(getXmlVal(batches[0], 'BATCHNAME'));
  }
  return {
    voucher_number:        v.vnum,
    issue_date:            v.date,
    mill_name:             v.party        || null,
    process_type:          isReceipt ? 'received' : 'issued',
    grey_fabric_name:      isReceipt ? null : (itemName || null),
    finished_fabric_name:  isReceipt ? (itemName || null) : null,
    metres_issued:         isReceipt ? 0  : (qty || 0),
    metres_received:       isReceipt ? (qty || 0) : 0,
    job_rate:              isReceipt ? (rate || 0) : 0,
    job_amount:            isReceipt ? (qty * rate) : 0,
    mill_godown:           v.destGodown   || null,
    source_godown:         v.srcGodown    || null,
    design_no:             designNo       || null,
    tally_synced_at:       new Date().toISOString()
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get raw body
  const body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
  
  if (isTrulyBadResponse(body)) {
    return res.status(400).json({ error: 'Empty or cached KASHVI response' });
  }

  const vBlocks = parseAllVouchers(body);
  const parsedVouchers = vBlocks.map(parseVoucher);
  
  const salesV    = parsedVouchers.filter(v => v.vtype === 'Sales' && v.date && v.vnum);
  const purchaseV = parsedVouchers.filter(v => v.vtype === 'Purchase' && v.date && v.vnum);
  const jobworkTypes = ['Issue to Mill', 'REC FROM MILL', 'Material Out', 'Material In', 'Job Work Out Order', 'Job Work In Order', 'Job Work In', 'Job Work Out'];
  const processV  = parsedVouchers.filter(v => jobworkTypes.includes(v.vtype) && v.date);
  const otherV    = parsedVouchers.filter(v => !['Sales','Purchase', ...jobworkTypes].includes(v.vtype) && v.date && v.vnum);

  const results = { sales: 0, purchase: 0, process: 0, others: 0, errors: [] };

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
    records_synced: results.sales + results.purchase + results.process + results.others,
    synced: results
  });
}
