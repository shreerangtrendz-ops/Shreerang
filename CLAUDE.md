# SRTPL Horizon — Active Context
*Slim file (~2,500 tokens). Full history in CLAUDE_MASTER.md. Read that for deep context.*
*Last updated: 13-Apr-2026*

## Infrastructure
- **Code:** C:\Shreerang 2026\Horizon Code
- **Supabase:** zdekydcscwhuusliwqaz | https://zdekydcscwhuusliwqaz.supabase.co
- **n8n:** workflow CU6dMm7DCtSP6rMQ at n8n.shreerangtrendz.com (use mobile hotspot — office network blocks VPS)
- **GitHub:** shreerangtrendz-ops/Shreerang | branch: master
- **Vercel:** auto-deploy from master
- **VPS:** 72.61.249.86 | FRP auth: ShreerangFRP2026 | Tally port: 9005
- **Accounts:** shreerangtrendz@gmail.com (primary) + kumarmaru7@gmail.com (secondary)

## Voucher Chain V-01→V-05
grey_purchase → issue_to_mill → jobwork_expenses → rec_from_mill → sales_bills

## 4 Join Keys
- **KEY 1:** grey_purchase.lot_no = issue_to_mill.lot_no = rec_from_mill.grey_lot_no
- **KEY 2:** jobwork_expenses.voucher_number = rec_from_mill.jw_voucher_number (resolved by compute_jw_allocation). party_challan_no = mill's own JW bill no. issue_challan_ref = our issue challan (Tally "Reference No")
- **KEY 3:** rec_from_mill.design_no = sales_bills.design_no = credit_note_items.design_no
- **KEY 4:** sales_bills.bill_number = credit_note.bill_ref | sales_bills.tally_voucher_no = receipt_payment_lines.bill_ref

## Coding Rules (never break)
- NEVER commit via GitHub Desktop — Git CLI only
- ALWAYS Math.abs() on ALL cost display fields
- Gold standard page: SalesBillsPage.jsx (teal theme, FY tabs, SummaryCard, 50-row pagination)
- ALWAYS query information_schema.columns before writing any page or SQL — never assume column names
- File writes to JSX: ALWAYS use Claude's server bash_tool + git push — NEVER Windows-MCP FileSystem (corrupts unicode)
- Supabase import: customSupabase as supabase from @/lib/customSupabaseClient

## CRITICAL: Windows-MCP FileSystem CORRUPTS unicode
Windows-MCP FileSystem write converts non-ASCII to \uXXXX escape sequences visible on screen.
JSX files MUST be written via Claude's server bash_tool → git commit → git push.
Windows-MCP is ONLY safe for plain ASCII files.

## n8n Workflow
- **Current version:** v34 (10-Apr-2026) — voucher sync only
- **Next version:** v35 — adds Ledger Master sync (S_LM step) for customers/suppliers/agents/transporters
- **Status:** v35 NOT YET BUILT — pending Party Masters UI + SQL completion first
- Trigger: POST https://n8n.shreerangtrendz.com/api/v1/workflows/CU6dMm7DCtSP6rMQ/run with X-N8N-API-KEY: n8n_api_45dba335541e42cfa98255662629155c

## Sync Status (13-Apr-2026)
- Resync running since 11-Apr: last_synced_voucher_date was reset to 2022-03-31
- Monitor: SELECT last_synced_voucher_date FROM tally_sync_state WHERE sync_type='vouchers'
- After resync completes: run SELECT * FROM compute_jw_allocation()
- All sync errors fixed (S3, S5b, S_AV_LINES, S_CN_items) ✅

## Party Masters — Current Status (13-Apr-2026)
- **Page:** PartyMastersPage.jsx | Route: /admin/masters
- **Problem:** Page showing unicode escape sequences (\uD83D\uDCCB etc.) — old file still live
- **Root cause:** Windows-MCP corrupts unicode. New file (783 lines) is on Claude's server commit fab8828 but NOT on GitHub yet — needs push
- **To fix:** Need GitHub PAT OR run git push from terminal after pulling Claude's server changes
- **Data gap:** customers/suppliers missing address, GST, city (correct), phone — because n8n v34 only syncs vouchers not ledger masters

## SQL Migrations Applied (13-Apr-2026) ✅
Migration: add_tally_master_fields_v35
- customers: + opening_balance, tally_group, pan_number, transporter_name, enable_broker, distance, tally_sync_at, tally_opening_dr, tally_opening_cr
- suppliers: + opening_balance, tally_group, pan_number, supplier_type, tally_sync_at, tally_opening_dr, tally_opening_cr
- agents: + tally_ledger_name, opening_balance, pan_number, tally_group, tally_sync_at
- transporters: + address, state, pincode, email, gst_number, pan_number, tally_ledger_name, tally_group, opening_balance, status, notes, tally_sync_at
- Indexes: tally_ledger_name on all 4 tables + transporters.name

## Build Plan — In Progress (13-Apr-2026)
ORDER: SQL ✅ → UI update → n8n v35 Ledger Master sync
1. ✅ SQL columns added (migration applied)
2. 🔄 PartyMastersPage.jsx — rebuild with all new fields + profiles (blocked by git push issue)
3. ⬜ n8n v35 — add S_LM step for Tally Ledger Master sync
4. ⬜ After v35 runs — all customer/supplier/agent/transporter fields will populate

## n8n v35 Plan — Ledger Master Sync (S_LM)
New step calls Tally Collection of Ledger Masters:
- Sundry Debtors → upsert customers (on tally_ledger_name)
- Sundry Creditors + Grey/Mill groups → upsert suppliers
- Transport Agencies → upsert transporters
- Broker/Commission/Agent groups → upsert agents

Fields to parse from Tally XML:
NAME, MAILINGNAME, MAILINGADDR (multi-line → join), STATENAME, PINCODE,
LEDGERMOBILE, LEDGEREMAIL, GSTIN, GSTREGISTRATIONTYPE, PANIT,
CREDITPERIOD, OPENINGBALANCE, PARENT, COUNTRYNAME, ISDEEMEDPOSITIVE,
DESPATCH THROUGH (transporter), ENABLE BROKER COMMISSION

## Pages Live
AccountingHub ✅ | RecFromMillPage ✅ | MissingRecFromMillPage ✅
SalesBillsPage ✅ | PurchaseBillsPage ✅ | GreyPurchasePage ✅
ProcessIssuesPage ✅ | DesignLifecyclePage ✅ | DesignCostingPage ✅
PartyMastersPage ✅ (live but unicode issue — needs git push of fix)

## Pending Tasks (priority order)
1. **Push PartyMastersPage fix** — git push from terminal (commit fab8828 waiting)
2. **n8n v35** — build Ledger Master sync step
3. **Party Masters UI** — update to show new fields (opening_balance, PAN, transporter, address)
4. **Font size** — all accounting pages (15px rows, 26px cards, 22px titles)
5. **Mobile hamburger** — AdminLayout.jsx sidebar overlay on <768px
6. **compute_jw_allocation()** — run after resync reaches Apr 2026
7. **DesignGalleryPage** — BunnyNet CDN https://shreerang.b-cdn.net/designs/{design_no}.jpg

## MCP Setup
claude_desktop_config.json at C:\Users\SHRIKUMAR\AppData\Roaming\Claude\
Filesystem + Supabase MCPs configured. Windows-MCP available but DO NOT use for JSX writes.

## Two-File System
- CLAUDE.md = this slim file (loads every session automatically)
- CLAUDE_MASTER.md = full history (read only when deep context needed)
- Update CLAUDE.md pending section after each session
- Append session summary to CLAUDE_MASTER.md after major work
