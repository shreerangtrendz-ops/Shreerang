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
            throw new Error("Missing xmlBody in request");
        }

        const tallyResponse = await fetch(TALLY_URL, {
            method: "POST",
            headers: { "Content-Type": "text/xml" },
            body: xmlBody,
            signal: AbortSignal.timeout(30000) // Tally sometimes takes a while for huge XMLs
        });

        const responseText = await tallyResponse.text();

        return new Response(responseText, {
            headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
