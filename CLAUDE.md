# SRTPL Horizon ERP — Active Context
*Last updated: 21-Apr-2026 | Auto-updated by Claude*

## ══ QUICK REFERENCE ══

### Start of Day (Office PC)
1. Open Tally Prime → load ShreeRang Trendz Pvt. Ltd. company
2. TallyFRP Windows service starts automatically (no CMD needed)
3. n8n syncs every 30 min automatically
4. Verify sync: check tally_sync_log in Supabase

### Emergency: If sync stops
```bash
# From VPS terminal:
curl -s http://172.19.0.1:9005 | grep -o "TallyPrime"
# If empty = Tally not open or frpc not running
# On office PC: sc query TallyFRP (check service status)
# On office PC: sc start TallyFRP (restart if stopped)
```

---

## ══ INFRASTRUCTURE ══

### Machines
| Machine | Role | OS |
|---------|------|----|
| Office PC | Tally server, frpc, BizAnalyst | Windows 11 |
| Laptop (SHRIKUMAR) | Dev, Claude, GitHub | Windows 11 |
| VPS 72.61.249.86 | n8n, frps, nginx, Docker | Ubuntu 22.04 (Hostinger) |

### Key URLs
- Horizon ERP: https://shreerangtrendz.com (Vercel auto-deploy)
- n8n: https://n8n.shreerangtrendz.com (Docker on VPS)
- Supabase: https://zdekydcscwhuusliwqaz.supabase.co
- GitHub: https://github.com/shreerangtrendz-ops/Shreerang (branch: master)
- frps dashboard: http://72.61.249.86:8081 (admin/admin)

### Credentials (non-sensitive)
- FRP auth token: ShreerangFRP2026
- n8n workflow ID: CU6dMm7DCtSP6rMQ
- n8n API key: n8n_api_45dba335541e42cfa98255662629155c
- Supabase project: zdekydcscwhuusliwqaz

---

## ══ TALLY / FRP SETUP ══

### Office PC — Port Map
| Port | Service | Notes |
|------|---------|-------|
| 9005 | Tally HTTP + ODBC | HTTP for n8n sync, ODBC for BizAnalyst |
| 9999 | Tally Gold Gateway | Windows service, always running |

### frpc Config (Office PC: C:\FRP_Office\frpc.toml)
```toml
serverAddr = "72.61.249.86"
serverPort = 7000
auth.method = "token"
auth.token = "ShreerangFRP2026"
[[proxies]]
name = "tally-http"
type = "tcp"
localPort = 9005
remotePort = 9005
[[proxies]]
name = "tally-gold-gateway"
type = "tcp"
localPort = 9999
remotePort = 9001
```

### frpc as Windows Service (office PC — INSTALLED 21-Apr-2026)
```cmd
sc create "TallyFRP" binPath= "\"C:\FRP_Office\frpc.exe\" -c \"C:\FRP_Office\frpc.toml\"" start= auto
sc start TallyFRP   # start manually first time
sc query TallyFRP   # check status
```
Auto-starts on boot, stops on shutdown. NO CMD window needed.

### VPS nginx (DO NOT TOUCH: /etc/nginx/sites-enabled/tally-n8n)
```nginx
upstream tally_backend {
    server 127.0.0.1:9005;    # primary (frpc TCP tunnel)
    server 127.0.0.1:9006 backup;
}
server { listen 9080; proxy_pass http://tally_backend; }
server { listen 443 ssl; server_name tally.shreerangtrendz.com; proxy_pass http://tally_backend; }
```

### n8n Tally Connection
- Check Tally Health node URL: http://172.19.0.1:9005 (Docker bridge → frpc TCP)
- TALLY_URL in code: http://172.19.0.1:9005

### Tally INI (Office PC: D:\Tally New Data\tally.ini)
- ServerPort=9005 | Client Server=Both | Enable ODBC Server=Yes
- Tally Gateway Server=192.168.1.15:9999 (LAN Gold license)
- Data=D:\Tally New Data\Tally data

### Laptop Tally
- Client only, connects to office via LAN: 192.168.1.15:9999
- tally.ini: Data=C:\Tally Data

---

## ══ n8n WORKFLOW ══

### Current Version: FIXED4
File: SRTPL_Tally_Sync_v35_FIXED4.json (imported to n8n)
Version history: v34 → v35 → FIXED → FIXED2 → FIXED3 → FIXED4

### What Changed in FIXED4 vs FIXED3
- Check Tally Health URL: 9080 → 9005 (bypasses nginx, direct TCP)
- TALLY_URL in code: 9080 → 9005
- This fixed the ECONNABORTED 8000ms timeout error

