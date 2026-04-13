# SRTPL Horizon — Active Context
*Slim file (~2,500 tokens). Full history in CLAUDE_MASTER.md. Read that for deep context.*
*Last updated: 13-Apr-2026 (evening — merged + session update)*

## Infrastructure
- **Code:** C:\Shreerang 2026\Horizon Code
- **Supabase:** zdekydcscwhuusliwqaz | https://zdekydcscwhuusliwqaz.supabase.co
- **n8n:** workflow CU6dMm7DCtSP6rMQ at n8n.shreerangtrendz.com (use mobile hotspot — office network blocks VPS)
- **GitHub:** shreerangtrendz-ops/Shreerang | branch: master
- **Vercel:** auto-deploy from master
- **VPS:** 72.61.249.86 | FRP auth: ShreerangFRP2026 | Tally port: 9005
- **Accounts:** shreerangtrendz@gmail.com (primary) + kumarmaru7@gmail.com (secondary)

## Voucher Chain V-01->V-05
grey_purchase -> issue_to_mill -> jobwork_expenses -> rec_from_mill -> sales_bills

## 4 Join Keys
- KEY 1: grey_purchase.lot_no = issue_to_mill.lot_no = rec_from_mill.grey_lot_no
- KEY 2: jobwork_expenses.voucher_number = rec_from_mill.jw_voucher_number (resolved by compute_jw_allocation). party_challan_no = mill's own JW bill no. issue_challan_ref = our issue challan (Tally "Reference No")
- KEY 3: rec_from_mill.design_no = sales_bills.design_no = credit_note_items.design_no
- KEY 4: sales_bills.bill_number = credit_note.bill_ref | sales_bills.tally_voucher_no = receipt_payment_lines.bill_ref

## Coding Rules (never break)
- NEVER commit via GitHub Desktop -- Git CLI only
- ALWAYS Math.abs() on ALL cost display fields
- Gold standard page: SalesBillsPage.jsx (teal theme, FY tabs, SummaryCard, 50-row pagination)
- ALWAYS query information_schema.columns before writing any page or SQL -- never assume column names
- File writes to JSX: ALWAYS use Claude's server bash_tool + git push -- NEVER Windows-MCP FileSystem (corrupts unicode)
- Supabase import: customSupabase as supabase from @/lib/customSupabaseClient

## CRITICAL: Windows-MCP FileSystem CORRUPTS unicode
Windows-MCP FileSystem write converts non-ASCII to \uXXXX escape sequences visible on screen.
JSX files MUST be written via Claude's server bash_tool -> git commit -> git push.
Windows-MCP is ONLY safe for plain ASCII files (CLAUDE.md updates are safe via Windows-MCP write).

## n8n Workflow -- v35 STATUS LIVE
- Current version: v35 (13-Apr-2026) -- vouchers + Ledger Master sync (S_LM)
- Active file: SRTPL_Tally_Sync_v35_FIXED2.json (latest -- two rounds of bug fixes)
- v35 first run result: partial -> S_AV_LINES now fixed, S_LM fully working
- S_LM result: 8,681 ledgers -> 5,627 customers, 1,901 suppliers, 511 agents, 0 transporters
- transporters=0: Tally group name not matching routeLedger() rule -- check actual group name in Tally
- Trigger: POST https://n8n.shreerangtrendz.com/api/v1/workflows/CU6dMm7DCtSP6rMQ/run with X-N8N-API-KEY: n8n_api_45dba335541e42cfa98255662629155c

## n8n v35 -- Bugs Fixed (13-Apr-2026)
Round 1 (FIXED.json): 7 function declarations inside try/else blocks -> strict mode SyntaxError. Moved all to top level.
Round 2 (FIXED2.json): getAddress() had literal newline inside split('') -> SyntaxError at line 1376. Rewrote function. Also fixed decodeHtml() to handle &#10;/&#13;, city never falls back to address fragment.

## Sync Status (13-Apr-2026 evening)
- Resync running: batch at ~2022-08 (1355 days behind as of last check)
- Monitor: SELECT last_synced_voucher_date FROM tally_sync_state WHERE sync_type='vouchers'
- After resync completes: run SELECT * FROM compute_jw_allocation()
- All steps working: S3->S_AV OK | S_AV_LINES OK (fixed) | S_LM OK

