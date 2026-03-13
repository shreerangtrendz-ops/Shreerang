import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TALLY_URL = "https://tally.shreerangtrendz.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tally-company",
};

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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!xmlBody) {
      return new Response(JSON.stringify({ success: false, error: "Missing xmlBody in request" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const companyParam = url.searchParams.get("company") || req.headers.get("x-tally-company") || company;
    const tallyUrl = companyParam
      ? `${TALLY_URL}?company=${encodeURIComponent(companyParam)}`
      : TALLY_URL;

    console.log(`[tally-proxy] Forwarding to ${tallyUrl} (${xmlBody.length} bytes)`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let responseText = "";
    try {
      const tallyResponse = await fetch(tallyUrl, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: xmlBody,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      responseText = await tallyResponse.text();
      console.log(`[tally-proxy] Tally: ${tallyResponse.status}, ${responseText.length} bytes`);
    } catch (fetchErr) {
      clearTimeout(timeout);
      const isTimeout = fetchErr instanceof Error && fetchErr.name === "AbortError";
      return new Response(JSON.stringify({
        success: false,
        error: isTimeout
          ? "Tally request timed out after 25s — is Tally open with HTTP port 9000 enabled?"
          : `Tally connection failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (responseText.includes("IMPORTFILE") || responseText.includes("File to Import") || responseText.includes("LONGPROMPT")) {
      return new Response(JSON.stringify({
        success: false,
        error: "TALLY_IMPORT_DIALOG_OPEN",
        hint: "Press ESC in Tally to return to Gateway of Tally, then retry sync",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (responseText.includes("<LINEERROR>")) {
      const errMatch = responseText.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
      return new Response(JSON.stringify({
        success: false,
        error: "Tally returned error: " + (errMatch ? errMatch[1] : "Check Tally logs"),
        rawResponse: responseText.slice(0, 500),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, data: responseText }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[tally-proxy] Unhandled error: ${msg}`);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
