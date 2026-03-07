import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-migration-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Security: require a migration key header
  const migKey = req.headers.get("x-migration-key");
  if (migKey !== "shreerang-migrate-2026") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
  }

  const pool = new Pool(Deno.env.get("SUPABASE_DB_URL"), 1);
  const client = await pool.connect();
  const results: Record<string, string> = {};

  try {
    // 1. tally_companies
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS tally_companies (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name    text NOT NULL UNIQUE,
        tally_alias     text,
        period_from     date,
        period_to       date,
        is_active       boolean DEFAULT true,
        is_default      boolean DEFAULT false,
        last_synced_at  timestamptz,
        created_at      timestamptz DEFAULT now()
      )
    `);
    results["tally_companies"] = "created ✅";

    // 2. Insert companies
    await client.queryObject(`
      INSERT INTO tally_companies (company_name, tally_alias, period_from, period_to, is_active, is_default) VALUES
        ('ShreeRang Trendz Pvt. Ltd. - (from 1-Apr-2019)', 'SRTPL Current', '2019-04-01', '2027-03-31', true, true),
        ('ShreeRang Trendz Pvt. Ltd. - (from 1-Apr-2013)', 'SRTPL Old', '2013-04-01', '2019-03-31', true, false)
      ON CONFLICT (company_name) DO NOTHING
    `);
    results["companies_data"] = "inserted ✅";

    // 3. tally_sync_log column
    await client.queryObject(`ALTER TABLE tally_sync_log ADD COLUMN IF NOT EXISTS last_voucher_date date`);
    results["sync_log_column"] = "added ✅";

    // 4. tally_sync_state
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS tally_sync_state (
        sync_type                text PRIMARY KEY,
        last_synced_voucher_date date,
        total_records_synced     integer DEFAULT 0,
        updated_at               timestamptz DEFAULT now()
      )
    `);
    results["tally_sync_state"] = "created ✅";

    // 5. job_workers column
    await client.queryObject(`ALTER TABLE job_workers ADD COLUMN IF NOT EXISTS manufacturing_entry_required BOOLEAN DEFAULT true`);
    results["job_workers_column"] = "added ✅";

  } catch (err) {
    results["error"] = err instanceof Error ? err.message : String(err);
  } finally {
    client.release();
    await pool.end();
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...CORS, "Content-Type": "application/json" }
  });
});
