// api/tally-outstanding.js
// Pulls Outstanding Receivable (Sundry Debtors) from Tally → Supabase outstanding_receivable table

const TALLY_PROXY = 'https://www.shreerangtrendz.com/api/tally-proxy';
const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}
function parseAmt(s) { if (!s) return 0; return parseFloat(s.replace(/[^0-9.\-]/g,'')) || 0; }
function tallyDate(d) {
  if (!d) return null; d = d.trim();
  if (/^\d{8}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  return null;
}

const OUTSTANDING_XML = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Outstanding Receivables</REPORTNAME>
  <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const r = await fetch(TALLY_PROXY, {
      method: 'POST', headers: {'Content-Type':'text/xml'},
      body: OUTSTANDING_XML, signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) throw new Error(`Proxy ${r.status}`);
    const xml = await r.text();

    // Parse Ledger-wise outstanding
    const rows = [];
    const ledgerBlocks = xml.match(/<LEDGER[\s\S]*?<\/LEDGER>/gi) || [];

    for (const block of ledgerBlocks) {
      const customerName = extractTag(block, 'NAME');
      const tallyLedger = extractTag(block, 'LEDGERNAME') || customerName;
      const outstandingAmt = parseAmt(extractTag(block, 'CLOSINGBALANCE') || extractTag(block, 'AMOUNT'));
      if (!customerName || outstandingAmt <= 0) continue;

      const billBlocks = block.match(/<BILLALLOCATIONS[\s\S]*?<\/BILLALLOCATIONS>/gi) || [];
      let totalBills = billBlocks.length || 1;
      let oldestDate = null;
      let maxOverdue = 0;

      for (const bb of billBlocks) {
        const billDate = tallyDate(extractTag(bb, 'BILLDATE'));
        if (billDate) {
          if (!oldestDate || billDate < oldestDate) oldestDate = billDate;
          const daysOverdue = Math.floor((Date.now() - new Date(billDate)) / 864e5);
          if (daysOverdue > maxOverdue) maxOverdue = daysOverdue;
        }
      }

      rows.push({
        customer_name: customerName,
        tally_ledger_name: tallyLedger,
        total_bills: totalBills,
        total_billed: outstandingAmt,
        total_received: 0,
        outstanding_amount: outstandingAmt,
        oldest_bill_date: oldestDate,
        last_payment_date: null,
        max_days_overdue: maxOverdue,
        credit_days: 30,
      });
    }

    if (rows.length) {
      // Delete and re-insert (outstanding is always current snapshot)
      await fetch(`${SUPABASE_URL}/rest/v1/outstanding_receivable?customer_name=neq.null`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      await fetch(`${SUPABASE_URL}/rest/v1/outstanding_receivable`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(rows),
      });
    }

    // Log sync
    await fetch(`${SUPABASE_URL}/rest/v1/tally_sync_log`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_type: 'outstanding_receivable', status: 'success', records_synced: rows.length }),
    });

    return res.status(200).json({ success: true, synced: rows.length, timestamp: new Date().toISOString() });
  } catch(e) {
    return res.status(200).json({ success: false, error: e.message, timestamp: new Date().toISOString() });
  }
}
