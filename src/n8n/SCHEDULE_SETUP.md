# SCHEDULE_SETUP.md

n8n workflow: `CU6dMm7DCtSP6rMQ`
Goal: Replace manual "Fetch" button clicks with automatic 30-minute sync trigger.
Date: 09-Apr-2026

---

## Current state

The workflow is triggered manually via the **Execute Workflow** button (or via HTTP trigger).
This means syncs only happen when someone remembers to click.

After this setup, n8n will run the full Tally sync automatically every 30 minutes.

---

## Step-by-step: Add Schedule Trigger node

### Step 1 — Open the workflow

1. Go to `https://n8n.shreerangtrendz.com`
2. Open workflow `CU6dMm7DCtSP6rMQ` (Tally Sync)
3. Click **Edit** (pencil icon, top right)

### Step 2 — Add the Schedule Trigger node

1. Click the **+** button at the top left of the canvas (or drag from an empty spot)
2. Search for **Schedule Trigger**
3. Select it — it will appear as a new node on the canvas

### Step 3 — Configure the Schedule Trigger

In the node settings panel:

| Setting | Value |
|---|---|
| **Trigger Interval** | Every |
| **Value** | `30` |
| **Unit** | Minutes |

Leave all other settings as default.

> If you want more control, use **Cron Expression** mode instead:
> `*/30 * * * *` — every 30 minutes, all day

### Step 4 — Connect the trigger to the workflow

1. The current workflow starts from a **Manual Trigger** or **Webhook** node
2. Find the first actual logic node after that trigger (usually the node that reads `tally_sync_log` — Step S1)
3. Draw a connection from the **Schedule Trigger** output → that first logic node
4. You can keep the Manual Trigger connected too (both triggers can feed the same node)

> n8n supports multiple triggers into one flow. Manual trigger = on-demand, Schedule trigger = automatic.

### Step 5 — Activate the workflow

1. In the top right, toggle the workflow from **Inactive** → **Active**
2. n8n will now run the sync every 30 minutes automatically
3. You can still use the manual Execute button for on-demand syncs

---

## Verify it's working

After activation, wait up to 30 minutes, then:

1. Go to **Executions** tab for this workflow
2. You should see a new execution with trigger type `Schedule`
3. Check the execution log — all steps S1 through S_AV_LINES should show green

Or check in Supabase:
```sql
SELECT synced_at, records_synced, status
FROM tally_sync_log
ORDER BY synced_at DESC
LIMIT 5;
```
The most recent `synced_at` timestamp should be within the last 30 minutes.

---

## Recommended schedule

| Interval | Use case |
|---|---|
| Every 30 min | Default — good balance of freshness vs API load |
| Every 15 min | During active trading hours if near-realtime is needed |
| Every 60 min | Off-hours / weekends (can be set via cron with time windows) |

For time-window cron (only during business hours 8am–8pm IST, every 30 min):
```
*/30 2-14 * * 1-6
```
(UTC 2–14 = IST 7:30–19:30, Mon–Sat)

---

## Troubleshooting

**Executions not appearing after 30 min:**
- Check the workflow toggle — must be **Active** (green dot)
- Check n8n server health: `https://n8n.shreerangtrendz.com/healthz`
- If VPS unreachable, use mobile hotspot and check Docker: `docker ps | grep n8n`

**Sync runs but no new rows in Supabase:**
- S1 reads the last `synced_at` from `tally_sync_log` — if Tally has no new vouchers since last sync, 0 records is correct
- Verify Tally is running and accessible at port 9005 via FRP

**Schedule fires but errors in S4b (grey_purchase):**
- Apply v34 patch first (`N8N_CODE_v34_patch.md`) before enabling schedule
- v33 grey_purchase upsert will fail on multi-lot bills once the DB constraint is in place

---

## Notes

- The Schedule Trigger does not pass any input data to the workflow — the workflow reads its own state from `tally_sync_log` (Step S1), so no parameters are needed
- Office network is blocked — n8n must be accessed via mobile hotspot or VPN if on office wifi
- FRP auth token: `ShreerangFRP2026` | Tally port: `9005`
