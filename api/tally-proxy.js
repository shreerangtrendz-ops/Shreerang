// api/tally-proxy.js
// Vercel serverless function — proxies Tally XML requests
// Routes through Supabase Edge Function (tally-proxy) which has correct FRP URL
// v3: Fixed URL (http:9000), routes to Supabase edge function for reliability

const SUPABASE_EDGE_URL = 'https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-proxy';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDk4NTUsImV4cCI6MjA3OTAyNTg1NX0.placeholder';
const TALLY_DIRECT = 'http://tally.shreerangtrendz.com:9000';
const TIMEOUT_MS = 28000;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tally-Company');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Health check: GET /api/tally-proxy?health=1
    if (req.method === 'GET' && req.query?.health) {
        return await healthCheck(res);
    }

    try {
        const body = req.method === 'POST' ? await readBody(req) : undefined;
        const company = req.headers['x-tally-company'] || req.query?.company || '';

        console.log(`[tally-proxy] Forwarding to Supabase edge | body: ${body ? body.length : 0} bytes | company: ${company}`);

        // Route through Supabase edge function which has the correct Tally URL
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let edgeRes;
        try {
            edgeRes = await fetch(SUPABASE_EDGE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({ xmlBody: body, company }),
                signal: controller.signal,
            });
        } catch (fetchErr) {
            clearTimeout(timer);
            if (fetchErr.name === 'AbortError') {
                return res.status(504).json({
                    error: 'Tally FRP Tunnel timeout',
                    detail: 'Tally did not respond within 28 seconds.',
                    fix: 'Check FRP tunnel is running on Tally PC and KVM server',
                });
            }
            throw fetchErr;
        }
        clearTimeout(timer);

        const edgeData = await edgeRes.json();

        if (!edgeRes.ok) {
            return res.status(502).json({
                error: 'Tally proxy error',
                detail: edgeData?.error || 'Unknown error from edge function',
            });
        }

        // Return the XML from Tally
        const xmlText = edgeData?.xml || '';
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(xmlText);

    } catch (err) {
        console.error('[tally-proxy] Error:', err.message);
        return res.status(502).json({
            error: 'Tally FRP Tunnel unreachable',
            detail: err.message,
            fix_checklist: [
                '1. Tally Prime must be OPEN on the local PC',
                '2. F12 → Advanced Configuration → Enable HTTP Server → Port 9000 → Ctrl+A',
                '3. frpc.exe must be running in CMD',
                '4. frps must be running on KVM VPS (72.61.249.86)',
            ],
        });
    }
}

async function healthCheck(res) {
    const startTime = Date.now();
    try {
        const pingXml = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Companies</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10000);

        const r = await fetch(SUPABASE_EDGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ xmlBody: pingXml }),
            signal: controller.signal,
        });
        const data = await r.json();
        const text = data?.xml || '';
        const latency = Date.now() - startTime;
        const hasData = text.includes('<ENVELOPE>') || text.includes('<COMPANY>');

        return res.status(200).json({
            status: hasData ? 'connected' : 'partial',
            latency_ms: latency,
            tally_url: TALLY_DIRECT,
            has_tally_data: hasData,
            message: hasData ? 'Tally is live and responding' : 'Tunnel reached but response unclear',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        const latency = Date.now() - startTime;
        const isTimeout = err.name === 'AbortError';
        return res.status(200).json({
            status: 'offline',
            latency_ms: latency,
            tally_url: TALLY_DIRECT,
            error: err.message,
            is_timeout: isTimeout,
            message: isTimeout
                ? 'FRP tunnel reachable but Tally HTTP server not responding'
                : 'FRP tunnel unreachable — start frpc.exe on Tally PC',
            timestamp: new Date().toISOString(),
        });
    }
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => (data += chunk));
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}
