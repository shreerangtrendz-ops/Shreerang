// supabase/functions/tally-health/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TALLY_URL = "https://tally.shreerangtrendz.com";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS });
    }

    try {
        // Step 1: Check if tunnel/gateway is reachable (simple GET)
        const gatewayReq = await fetch(TALLY_URL, {
            method: "GET",
            signal: AbortSignal.timeout(8000),
        });
        const gatewayText = await gatewayReq.text();
        const tunnelOnline = gatewayReq.ok;
        const gatewayRunning = tunnelOnline && (
            gatewayText.includes("License server is Running") ||
            gatewayText.includes("TallyPrime") ||
            gatewayText.includes("Tally")
        );

        if (!tunnelOnline) {
            return new Response(JSON.stringify({
                domain: "offline", frps: "offline", frpc: "offline",
                nginx: "offline", tally: "offline",
                tallyCompany: "", stockItems: 0,
                status: "tunnel_unreachable"
            }), { headers: { ...CORS, "Content-Type": "application/json" } });
        }

        if (!gatewayRunning) {
            // Tunnel works but not Tally response
            return new Response(JSON.stringify({
                domain: "online", frps: "online", frpc: "online",
                nginx: "online", tally: "offline",
                tallyCompany: "", stockItems: 0,
                status: "gateway_not_tally"
            }), { headers: { ...CORS, "Content-Type": "application/json" } });
        }

        // Step 2: Try XML POST to get company data (needs Tally Prime open)
        const TALLY_XML = `<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Companies</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

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
            const tallyText = await tallyReq.text();

            // Check if actual Tally data (not just gateway page)
            if (tallyText.includes("<ENVELOPE>") || tallyText.includes("<NAME>") || tallyText.includes("<COMPANY>")) {
                tallyOnline = true;
                status = "tally_open";
                // Extract company name
                const match = tallyText.match(/<NAME>(.*?)<\/NAME>/i)
                    || tallyText.match(/<BASICCOMPANYNAME>(.*?)<\/BASICCOMPANYNAME>/i);
                tallyCompany = match ? match[1].trim() : "ShreeRang Trendz";
                stockItems = (tallyText.match(/<NAME>/g) || []).length;
            } else if (tallyText.includes("License server is Running")) {
                // Gateway only - Tally Prime not open
                tallyOnline = false;
                status = "tally_closed";
            }
        } catch {
            // XML request failed but gateway is up
            tallyOnline = false;
            status = "tally_closed";
        }

        return new Response(JSON.stringify({
            domain: "online",
            frps: "online",
            frpc: "online", 
            nginx: "online",
            tally: tallyOnline ? "online" : "offline",
            tallyCompany,
            stockItems,
            status,
        }), { headers: { ...CORS, "Content-Type": "application/json" } });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return new Response(JSON.stringify({
            domain: "offline", frps: "offline", frpc: "offline",
            nginx: "offline", tally: "offline",
            tallyCompany: "", stockItems: 0, error: msg,
            status: "error"
        }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    }
});
