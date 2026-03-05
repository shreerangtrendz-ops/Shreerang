import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TALLY_URL = "https://tally.shreerangtrendz.com";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { xmlBody } = await req.json();

        if (!xmlBody) {
            console.error("[tally-proxy] Missing xmlBody in request JSON");
            throw new Error("Missing xmlBody in request");
        }

        console.log(`[tally-proxy] Forwarding XML to Tally (${xmlBody.length} bytes)`);

        const tallyResponse = await fetch(TALLY_URL, {
            method: "POST",
            headers: { "Content-Type": "text/xml" },
            body: xmlBody,
            signal: AbortSignal.timeout(60000) // Tally sometimes takes a while for huge XMLs
        });

        const responseText = await tallyResponse.text();
        console.log(`[tally-proxy] Received from Tally: Status ${tallyResponse.status}, Length ${responseText.length}`);

        if (!tallyResponse.ok) {
            return new Response(JSON.stringify({
                error: `Tally returned ${tallyResponse.status}`,
                details: responseText
            }), {
                status: tallyResponse.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(responseText, {
            headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[tally-proxy] Execution error: ${msg}`);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
