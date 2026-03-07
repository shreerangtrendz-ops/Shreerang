// api/tally-proxy.js
// Vercel serverless function — proxies Tally XML requests
// to tally.shreerangtrendz.com (via FRP tunnel on KVM-1)
// v2: Added health check endpoint, 30s timeout, and detailed fix instructions

const TALLY_BASE = 'https://tally.shreerangtrendz.com';
const TIMEOUT_MS = 30000;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Health check: GET /api/tally-proxy?health=1
    if (req.method === 'GET' && req.query?.health) {
        return await healthCheck(res);
    }

    try {
        const body = req.method === 'POST' ? await readBody(req) : undefined;
        console.log(`[tally-proxy] ${req.method} → ${TALLY_BASE}/ | body: ${body ? body.length : 0} bytes`);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let tallyRes;
        try {
            tallyRes = await fetch(`${TALLY_BASE}/`, {
                method: req.method || 'POST',
                headers: { 'Content-Type': 'text/xml' },
                body,
                signal: controller.signal,
            });
        } catch (fetchErr) {
            clearTimeout(timer);
            if (fetchErr.name === 'AbortError') {
                return res.status(504).json({
                    error: 'Tally FRP Tunnel timeout',
                    detail: 'Tally did not respond within 30 seconds.',
                    fix: 'Tally → F12 → Advanced Config → Enable HTTP Server → Port 9000',
                    frp_status: 'tunnel_up_but_tally_not_listening',
                });
            }
            throw fetchErr;
        }
        clearTimeout(timer);

        const xmlText = await tallyRes.text();
        console.log(`[tally-proxy] Tally responded: ${tallyRes.status}, ${xmlText.length} bytes`);

        res.setHeader('Content-Type', 'text/xml');
        return res.status(tallyRes.status).send(xmlText);

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
        setTimeout(() => controller.abort(), 8000);
        const r = await fetch(`${TALLY_BASE}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml' },
            body: pingXml,
            signal: controller.signal,
        });
        const text = await r.text();
        const latency = Date.now() - startTime;
        const hasData = text.includes('<ENVELOPE>') || text.includes('<COMPANY>');
        return res.status(200).json({
            status: hasData ? 'connected' : 'partial',
            latency_ms: latency,
            tally_url: TALLY_BASE,
            http_status: r.status,
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
            tally_url: TALLY_BASE,
            error: err.message,
            is_timeout: isTimeout,
            message: isTimeout
                ? 'FRP tunnel reachable but Tally HTTP server not responding — enable it in F12'
                : 'FRP tunnel unreachable — start frpc.exe on the Tally PC',
            fix: isTimeout
                ? 'Tally → F12 → Advanced Configuration → Enable HTTP Server → Port 9000 → Ctrl+A'
                : 'Run frpc.exe -c frpc.toml in CMD on the Tally PC',
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
