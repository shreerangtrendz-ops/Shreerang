// api/tally-proxy.js
// Vercel serverless function — proxies Tally XML requests
// to tally.shreerangtrendz.com (via FRP tunnel on KVM-1)
// and adds CORS headers so browser can call it directly.

const TALLY_BASE = 'https://tally.shreerangtrendz.com';
const TIMEOUT_MS = 25000;

export default async function handler(req, res) {
    // ── CORS headers ─────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Pre-flight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
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
                console.error('[tally-proxy] Timeout reaching Tally');
                return res.status(504).json({
                    error: 'Tally FRP Tunnel timeout',
                    detail: 'Tally did not respond within 25 seconds. Ensure Tally Prime is open with HTTP server on port 9000.',
                });
            }
            throw fetchErr;
        }
        clearTimeout(timer);

        const xmlText = await tallyRes.text();
        console.log(`[tally-proxy] Tally responded: ${tallyRes.status}, ${xmlText.length} bytes`);

        // Return XML directly (Content-Type: text/xml)
        res.setHeader('Content-Type', 'text/xml');
        return res.status(tallyRes.status).send(xmlText);

    } catch (err) {
        console.error('[tally-proxy] Error:', err.message);
        return res.status(502).json({
            error: 'Tally FRP Tunnel unreachable',
            detail: err.message,
            hint: 'Check: 1) Tally Prime is open  2) frpc.exe is running on the Tally PC  3) frps is running on KVM-1',
        });
    }
}

// Helper — read raw body from the request stream
function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => (data += chunk));
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}
