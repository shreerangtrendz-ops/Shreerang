import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TALLY_BASE_URL = "http://tally.shreerangtrendz.com:9000";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tally-company",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { xmlBody } = await req.json();

        if (!xmlBody) {
            throw new Error("Missing xmlBody in request");
        }

        // Optional company selector via query param or header
        const url = new URL(req.url);
        const company = url.searchParams.get("company") || req.headers.get("x-tally-company") || "";
        const tallyUrl = company
            ? `${TALLY_BASE_URL}?company=${encodeURIComponent(company)}`
            : TALLY_BASE_URL;

        console.log(`[tally-proxy] → ${tallyUrl} (${xmlBody.length} bytes)`);

        const tallyResponse = await fetch(tallyUrl, {
            method: "POST",
            headers: { "Content-Type": "text/xml" },
            body: xmlBody,
            signal: AbortSignal.timeout(60000),
        });

        const responseText = await tallyResponse.text();
        console.log(`[tally-proxy] ← Status ${tallyResponse.status}, ${responseText.length} bytes`);

        if (!tallyResponse.ok) {
            return new Response(JSON.stringify({
                error: `Tally returned ${tallyResponse.status}`,
                details: responseText,
            }), {
                status: tallyResponse.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ xml: responseText }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[tally-proxy] Error: ${msg}`);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
