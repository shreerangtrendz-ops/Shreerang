# Shreerang Trendz ERP — Knowledge Base
**Last Updated:** 07 March 2026 | **Maintained by:** Claude AI Sessions

---

## 🏢 BUSINESS CONTEXT
- **Company:** Shreerang Trendz Pvt. Ltd. (textile converter, Surat, Gujarat)
- **GST:** 24AAUCS2915F1Z8
- **Live Site:** https://www.shreerangtrendz.com/admin/dashboard
- **GitHub:** github.com/shreerangtrendz-ops/Shreerang (master branch)
- **Vercel:** Deployed automatically on every GitHub push to master

---

## 🔑 CREDENTIALS REFERENCE

| Service | Details |
|---------|---------|
| **Supabase Project** | zdekydcscwhuusliwqaz |
| **Supabase URL** | https://zdekydcscwhuusliwqaz.supabase.co |
| **Supabase Service Key** | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg |
| **KVM VPS** | 72.61.249.86 — root / Shreerang2014. |
| **FRP Auth Token** | ShreerangFRP2026 |
| **Tally FRP URL** | https://tally.shreerangtrendz.com (HTTPS via Nginx) |
| **n8n (self-hosted)** | http://72.61.249.86:32771 — admin / shreerang_auto |
| **Bunny CDN** | shreerang.b-cdn.net | API Key: c63b3837-120a-46bf-b953-191f40f9059c5c9f12ae-f798-4293-abb2-359df5942b06 |

---

## 🏗️ ARCHITECTURE

```
Browser → Vercel (React/Vite)
             ↓
    api/tally-proxy.js (Vercel serverless)
             ↓
    supabase/functions/tally-proxy (Deno Edge Function)
             ↓
    https://tally.shreerangtrendz.com (Nginx on KVM)
             ↓
    FRP Tunnel → Tally HTTP Server (port 9000 locally)
             ↓
    Tally Prime (Windows PC, Surat office)
```

### Storage Architecture:
- **Tally Data** → Supabase PostgreSQL (BizAnalyst layer)
- **Website Images** → Bunny CDN (shreerang.b-cdn.net)
- **Raw files/PDFs** → Google Drive 2TB
- **n8n automation** → Self-hosted KVM (NOT cloud)

---

## ✅ COMPLETED IMPLEMENTATIONS

### Database Tables (All Created)
- `tally_companies` — 2 companies registered (SRTPL Old 2013-2019, SRTPL Current 2019-2027)
- `tally_sync_log` — 35+ sync records logged
- `tally_sync_state` — delta sync state tracking
- `finish_fabrics` — fabric catalogue with 11 extra fields
- `challans` — delivery challans
- `manufacturing_entries` — job work records
- `job_workers` — job worker management
- All existing tables: purchase_bills, sales_bills, suppliers, customers, etc.

