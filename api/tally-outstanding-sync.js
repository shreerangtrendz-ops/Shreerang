// api/tally-outstanding-sync.js
// Consolidated Outstanding Sync (Receivables/Sundry Debtors)
// Supports: 1. Push from n8n (POST with XML body)
//           2. Pull from Tally (GET/POST without body - triggers Tally Export)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';
const TALLY_EDGE = 'https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-proxy';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OUTSTANDING_XML = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Outstanding Receivables</REPORTNAME>
  <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

function getXmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function parseTallyDate(s) {
  if (!s) return null;
  s = s.trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  const M = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const m = s.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (m) return `${m[3]}-${M[m[2]]||'01'}-${m[1].padStart(2,'0')}`;
  return null;
}

function parseAllBills(xml) {
  const re = /<BILLFIXED\b[^>]*>[\s\S]*?<\/BILLFIXED>/gi;
  const blocks = []; let m;
  while ((m = re.exec(xml)) !== null) blocks.push(m[0]);
  return blocks;
}

async function processOutstanding(xml, results) {
  const billBlocks = parseAllBills(xml);
  const parsedBills = billBlocks.map(bxml => {
    return {
      bill_name: getXmlVal(bxml, 'NAME'),
      party_name: getXmlVal(bxml, 'PARTYLEDGERNAME'),
      bill_date: parseTallyDate(getXmlVal(bxml, 'BILLDATE')),
      bill_outstanding: parseFloat(getXmlVal(bxml, 'OPENINGBALANCE')) || 0,
      is_advance: getXmlVal(bxml, 'ISADVANCE').toUpperCase() === 'YES',
    };
  }).filter(b => b.bill_name);

  const outstandingMap = {};
  for (const b of parsedBills) {
    if (!outstandingMap[b.party_name]) outstandingMap[b.party_name] = 0;
    outstandingMap[b.party_name] += b.bill_outstanding; 
  }

  if (Object.keys(outstandingMap).length > 0) {
    const rowsToUpsert = Object.keys(outstandingMap).map(party => ({
      name: party,
      bill_outstanding: Math.abs(outstandingMap[party]),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('tally_ledgers').upsert(rowsToUpsert, { onConflict: 'name' });
    if (error) results.errors.push(`Outstanding error: ${error.message}`);
    else results.affected_ledgers = rowsToUpsert.length;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = { affected_ledgers: 0, errors: [] };
  const rawBody = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
  
  try {
    if (rawBody && rawBody.length > 100) {
      await processOutstanding(rawBody, results);
    } else {
      const r = await fetch(TALLY_EDGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY, 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ xmlBody: OUTSTANDING_XML }),
        signal: AbortSignal.timeout(40000)
      });
      const data = await r.json();
      if (data.data) await processOutstanding(data.data, results);
    }

    res.status(200).json({ status: 'success', synced: results, success: results.errors.length ===0 });
  } catch (err) {
    res.status(200).json({ status: 'error', error: err.message, success: false });
  }
}
