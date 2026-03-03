// api/tally-proxy.js
// Vercel serverless function — proxies Tally XML requests
// to tally.shreerangtrendz.com and adds CORS headers.

const TALLY_BASE = 'https://tally.shreerangtrendz.com';

export default async function handler(req, res) {
    // ── CORS headers (allow requests from your Vercel domain) ──
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Pre-flight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const body = req.method === 'POST' ? await readBody(req) : undefined;

        const tallyRes = await fetch(`${TALLY_BASE}/`, {
            method: req.method || 'POST',
            headers: {
                'Content-Type': 'text/xml',
            },
            body,
        });

        const text = await tallyRes.text();

        res.setHeader('Content-Type', 'text/xml');
        return res.status(tallyRes.status).send(text);
    } catch (err) {
        console.error('[tally-proxy] Error:', err.message);
        return res.status(502).json({
            error: 'Tally FRP Tunnel unreachable',
            detail: err.message,
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
