// api/tally-masters-sync.js
// Consolidated Master Sync: Ledgers + Stock Items
// Supports: 1. Push from n8n (POST with XML body)
//           2. Pull from Tally (GET/POST without body - triggers Tally Export)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const TALLY_EDGE = 'https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-proxy';
const LEDGER_XML = `<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Accounts</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
const STOCK_XML = `<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Stock Summary</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

function getXmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function parseAllLedgers(xml) {
  const re = /<LEDGER\b[^>]*>[\s\S]*?<\/LEDGER>/gi;
  const blocks = []; let m;
  while ((m = re.exec(xml)) !== null) blocks.push(m[0]);
  return blocks.map(lxml => ({
    name: getXmlVal(lxml, 'NAME'),
    parent_group: getXmlVal(lxml, 'PARENT'),
    opening_balance: parseFloat(getXmlVal(lxml, 'OPENINGBALANCE')) || 0,
    updated_at: new Date().toISOString()
  })).filter(l => l.name);
}

function parseAllStockItems(xml) {
  const re = /<STOCKITEM\b[^>]*>[\s\S]*?<\/STOCKITEM>/gi;
  const blocks = []; let m;
  while ((m = re.exec(xml)) !== null) blocks.push(m[0]);
  return blocks.map(ixml => ({
    sku: getXmlVal(ixml, 'NAME'),
    parent_group: getXmlVal(ixml, 'PARENT'),
    opening_balance: parseFloat(getXmlVal(ixml, 'OPENINGBALANCE')) || 0,
    updated_at: new Date().toISOString()
  })).filter(i => i.sku);
}

async function processData(xml, results) {
  const ledgers = parseAllLedgers(xml);
  const items = parseAllStockItems(xml);

  if (ledgers.length > 0) {
    const { error } = await supabase.from('tally_ledgers').upsert(ledgers, { onConflict: 'name' });
    if (error) results.errors.push(`Ledgers error: ${error.message}`);
    else results.ledgers = ledgers.length;
  }

  if (items.length > 0) {
    const { error } = await supabase.from('products').upsert(items.map(item => ({
      sku: item.sku,
      name: item.sku,
      category: item.parent_group,
      created_at: item.updated_at
    })), { onConflict: 'sku' });
    if (error) results.errors.push(`Items error: ${error.message}`);
    else results.items = items.length;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = { ledgers: 0, items: 0, errors: [] };
  const rawBody = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
  
  try {
    if (rawBody && rawBody.length > 100) {
      // MODE 1: PUSH (Process provided XML)
      await processData(rawBody, results);
    } else {
      // MODE 2: PULL (Fetch from Tally)
      const fetchTally = async (xml) => {
        const r = await fetch(TALLY_EDGE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, 'apikey': process.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ xmlBody: xml }),
          signal: AbortSignal.timeout(40000)
        });
        return r.json();
      };
      
      const [lRes, sRes] = await Promise.all([fetchTally(LEDGER_XML), fetchTally(STOCK_XML)]);
      if (lRes.data) await processData(lRes.data, results);
      if (sRes.data) await processData(sRes.data, results);
    }

    res.status(200).json({ status: 'success', synced: results, success: results.errors.length === 0 });
  } catch (err) {
    res.status(200).json({ status: 'error', error: err.message, success: false });
  }
}
