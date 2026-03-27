import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

function getXmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function getXmlVals(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const vals = []; let m;
  while ((m = re.exec(xml)) !== null) vals.push(m[1].trim());
  return vals;
}

function parseAllLedgers(xml) {
  const re = /<LEDGER\b[^>]*>[\s\S]*?<\/LEDGER>/gi;
  const blocks = []; let m;
  while ((m = re.exec(xml)) !== null) blocks.push(m[0]);
  return blocks;
}

function parseAllStockItems(xml) {
  const re = /<STOCKITEM\b[^>]*>[\s\S]*?<\/STOCKITEM>/gi;
  const blocks = []; let m;
  while ((m = re.exec(xml)) !== null) blocks.push(m[0]);
  return blocks;
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

  const body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
  if (!body || body.length < 50) return res.status(400).json({ error: 'Empty payload' });

  // 1. Process LEDGERS
  const ledgerBlocks = parseAllLedgers(body);
  const parsedLedgers = ledgerBlocks.map(lxml => {
    return {
      name: getXmlVal(lxml, 'NAME'),
      parent_group: getXmlVal(lxml, 'PARENT'),
      mailing_name: getXmlVal(lxml, 'MAILINGNAME'),
      pincode: getXmlVal(lxml, 'PINCODE'),
      state: getXmlVal(lxml, 'STATENAME'),
      country: getXmlVal(lxml, 'COUNTRYNAME'),
      gstin: getXmlVal(lxml, 'PARTYGSTIN'),
      credit_period: getXmlVal(lxml, 'BILLCREDITPERIOD'),
      opening_balance: parseFloat(getXmlVal(lxml, 'OPENINGBALANCE')) || 0,
      updated_at: new Date().toISOString()
    };
  }).filter(l => l.name);

  // 2. Process STOCK ITEMS
  const itemBlocks = parseAllStockItems(body);
  const parsedItems = itemBlocks.map(ixml => {
    return {
      sku: getXmlVal(ixml, 'NAME'),
      parent_group: getXmlVal(ixml, 'PARENT'),
      uom: getXmlVal(ixml, 'BASEUNITS'),
      hsn_code: getXmlVal(ixml, 'GSTHSNNAME') || getXmlVal(ixml, 'HSNCODE'),
      opening_balance: parseFloat(getXmlVal(ixml, 'OPENINGBALANCE')) || 0,
      updated_at: new Date().toISOString()
    };
  }).filter(i => i.sku);

  const results = { ledgers: 0, items: 0, errors: [] };

  if (parsedLedgers.length > 0) {
    const { error } = await supabase.from('tally_ledgers').upsert(parsedLedgers, { onConflict: 'name' });
    if (error) results.errors.push(`Ledgers error: ${error.message}`);
    else results.ledgers = parsedLedgers.length;
  }

  if (parsedItems.length > 0) {
    const { error } = await supabase.from('products').upsert(parsedItems.map(item => ({
      sku: item.sku,
      name: item.sku,
      category: item.parent_group,
      created_at: item.updated_at
    })), { onConflict: 'sku', ignoreDuplicates: true });
    
    if (error) results.errors.push(`Items error: ${error.message}`);
    else results.items = parsedItems.length;
  }

  res.status(200).json({ status: 'success', synced: results });
}