## SQL Migrations Applied
add_tally_master_fields_v35 (13-Apr-2026)
- customers: + opening_balance, tally_group, pan_number, transporter_name, enable_broker, distance, tally_sync_at, tally_opening_dr, tally_opening_cr
- suppliers: + opening_balance, tally_group, pan_number, supplier_type, tally_sync_at, tally_opening_dr, tally_opening_cr
- agents: + tally_ledger_name, opening_balance, pan_number, tally_group, tally_sync_at
- transporters: + address, state, pincode, email, gst_number, pan_number, tally_ledger_name, tally_group, opening_balance, status, notes, tally_sync_at
- Indexes: tally_ledger_name on all 4 tables + transporters.name

fix_receipt_payment_lines_upsert_null_bill_ref (13-Apr-2026)
- Root cause: PostgREST 500 when on_conflict column is nullable without NULLS NOT DISTINCT
- Fix: UNIQUE NULLS NOT DISTINCT (voucher_number, voucher_type, bill_ref) + bill_ref DEFAULT ''

create_ai_accounting_tables (13-Apr-2026)
- ocr_uploads, gst_recon_sessions, gst_recon_lines, bank_recon_sessions, bank_recon_lines, tds_entries, tds_vendor_summary

fix_customer_data_quality (13-Apr-2026)
- Decoded HTML entities (&#10; etc.) from address/city in customers + suppliers
- Cleared address fragments from city column (e.g. "Shop No-10", "3rd Floor") -- 1,613 real cities remain
- Trimmed trailing commas from addresses

## Smart Finance Module -- NEW (13-Apr-2026)
File: src/pages/SmartFinancePage.jsx | Route: /smart-finance | Needs git push
4 features: Bill Scanner (Claude Vision OCR) | GST Recon (GSTR-2B JSON) | Bank Recon (paste statement) | TDS Tracker (Sec 194C, CSV export)

## Party Masters -- Current Status (13-Apr-2026)
- Page: PartyMastersPage.jsx (1,039 lines) | Route: /admin/masters
- New features: Inline field editing (click any field), completeness % score per party, summary stats bar, "show incomplete only" filter, state/agent/city filters, proper GST/address display
- Status: Built, needs git push via terminal with PAT
- Data quality post-v35: 5,627 customers + 1,901 suppliers + 511 agents have address/phone/PAN from S_LM
- transporters: 0 synced -- check Tally group name for transporters, update routeLedger() in n8n

## Pages Live
AccountingHub OK | RecFromMillPage OK | MissingRecFromMillPage OK
SalesBillsPage OK | PurchaseBillsPage OK | GreyPurchasePage OK
ProcessIssuesPage OK | DesignLifecyclePage OK | DesignCostingPage OK
PartyMastersPage OK (rebuilt version pending push) | SmartFinancePage (pending push)

## Pending Tasks (priority order)
1. git push -- PartyMastersPage.jsx (1,039 lines) + SmartFinancePage.jsx via terminal with PAT
2. Import n8n FIXED2.json -- replace v35 workflow in n8n dashboard
3. Fix transporters sync -- find actual Tally group name -> update routeLedger() in n8n
4. GST/State in Tally -- most customer ledgers have no GSTIN/StateName; must be filled in Tally to sync
5. Font size -- all accounting pages (15px rows, 26px cards, 22px titles)
6. Mobile hamburger -- AdminLayout.jsx sidebar overlay on <768px
7. compute_jw_allocation() -- run after resync reaches Apr 2026
8. DesignGalleryPage -- BunnyNet CDN https://shreerang.b-cdn.net/designs/{design_no}.jpg

## MCP Setup
claude_desktop_config.json at C:\Users\SHRIKUMAR\AppData\Roaming\Claude\
Filesystem + Supabase MCPs configured. Windows-MCP available but DO NOT use for JSX writes.

## Two-File System
- CLAUDE.md = this slim file (loads every session automatically) -- safe to write via Windows-MCP (ASCII only)
- CLAUDE_MASTER.md = full history (read only when deep context needed)
- Update CLAUDE.md at end of each session
- Append session summary to CLAUDE_MASTER.md after major work
