// supabase/functions/tally-health/index.ts
// Server-side Tally health check — bypasses browser CORS entirely
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS });
    }

    try {
        const r = await fetch("https://tally.shreerangtrendz.com", {
            method: "POST",
            headers: { "Content-Type": "text/xml" },
            body: '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Stock Summary</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>',
            signal: AbortSignal.timeout(8000),
        });

        const text = await r.text();

        const domainOnline = r.ok;
        const tallyOnline = r.ok && text.includes("DSPDISPNAME") && !text.includes("LINEERROR");
        const stockItems = (text.match(/<DSPDISPNAME>/g) || []).length;
        const companyMatch = text.match(/<DSPDISPNAME>(.*?)<\/DSPDISPNAME>/);

        return new Response(
            JSON.stringify({
                domain: domainOnline ? "online" : "offline",
                frps: domainOnline ? "online" : "offline",
                frpc: domainOnline ? "online" : "offline",
                nginx: domainOnline ? "online" : "offline",
                tally: tallyOnline ? "online" : "offline",
                tallyCompany: companyMatch ? companyMatch[1] : "",
                stockItems,
            }),
            { headers: { ...CORS, "Content-Type": "application/json" } }
        );
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return new Response(
            JSON.stringify({
                domain: "offline",
                frps: "offline",
                frpc: "offline",
                nginx: "offline",
                tally: "offline",
                tallyCompany: "",
                stockItems: 0,
                error: msg,
            }),
            { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
        );
    }
});
