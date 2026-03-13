import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Try office PC first, fall back to test PC
const TALLY_URLS = [
  "https://tally.shreerangtrendz.com",       // Office PC — port 19000
  "https://tally-test.shreerangtrendz.com",  // Test PC — port 9000
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tally-company",
};

async function fetchTally(url: string, xmlBody: string, timeoutMs = 10000): Promise<{ ok: boolean; text: string; timedOut: boolean }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xmlBody,
      signal: controller.signal,
    });
    clearTimeout(t);
    const text = await r.text();
    return { ok: r.ok && text.length > 10, text, timedOut: false };
  } catch (err) {
    clearTimeout(t);
    const timedOut = err instanceof Error && err.name === "AbortError";
    return { ok: false, text: "", timedOut };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let xmlBody: string | null = null;
    let company = "";

    try {
      const body = await req.json();
      xmlBody = body.xmlBody || null;
      company = body.company || "";
    } catch (_) {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!xmlBody) {
      return new Response(JSON.stringify({ success: false, error: "Missing xmlBody in request" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const companyParam = url.searchParams.get("company") || req.headers.get("x-tally-company") || company;

    // Try each Tally endpoint in order
    let responseText = "";
    let lastError = "";
    let activeEndpoint = "";

    for (const baseUrl of TALLY_URLS) {
      const tallyUrl = companyParam
        ? `${baseUrl}?company=${encodeURIComponent(companyParam)}`
        : baseUrl;

      console.log(`[tally-proxy] Trying ${tallyUrl}`);
      const result = await fetchTally(tallyUrl, xmlBody, 10000);

      if (result.ok) {
        responseText = result.text;
        activeEndpoint = baseUrl;
        console.log(`[tally-proxy] Success from ${tallyUrl} (${responseText.length} bytes)`);
        break;
      }

      lastError = result.timedOut
        ? `${baseUrl} timed out`
        : `${baseUrl} connection failed`;
      console.log(`[tally-proxy] Failed: ${lastError}`);
    }

    if (!responseText) {
      return new Response(JSON.stringify({
        success: false,
        error: `All Tally endpoints unreachable. Last error: ${lastError}. Is Tally Prime open?`,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      responseText.includes("IMPORTFILE") ||
      responseText.includes("File to Import") ||
      responseText.includes("LONGPROMPT")
    ) {
      return new Response(JSON.stringify({
        success: false,
        error: "TALLY_IMPORT_DIALOG_OPEN",
        hint: "Press ESC in Tally to return to Gateway of Tally main screen, then retry sync",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: responseText,
      activeEndpoint,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[tally-proxy] Unhandled error: ${msg}`);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
