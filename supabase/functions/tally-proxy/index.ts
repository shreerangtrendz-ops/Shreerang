import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TALLY_LOCAL_URL = "http://localhost:9000";

serve(async (req) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.text();
        const tallyUrl = `${TALLY_LOCAL_URL}`;

        const tallyResponse = await fetch(tallyUrl, {
            method: "POST",
            headers: { "Content-Type": "text/xml" },
            body: body,
        });

        const responseText = await tallyResponse.text();

        return new Response(responseText, {
            headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