### Edge Functions (Deployed on Supabase)
- `tally-proxy` — proxies XML to Tally via FRP tunnel (CORRECT URL: https://tally.shreerangtrendz.com)
- `tally-health` — infrastructure health check (returns live status of all components)
- All other existing functions (ai-suggestions, send-email, etc.)

### Vercel API Routes
- `api/tally-proxy.js` v3 — Routes through Supabase edge function (CORRECT)
- `api/tally-sync.js` v4 — Chunked 7-day delta sync, detects Tally dialog states

### Dashboard Features
- Tally Sync Control Centre (/admin/tally-sync) — LIVE status, company selector, sync buttons
- Infrastructure Health panel — shows all 6 components live
- Suppliers (2,586) and Sales Agents (498) — synced ✅
- Purchase Bills & Sales Bills pages — schema ready, waiting for voucher data

### FRP Infrastructure
- frps running on KVM-1 VPS (72.61.249.86) — port 7000 frp, port 9000 vhostHTTP
- Nginx routes tally.shreerangtrendz.com → FRP → Tally
- Task Scheduler on Windows PC runs frpc.exe at startup
- frpc.toml auth token: ShreerangFRP2026

---

## 🔧 CRITICAL FIXES APPLIED (This Session)

### 1. tally-proxy Edge Function URL Fix
- **Problem:** Function used https://tally.shreerangtrendz.com:9000 (wrong port) → 60-second timeouts
- **Fix:** Changed to https://tally.shreerangtrendz.com (Nginx handles SSL, no explicit port needed)
- **Result:** Proxy now connects in <300ms (confirmed via tally-health)

### 2. tally-proxy Vercel Route Fix
- **Problem:** Vercel api/tally-proxy.js called Tally directly with wrong HTTPS URL
- **Fix:** Vercel proxy now routes through Supabase edge function
- **File:** api/tally-proxy.js v3

### 3. Chunked Sync
- **Problem:** Voucher queries for large date ranges (90 days) caused Tally timeouts
- **Fix:** api/tally-sync.js v4 uses 7-day chunks + detects Tally Import dialog state
- **Error detection:** If Tally returns Import dialog XML, sync shows clear error message

---

## ⚠️ PENDING WORK

### 🔴 IMMEDIATE — Required Before Voucher Sync Works
1. **Close Tally Import Dialog** — On the Tally PC (via Google Remote Desktop):
   - Press **ESC** multiple times to close any open dialogs
   - Return to **Gateway of Tally** main screen
   - The sync cannot get vouchers while any dialog is open
   
2. **Add 3 More Tally Companies** — User needs to provide actual 5 company names:
   - Currently registered: SRTPL Old (2013-2019), SRTPL Current (2019-2027)
   - Need: 3 more company names from Tally
   - SQL: `INSERT INTO tally_companies (company_name, tally_alias, period_from, period_to, is_active) VALUES (...)`

### 🟡 NEXT PHASE — After Voucher Sync is Working

3. **n8n Daily Auto-Sync** — Import workflow from repo:
   - File: n8n-daily-tally-sync-v3.json (at repo root)
   - n8n URL: http://72.61.249.86:32771
   - Import via n8n UI → Settings → Import workflow

4. **Two-Way Sync (Dashboard → Tally)** — Push data from dashboard back to Tally:
   - Need: api/tally-push.js (not yet created)
   - XML format: TALLYMESSAGE with VOUCHER objects

5. **FinishFabric Form** — Update src/pages/FinishFabricForm.jsx with new fields:
   - Width, GSM, composition, color family, process type, MOQ, price, stock, bunny_image_url

6. **Bunny CDN Integration** — Connect product images to fabric SKUs:
   - Upload endpoint exists (bulk-upload-products edge function)
   - Need: UI file picker → Bunny CDN → store URL in finish_fabrics.bunny_image_url

7. **Outstanding Receivable/Payable** — XML query to fetch from Tally:
   - Need: Correct TDL XML for outstanding bills collection
   - Current status: Schema exists, needs data

### 🟢 FUTURE IMPROVEMENTS

8. **AI-Powered Sync** — Use Claude API to:
   - Auto-categorize vouchers by fabric type
   - Detect anomalies in purchase/sales data
   - Generate smart reports

9. **5 Company Multi-Sync** — Sync all 5 companies in parallel
10. **WhatsApp Notifications** — Alert on sync failures or outstanding reminders

---

## 🐛 KNOWN ISSUES & SOLUTIONS

| Issue | Root Cause | Solution |
|-------|-----------|---------|
| Voucher sync returns 0 records | Tally showing Import dialog | Press ESC in Tally → Gateway screen |
| tally-health shows "Cotton Fabrics" as company | Stock Summary report shows stock groups, not company name | This is correct behavior — Cotton Fabrics is a stock group |
| n8n shows Offline | n8n isn't running on KVM | SSH to 72.61.249.86, run: cd /opt/n8n && docker-compose up -d |
| Sync "Edge Function returned non-2xx" | Old error before proxy fix | Fixed — should not occur anymore |

---

## 📋 TALLY XML REFERENCE

### Working Queries:
```xml
<!-- Stock Summary (WORKS - fast response) -->
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Stock Summary</REPORTNAME>
    <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>

<!-- Purchase Vouchers (Use 7-day chunks!) -->
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES>
      <SVFROMDATE>20260201</SVFROMDATE>
      <SVTODATE>20260207</SVTODATE>
      <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>
```

### Tally Response Patterns:
- **Import dialog active:** Returns XML containing `<IMPORTFILE></IMPORTFILE>` — means ESC needed
- **LINEERROR:** Tally rejected the XML format
- **DSPDISPNAME:** Stock item name in Stock Summary
- **VOUCHER tag:** Actual voucher data

---

## 🖥️ DAILY OPERATIONS

### When Tally PC Starts:
1. FRP tunnel auto-starts via Task Scheduler ✅
2. If tunnel doesn't auto-start: Open CMD → `cd C:\frp_0.58.1_windows_amd64` → `frpc.exe -c frpc.toml`
3. Keep CMD window open while using Tally
4. Tally HTTP Server: Permanent — always enabled on port 9000

### Starting n8n on KVM (if offline):
```bash
ssh root@72.61.249.86  # password: Shreerang2014.
docker ps -a  # check if n8n container exists
docker start n8n  # or: cd /opt/n8n && docker-compose up -d
```

### Manual Sync:
- Visit: https://www.shreerangtrendz.com/admin/tally-sync
- Select company: ShreeRang Trendz Pvt. Ltd. - (from 1-Apr-2019)
- Click "Sync Bills Now" or individual sync buttons

---

## 🔄 SYNC FLOW (How It Works)

1. User clicks "Pull Purchase Bills" on dashboard
2. React calls `/api/tally-sync` (Vercel function)
3. tally-sync fetches delta date from Supabase `tally_sync_state`
4. tally-sync calls `/api/tally-proxy` with XML in 7-day chunks
5. Vercel proxy calls Supabase edge function `tally-proxy`
6. Edge function POSTs XML to `https://tally.shreerangtrendz.com`
7. Nginx on KVM routes to FRP tunnel → Tally HTTP port 9000
8. Tally responds with XML voucher data
9. tally-sync parses XML → upserts into Supabase purchase_bills/sales_bills
10. tally_sync_log updated with results
11. tally_sync_state updated with new last_synced_voucher_date

---

## 📁 KEY FILE LOCATIONS

| File | Purpose |
|------|---------|
| api/tally-sync.js | Main sync handler (v4 chunked) |
| api/tally-proxy.js | Vercel proxy → Supabase edge |
| supabase/functions/tally-proxy/index.ts | Edge function (correct URL) |
| supabase/functions/tally-health/index.ts | Health check |
| src/pages/TallySyncDashboard.jsx | Main sync UI |
| src/components/TallyHealthPanel.jsx | Infrastructure status panel |
| frp-setup/frpc.toml | FRP client config for Tally PC |
| frp-setup/START_TALLY_TUNNEL.bat | Manual FRP start script |

---

*Knowledge Base maintained by Claude AI browser extension sessions.*
*Always update this file when making architecture changes.*
