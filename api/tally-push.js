// api/tally-push.js
// Vercel serverless — Creates a Stock Item in Tally Prime via FRP tunnel
// Called by FinishFabricForm on save.  Requires Tally to be running + FRP live.

const SUPABASE_EDGE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-proxy';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDk4NTUsImV4cCI6MjA3OTAyNTg1NX0';
const TIMEOUT_MS = 25000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const {
    itemName,
    tallyGroup,
    hsnCode,
    gstRate,
    unit,
    company,
  } = req.body || {};

  if (!itemName) return res.status(400).json({ error: '`itemName` is required' });

  const stockGroup = tallyGroup || 'Finish Fabrics';
  const stockUnit  = unit || 'Mtr';

  const hsnBlock = hsnCode ? `
      <HSNDETAILS.LIST>
        <HSNCODE>${hsnCode}</HSNCODE>
        <TAXABILITY>Taxable</TAXABILITY>
        <STATEWISEDETAILS.LIST>
          <STATENAME>&#0;</STATENAME>
          <RATEDETAILS.LIST>
            <GSTRATEDUTYHEAD>Central Tax</GSTRATEDUTYHEAD>
            <GSTRATE>${(gstRate || 5) / 2}</GSTRATE>
          </RATEDETAILS.LIST>
          <RATEDETAILS.LIST>
            <GSTRATEDUTYHEAD>State Tax</GSTRATEDUTYHEAD>
            <GSTRATE>${(gstRate || 5) / 2}</GSTRATE>
          </RATEDETAILS.LIST>
        </STATEWISEDETAILS.LIST>
      </HSNDETAILS.LIST>` : '';

  const xmlBody = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${company || ''}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKITEM NAME="${escapeXml(itemName)}" Action="Create" RESERVEDNAME="">
            <NAME>${escapeXml(itemName)}</NAME>
            <PARENT>${escapeXml(stockGroup)}</PARENT>
            <BASEUNITS>${escapeXml(stockUnit)}</BASEUNITS>
            <GSTAPPLICABLE>&#1;</GSTAPPLICABLE>
            <GSTTYPEOFSUPPLY>Goods</GSTTYPEOFSUPPLY>${hsnBlock}
          </STOCKITEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const edgeRes = await fetch(SUPABASE_EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ xmlBody, company: company || '' }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const edgeData = await edgeRes.json();
    if (!edgeRes.ok) {
      return res.status(502).json({ error: 'Tally edge error', detail: edgeData?.error });
    }

    const xml = edgeData?.xml || '';
    const created  = xml.includes('CREATED') || xml.includes('<CREATED>1') || xml.includes('Created');
    const altered  = xml.includes('ALTERED') || xml.includes('<ALTERED>1');
    const errMatch = xml.match(/<LINEERROR>(.*?)<\/LINEERROR>/i);

    if (errMatch) {
      return res.status(422).json({
        success: false,
        error: 'Tally rejected item',
        tally_error: errMatch[1],
        raw_response: xml.slice(0, 500),
      });
    }

    return res.status(200).json({
      success: true,
      created: created || altered,
      item_name: itemName,
      tally_group: stockGroup,
      raw_response: xml.slice(0, 500),
    });
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === 'AbortError';
    return res.status(isTimeout ? 504 : 502).json({
      success: false,
      error: isTimeout ? 'Tally FRP timeout — frpc must be running' : err.message,
      item_name: itemName,
    });
  }
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
