// ═══════════════════════════════════════════════════════════════════
// SRTPL — Sync Customer Masters from Tally Ledger Master
// Node name: "Sync Customer Masters"
// Workflow: CU6dMm7DCtSP6rMQ (SRTPL Tally Sync v34)
// Date: 12-Apr-2026
// ═══════════════════════════════════════════════════════════════════

const TALLY_URL    = 'http://172.19.0.1:9080';
const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';

function cleanText(val) {
  if (!val) return null;
  return String(val).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').trim() || null;
}
function parseNum(val) {
  if (!val) return null;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g,''));
  return isNaN(n) ? null : n;
}
function getXmlVal(xml, tag) {
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = xml.match(re);
  return m ? cleanText(m[1].replace(/<[^>]+>/g, '')) : null;
}
function getAllXmlVals(xml, tag) {
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'gi');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
      const txt = cleanText(m[1].replace(/<[^>]+>/g, ''));
      if (txt) results.push(txt);
  }
  return results;
}

// TDL XML — fetch Sundry Debtors + Creditors ledger masters
const tdlXml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Ledger</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVCURRENTCOMPANY>SheeRang Trendz Pvt. Ltd.</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <COLLECTION ISODBC="No">
            <TYPE>Ledger</TYPE>
            <CHILDOF>Sundry Debtors:Sundry Creditors</CHILDOF>
            <NATIVEMETHOD>Yes</NATIVEMETHOD>
            <FETCH>Name,Address,LedgerPhone,LedgerMobile,Email,GSTRegistrationNumber,PinCode,LedgerState,CreditPeriod,CreditLimit,PartyGSTType</FETCH>
          </COLLECTION>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

// Call Tally
let tallyResp;
try {
  const res = await fetch(TALLY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: tdlXml,
  });
  tallyResp = await res.text();
} catch(e) {
  throw new Error('Tally connection failed: ' + e.message);
}

// Parse ledger blocks
const ledgerBlocks = tallyResp.match(/<LEDGER[ \n][^>]+>[\s\S]*?<\/LEDGER>/gi) || [];
console.log('Found ' + ledgerBlocks.length + ' ledger blocks from Tally');

const rows = [];
for (const block of ledgerBlocks) {
  const nameMatch = block.match(/NAME="([^"]+)"/i);
  if (!nameMatch) continue;
  const name = cleanText(nameMatch[1]);
  if (!name) continue;

  const addressLines = getAllXmlVals(block, 'ADDRESS');
  const address = addressLines.length ? addressLines.join(', ') : null;

  const phone        = getXmlVal(block, 'LEDGERMOBILE') || getXmlVal(block, 'LEDGERPHONE');
  const email        = getXmlVal(block, 'EMAIL');
  const gst_number   = getXmlVal(block, 'PARTYGSTIN') || getXmlVal(block, 'GSTREGISTRATIONNUMBER');
  const pincode      = getXmlVal(block, 'PINCODE');
  const state        = getXmlVal(block, 'LEDGERSTATE');
  const creditRaw    = getXmlVal(block, 'CREDITPERIOD');
  const credit_days  = creditRaw ? (parseNum(creditRaw.replace(/[^0-9]/g,'')) || null) : null;
  const credit_limit = parseNum(getXmlVal(block, 'CREDITLIMIT'));

  if (!phone && !email && !gst_number && !address && !pincode && credit_days === null && !credit_limit) continue;

  rows.push({ tally_ledger_name: name, phone, email, gst_number, address, pincode, state, credit_days, credit_limit });
}

console.log('Parsed ' + rows.length + ' ledgers with enrichment data');
if (rows.length === 0) {
  return [{ json: { status: 'ok', message: 'No enrichment data in Tally response', raw_length: tallyResp.length } }];
}

// PATCH each into Supabase — only non-null fields, matched on tally_ledger_name
let updated = 0;
const errors = [];

for (const row of rows) {
  const { tally_ledger_name, ...fields } = row;
  const payload = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && v !== undefined) payload[k] = v;
  }
  if (Object.keys(payload).length === 0) continue;

  const res = await fetch(
    SUPABASE_URL + '/rest/v1/customers?tally_ledger_name=eq.' + encodeURIComponent(tally_ledger_name),
    {
      method: 'PATCH',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(payload),
    }
  );
  if (res.ok) { updated++; }
  else { const err = await res.text(); errors.push({ name: tally_ledger_name, error: err.slice(0,120) }); }
}

return [{
  json: {
    status: errors.length === 0 ? 'ok' : 'partial',
    total_from_tally: ledgerBlocks.length,
    with_data: rows.length,
    updated_in_supabase: updated,
    errors: errors.slice(0, 10),
  }
}];
