import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TALLY_URLS = [
  "https://tally.shreerangtrendz.com",       // Office PC (production) — try first
  "https://tally-test.shreerangtrendz.com",  // Test PC (home) — fallback
];

const TALLY_XML = '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Companies</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';

const CORS = {
  "Access-Control-Allow-Origin": "*",
<<<<<<< HEAD
=======
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
>>>>>>> 00051653989becfb6229d83c8b1812dbab649d94
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function tryTally(url: string): Promise<{ ok: boolean; text: string; url: string }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: TALLY_XML,
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    return { ok: r.ok && text.length > 50 && !text.includes("LINEERROR"), text, url };
  } catch {
    return { ok: false, text: "", url };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
<<<<<<< HEAD
    // Try office PC first, then test PC fallback
    let result = await tryTally(TALLY_URLS[0]);
    let activeUrl = TALLY_URLS[0];

    if (!result.ok) {
      result = await tryTally(TALLY_URLS[1]);
      activeUrl = TALLY_URLS[1];
    }

    const { ok, text } = result;
    const isTestPc = activeUrl === TALLY_URLS[1];

    // Extract company name
    const companyMatch =
      text.match(/<BASICCOMPANYNAME>(.*?)<\/BASICCOMPANYNAME>/i) ||
      text.match(/<NAME>(.*?)<\/NAME>/i);
    const tallyCompany = companyMatch
      ? companyMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";

    const stockItems = (text.match(/<BASICCOMPANYNAME>/g) || []).length;

    return new Response(JSON.stringify({
      domain:      ok ? "online" : "offline",
      frps:        ok ? "online" : "offline",
      frpc:        ok ? "online" : "offline",
      nginx:       ok ? "online" : "offline",
      tally:       ok ? "online" : "offline",
      tallyCompany,
      stockItems,
      activeEndpoint: ok ? (isTestPc ? "test-pc" : "office-pc") : "none",
      rawLength:   text.length,
    }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
=======
    // Step 1: Check tunnel (simple GET)
    let tunnelOnline = false;
    let gatewayText = "";
    try {
      const gatewayReq = await fetch(TALLY_URL, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });
      gatewayText = await gatewayReq.text();
      tunnelOnline = gatewayReq.ok;
    } catch {
      tunnelOnline = false;
    }

    if (!tunnelOnline) {
      return new Response(JSON.stringify({
        domain: "offline", frps: "offline", frpc: "offline",
        nginx: "offline", tally: "offline",
        tallyCompany: "", stockItems: 0, status: "tunnel_unreachable"
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Step 2: Identify - is it TallyPrime or just FRP 404 page?
    const isTallyRunning = 
      gatewayText.includes("TallyPrime") || 
      gatewayText.includes("Tally") || 
      gatewayText.includes("License server");

    const isFrpPage = gatewayText.includes("frp") || gatewayText.toLowerCase().includes("not found");

    if (isFrpPage && !isTallyRunning) {
      // Tunnel works, Tally is OFF
      return new Response(JSON.stringify({
        domain: "online", frps: "online", frpc: "online",
        nginx: "online", tally: "offline",
        tallyCompany: "", stockItems: 0,
        status: "tally_off"
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Step 3: Try XML POST to verify Tally data access
    const TALLY_XML = '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Companies</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';

    let tallyOnline = false;
    let tallyCompany = "";
    let stockItems = 0;
    let status = "gateway_only";

    try {
      const tallyReq = await fetch(TALLY_URL, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: TALLY_XML,
        signal: AbortSignal.timeout(8000),
      });

      if (tallyReq.ok) {
        const tallyText = await tallyReq.text();
        if (tallyText.includes("<ENVELOPE>") || tallyText.includes("<NAME>") || tallyText.includes("<COMPANY>")) {
          tallyOnline = true;
          status = "tally_open";
          const match = tallyText.match(/<NAME>([^<]+)<\/NAME>/i) ||
                        tallyText.match(/<BASICCOMPANYNAME>([^<]+)<\/BASICCOMPANYNAME>/i);
          tallyCompany = match ? match[1].trim() : "ShreeRang Trendz";
          stockItems = (tallyText.match(/<NAME>/g) || []).length;
        } else if (tallyText.includes("License server") || tallyText.includes("TallyPrime")) {
          tallyOnline = false;
          status = "tally_gateway_only";
        }
      }
    } catch {
      tallyOnline = false;
      status = "tally_xml_failed";
    }

    return new Response(JSON.stringify({
      domain: "online", frps: "online", frpc: "online", nginx: "online",
      tally: tallyOnline ? "online" : "offline",
      tallyCompany, stockItems, status,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
>>>>>>> 00051653989becfb6229d83c8b1812dbab649d94

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({
      domain: "offline", frps: "offline", frpc: "offline",
      nginx: "offline", tally: "offline",
<<<<<<< HEAD
      tallyCompany: "", stockItems: 0,
      activeEndpoint: "none", error: msg,
    }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
=======
      tallyCompany: "", stockItems: 0, error: msg, status: "error"
    }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
>>>>>>> 00051653989becfb6229d83c8b1812dbab649d94
  }
});
