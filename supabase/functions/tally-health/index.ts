import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function checkUrl(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number; body: string; error?: string }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(t);
    const body = await r.text();
    return { ok: r.ok, status: r.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: "", error: err instanceof Error ? err.message : "Unknown" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Check each service INDEPENDENTLY
  const [tally, n8n, domain, frpsApi] = await Promise.all([
    checkUrl("https://tally.shreerangtrendz.com"),        // Tally HTTP via FRP tunnel
    checkUrl("https://n8n.shreerangtrendz.com"),           // n8n Docker
    checkUrl("https://shreerangtrendz.com"),               // Main domain / nginx
    checkUrl("https://shreerangtrendz.com/api/frp-status"), // Optional: frps status API
  ]);

  // Tally: must return 200 with TallyPrime text
  const tallyOnline = tally.ok && tally.body.includes("TallyPrime");

  // frps: if tally tunnel works, frps is working
  const frpsOnline = tallyOnline;

  // frpc: if tally responds, frpc is connected
  const frpcOnline = tallyOnline;

  // nginx: main domain responds
  const nginxOnline = domain.ok;

  // n8n automation
  const n8nOnline = n8n.ok;

  // Domain gateway = main domain
  const domainOnline = domain.ok;

  return new Response(JSON.stringify({
    tally: tallyOnline ? "online" : "offline",
    frps: frpsOnline ? "online" : "offline",
    frpc: frpcOnline ? "online" : "offline",
    nginx: nginxOnline ? "online" : "offline",
    n8n: n8nOnline ? "online" : "offline",
    domain: domainOnline ? "online" : "offline",
    details: {
      tally: { url: "https://tally.shreerangtrendz.com", status: tally.status, error: tally.error },
      n8n: { url: "https://n8n.shreerangtrendz.com", status: n8n.status, error: n8n.error },
      domain: { url: "https://shreerangtrendz.com", status: domain.status, error: domain.error },
    },
    checkedAt: new Date().toISOString(),
  }), { headers: { ...CORS, "Content-Type": "application/json" } });
});

