// supabase/functions/tally-health/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TALLY_URL = "http://tally.shreerangtrendz.com:9000";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS });
    }

    try {
        const r = await fetch(TALLY_URL, {
            method: "POST",
            headers: { "Content-Type": "text/xml" },
            body: '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Companies</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>',
            signal: AbortSignal.timeout(8000),
        });

        const text = await r.text();
        const domainOnline = r.ok;
        const tallyOnline = r.ok && text.length > 50 && !text.includes("LINEERROR");

        // Extract active company name from List of Companies response
        const companyMatch = text.match(/<NAME\.LIST[^>]*>([\s\S]*?)<\/NAME\.LIST>/i)
            || text.match(/<BASICCOMPANYNAME>(.*?)<\/BASICCOMPANYNAME>/i)
            || text.match(/<NAME>(.*?)<\/NAME>/i);
        const tallyCompany = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        const stockItems = (text.match(/<BASICCOMPANYNAME>/g) || []).length;

        return new Response(JSON.stringify({
            domain: domainOnline ? "online" : "offline",
            frps: domainOnline ? "online" : "offline",
            frpc: domainOnline ? "online" : "offline",
            nginx: domainOnline ? "online" : "offline",
            tally: tallyOnline ? "online" : "offline",
            tallyCompany,
            stockItems,
            rawLength: text.length,
        }), { headers: { ...CORS, "Content-Type": "application/json" } });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return new Response(JSON.stringify({
            domain: "offline", frps: "offline", frpc: "offline",
            nginx: "offline", tally: "offline",
            tallyCompany: "", stockItems: 0, error: msg,
        }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    }
});