### 13 Sync Steps (all green as of 21-Apr-2026)
| Step | Table | Notes |
|------|-------|-------|
| S3 | sales_bills | conflict: bill_number |
| S4 | purchase_bills | conflict: bill_number |
| S4b | grey_purchase | conflict: tally_voucher_no, lot_no |
| S5 | process_issues | conflict: challan_no, lot_no |
| S5b | issue_to_mill | conflict: lot_no, voucher_date |
| S5c | rec_from_mill | conflict: tally_voucher_no, lot_no |
| S5d | stock_journal | conflict: tally_voucher_no |
| S_CN | credit_note + credit_note_items | |
| S_DN | debit_note | conflict: tally_voucher_no |
| S_JW | jobwork_expenses | conflict: voucher_number |
| S_AV | accounting_vouchers | conflict: voucher_number, voucher_type |
| S_AV_LINES | receipt_payment_lines | conflict: voucher_number, voucher_type, bill_ref |
| S_LM | customers, suppliers, agents, transporters | runs every batch |

### Sync Triggers
- Every 30 min: n8n schedule trigger
- 3x daily: 06:30, 14:30, 21:30 IST cron triggers
- Manual: open n8n UI → Test workflow

### Sync Progress (21-Apr-2026)
- Last synced: 2022-12-15
- Days behind: 1,223
- Batch size: 7 days per run
- Speed: ~400 records/batch, ~30 min/batch
- ETA to reach Apr 2026: ~25 working days (office PC must be on)
- After reaching Apr 2026: run SELECT * FROM compute_jw_allocation()

---

## ══ SUPABASE DATABASE ══

### Core Tally Sync Tables (row counts as of 21-Apr-2026)
| Table | Rows | Size |
|-------|------|------|
| sales_bills | 5,014 | 7.2 MB |
| rec_from_mill | 6,323 | 7.6 MB |
| process_issues | large | 6.6 MB |
| receipt_payment_lines | 15,474 | 6.0 MB |
| jobwork_expenses | 3,076 | 3.2 MB |
| grey_purchase | 2,361 | 1.4 MB |
| credit_note | 1,635 | 1.1 MB |
| issue_to_mill | 2,935 | 1.2 MB |
| purchase_bills | 899 | 0.8 MB |
| accounting_vouchers | 6,226 | 6.6 MB |
| customers | 5,692 | 6.2 MB |
| suppliers | 1,967 | 1.5 MB |
| agents | 733 | 0.4 MB |
| transporters | 225 | 0.3 MB |
| mill_challan_takas | 2,894 | 0.9 MB |

### Migrations Applied (chronological, latest last)
- 20260328: fix_canonical_schema, purchase_bills, fabric triggers
- 20260329-0406: tally field fixes, XML cleanup, costing, RLS policies
- 20260411: create_ai_accounting_tables (7 tables for SmartFinancePage)
- 20260413: add_tally_master_fields_v35, fix_receipt_payment_lines, customer_data_quality
- 20260413: add_gst_filing_status_columns (customers + suppliers)
- 20260421: fix_receipt_payment_lines_id_default (gen_random_uuid())
- 20260421: link_transporters_to_sales_bills (tally_ledger_name = name)

### Important Functions
- compute_jw_allocation() — matches jobwork_expenses to rec_from_mill, run after full resync
- update_rec_costing() — nightly at 20:30 UTC via pg_cron
- update_jobwork_recon() — nightly at 20:30 UTC via pg_cron

### GST Filing Status (columns ready, API not yet integrated)
- customers.gst_filing_status: regular/composition/non_filer/suspended/cancelled
- customers.gst_last_return_period: YYYY-MM format
- Will be populated by n8n weekly cron calling GSTN public API

---

## ══ VOUCHER CHAIN & JOIN KEYS ══

V-01 → V-02 → V-03 → V-04 → V-05
grey_purchase → issue_to_mill → jobwork_expenses → rec_from_mill → sales_bills

| Key | Join |
|-----|------|
| KEY 1 | grey_purchase.lot_no = issue_to_mill.lot_no = rec_from_mill.grey_lot_no |
| KEY 2 | jobwork_expenses.voucher_number = rec_from_mill.jw_voucher_number |
| KEY 3 | rec_from_mill.design_no = sales_bills.design_no |
| KEY 4 | sales_bills.bill_number = credit_note.bill_ref |
| KEY 5 | sales_bills.tally_voucher_no = receipt_payment_lines.bill_ref |

Design code pattern: SR-MP-YYYY-NNN (Tally cost centre for design-level P&L)

---

## ══ CODING RULES (NEVER BREAK) ══

1. NEVER commit via GitHub Desktop — Git CLI only
2. ALWAYS Math.abs() on ALL cost display fields (job_amount is negative = Tally credit convention)
3. JSX files: ALWAYS Claude server bash_tool → git push. NEVER Windows-MCP FileSystem (corrupts unicode)
4. Supabase import: `import { customSupabase as supabase } from '@/lib/customSupabaseClient'`
5. ALWAYS query information_schema.columns before writing SQL or new pages
6. Gold standard page: SalesBillsPage.jsx (teal theme, FY tabs, SummaryCard, 50-row pagination)
7. Cost/mtr = grey_purchase_rate + Math.abs(job_rate). Process loss absorbed into valuation rate.

---

## ══ TECH STACK ══

