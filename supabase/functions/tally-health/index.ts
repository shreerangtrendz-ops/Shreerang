// supabase/functions/tally-health/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TALLY_URLS = [
  "https://tally.shreerangtrendz.com",       // Office PC (production) — try first
  "https://tally-test.shreerangtrendz.com",  // Test PC (home) — fallback
];

const TALLY_XML = '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Companies</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';

const CORS = {
  "Access-Control-Allow-Origin": "*",
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

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({
      domain: "offline", frps: "offline", frpc: "offline",
      nginx: "offline", tally: "offline",
      tallyCompany: "", stockItems: 0,
      activeEndpoint: "none", error: msg,
    }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
