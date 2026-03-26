import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
  
  if (!body || body.length < 50) return res.status(400).json({ error: 'Empty payload' });

  const billBlocks = parseAllBills(body);
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

  const results = { affected_ledgers: 0, errors: [] };

  if (Object.keys(outstandingMap).length > 0) {
    const rowsToUpsert = Object.keys(outstandingMap).map(party => ({
      name: party,
      bill_outstanding: outstandingMap[party],
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('tally_ledgers').upsert(rowsToUpsert, { onConflict: 'name' });
    if (error) {
      results.errors.push(`Outstanding update error: ${error.message}`);
    } else {
      results.affected_ledgers = rowsToUpsert.length;
    }
  }

  res.status(200).json({ status: 'success', synced: results });
}