| Layer | Tech | Details |
|-------|------|---------|
| Frontend | React 18 + Vite | Vercel auto-deploy from GitHub master |
| Backend | Supabase PostgreSQL | zdekydcscwhuusliwqaz |
| Sync | n8n | Docker on VPS, workflow CU6dMm7DCtSP6rMQ |
| Tunnel | frpc/frps v0.58.1 | Office PC → VPS TCP tunnel |
| CDN | Bunny CDN | shreerang-s zone, design images |
| Fonts | Playfair Display, DM Sans, JetBrains Mono | |
| Accounting | Tally Prime GOLD | Source of truth |

---

## ══ PAGES LIVE (Vercel) ══

| Page | Path | Lines | Status |
|------|------|-------|--------|
| AccountingHub v35 | /admin/accounting/hub | 991 | ✅ 5 tabs |
| PartyMastersPage | /admin/masters | 1039 | ✅ inline edit |
| SmartFinancePage | /admin/smart-finance | 1133 | ⚠️ build error |
| SalesBillsPage | /admin/accounting/sales-bills | ~800 | ✅ |
| RecFromMillPage | /admin/accounting/rec-from-mill | ~700 | ✅ |
| GreyPurchasePage | /admin/accounting/grey-purchase | ~600 | ✅ |
| ProcessIssuesPage | /admin/accounting/process-issues | ~800 | ✅ |
| DesignLifecyclePage | /admin/design-lifecycle | ~500 | ✅ |
| AdminLayout | /src/components/admin/ | 66 | ✅ mobile hamburger |
| AdminSidebar | /src/components/admin/ | 377 | ✅ Smart Finance added |

### Vercel Build Error (PENDING FIX)
SmartFinancePage.jsx exists locally but was never git-pushed.
Fix: `cd "C:\Shreerang 2026\Horizon Code" && git add -A && git commit -m "Deploy v35" && git push origin master`

---

## ══ PENDING TASKS ══

### High Priority
1. **YOU** — git push: `cd "C:\Shreerang 2026\Horizon Code" && git add -A && git commit -m "Deploy v35 complete" && git push origin master`
2. **AUTO** — Tally sync catching up (25 working days to reach Apr 2026)
3. **ME** — compute_jw_allocation() after sync reaches Apr 2026

### Medium Priority
4. **ME** — GST filing status: GSTN API integration in n8n
5. **ME** — DesignGalleryPage: BunnyNet CDN https://shreerang.b-cdn.net/designs/{design_no}.jpg
6. **ME** — Outstanding Recv/Pay pages accuracy review

### Low Priority
7. BizAnalyst: schedule sync to 1PM + 5:30PM only (manual setting in BizAnalyst)

---

## ══ MCP TOOLS ON LAPTOP ══

| Tool | Works? | Used For |
|------|--------|----------|
| filesystem | ✅ | Read/write ASCII files on laptop |
| Windows-MCP PowerShell | ⚠️ Sometimes times out | Run commands on laptop |
| Supabase MCP | ✅ | Full DB access |
| chrome-devtools | ✅ | Control Chrome browser |
| shreerang-n8n | ✅ Connected | n8n workflow control |
| rube | ❌ No API key | GitHub commits (broken) |

Note: Windows-MCP can see AnyDesk and take screenshots of office PC but cannot run commands on it.
For office PC commands: use AnyDesk manually or VPS terminal if SSH available.

---

## ══ FY 2024-25 BUSINESS NUMBERS ══

| Metric | Value |
|--------|-------|
| Sales | ₹15.46 Cr (2,450 bills, 487 customers) |
| Grey Fabric Cost | ₹5.67 Cr |
| Jobwork Cost | ₹4.80 Cr |
| Credit Notes | ₹1.29 Cr |
| Gross Profit | ~₹3.70 Cr (24% margin) |
| Output GST | ₹73.6L (IGST ₹63.4L + CGST/SGST ₹10.2L) |
| ITC (Purchase GST) | ₹27L |
| Net GST Liability | ~₹46.6L |
| Interstate Sales | 88% (IGST) |
| Top States | MH ₹5.69Cr, KL ₹2.63Cr, GJ ₹2.14Cr, RJ ₹2.06Cr |
| Top Customer | Zagara Fashion ₹52.65L |

---

## ══ TWO-FILE SYSTEM ══
- CLAUDE.md = this file, loads every session, updated frequently
- CLAUDE_MASTER.md = full technical history, read when deep context needed
## Migration added 21-Apr-2026 (evening)
8. fix_sales_bills_trigger_security_definer
   - update_ai_purchase_memory trigger was failing with 500 on chunk50 of sales upsert
   - Cause: trigger runs UPDATE on customers table but RLS blocked it (not service_role context)
   - Fix: SECURITY DEFINER + EXCEPTION handler so sales insert never fails due to memory update
   - Also: Opus 4.7 Chrome extension session committed TallyAccountingHub v36 (627d353)
     v36 changes: fixed monthly chart loading, sync catch-up progress bar, Outstanding KPI,
     default FY 2025-26, graceful Tally offline handling, no-cors health check
