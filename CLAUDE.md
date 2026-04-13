# SRTPL Horizon -- Active Context
*Last updated: 13-Apr-2026 (night)*

## Infrastructure
- Code: C:\Shreerang 2026\Horizon Code
- Supabase: zdekydcscwhuusliwqaz | https://zdekydcscwhuusliwqaz.supabase.co
- n8n: workflow CU6dMm7DCtSP6rMQ at n8n.shreerangtrendz.com (mobile hotspot only)
- GitHub: shreerangtrendz-ops/Shreerang | branch: master
- Vercel: auto-deploy from master
- VPS: 72.61.249.86 | FRP auth: ShreerangFRP2026 | Tally port: 9005
- Accounts: shreerangtrendz@gmail.com (primary) + kumarmaru7@gmail.com (secondary)

## Voucher Chain V-01->V-05
grey_purchase -> issue_to_mill -> jobwork_expenses -> rec_from_mill -> sales_bills

## 4 Join Keys
- KEY 1: grey_purchase.lot_no = issue_to_mill.lot_no = rec_from_mill.grey_lot_no
- KEY 2: jobwork_expenses.voucher_number = rec_from_mill.jw_voucher_number (resolved by compute_jw_allocation)
- KEY 3: rec_from_mill.design_no = sales_bills.design_no = credit_note_items.design_no
- KEY 4: sales_bills.bill_number = credit_note.bill_ref | sales_bills.tally_voucher_no = receipt_payment_lines.bill_ref

## Coding Rules (never break)
- NEVER commit via GitHub Desktop -- Git CLI only
- ALWAYS Math.abs() on ALL cost display fields
- Gold standard page: SalesBillsPage.jsx (teal theme, FY tabs, SummaryCard, 50-row pagination)
- ALWAYS query information_schema.columns before writing any page or SQL
- JSX files: ALWAYS Claude server bash_tool + git push -- NEVER Windows-MCP FileSystem
- Supabase import: customSupabase as supabase from @/lib/customSupabaseClient

## CRITICAL: Windows-MCP CORRUPTS unicode in JSX files
JSX must go via Claude server bash_tool -> git commit -> push. Windows-MCP only safe for ASCII (like this file).

## n8n Workflow -- FIXED3 is latest
- Current file: SRTPL_Tally_Sync_v35_FIXED3.json -- import this into n8n
- FIXED3 changes vs FIXED2: routeLedger() now matches Transport Agency, Transport Agencies, Roadway, Roadlines, Parcel, Express Carrier + JOB WORKERS group for suppliers. Transporter push includes raw_tally_group for debugging.
- S_LM 502 error: transient -- self-heals next run
- Trigger: POST https://n8n.shreerangtrendz.com/api/v1/workflows/CU6dMm7DCtSP6rMQ/run
  Header: X-N8N-API-KEY: n8n_api_45dba335541e42cfa98255662629155c

## Sync Status (13-Apr-2026 night)
- Resync at ~2022-08 (behind ~1341 days, running every ~12min)
- After resync completes: run SELECT * FROM compute_jw_allocation()
- JW match: 1,878/5,347 (35%) -- will improve dramatically after full resync + compute_jw_allocation()

## SQL Migrations Applied (all 13-Apr-2026)
1. add_tally_master_fields_v35
2. fix_receipt_payment_lines_upsert_null_bill_ref -- UNIQUE NULLS NOT DISTINCT
3. create_ai_accounting_tables -- 7 smart finance tables
4. fix_customer_data_quality -- HTML entity decode, city fragment cleanup
5. add_gst_filing_status_columns -- customers + suppliers get gst_filing_status, gst_registration_type, gst_status_checked_at, gst_last_return_period. Index on gst_number (not null). transporters gets raw_tally_group.

## GST Filing Status -- Planned (column ready)
- customers.gst_filing_status: regular/composition/non_filer/suspended/cancelled
- customers.gst_last_return_period: last GSTR-3B period (YYYY-MM)
- Will be populated by n8n weekly cron calling GSTN public API
- Already shown as "Pending Data" badge in AccountingHub + PartyMastersPage

## FY 2024-25 Key Numbers
- Sales: Rs 15.46 Cr | 2,450 bills | 487 customers
- Grey Cost: Rs 5.67 Cr | JW Cost: Rs 4.80 Cr | CN: Rs 1.29 Cr | Gross Profit: ~Rs 3.70 Cr (24%)
- Output GST: Rs 73.6L | ITC: Rs 27L | Net liability: ~Rs 46.6L
- 88% interstate (IGST) | Top states: MH 5.69Cr, KL 2.63Cr, GJ 2.14Cr, RJ 2.06Cr
- 225 transporters in DB (manually added, no tally_ledger_name yet -- will populate after FIXED3 runs)

## Git Commits Ready to Push (5 commits since last push)
- ea2b0d7 SmartFinancePage added to App.jsx + route
- d21ae00 accounting.css font sizes (rows 15px, title 22px, KPI 26px)
- cd0a18e AdminLayout mobile hamburger + AdminSidebar Smart Finance added
- a89213e TallyAccountingHub v35 (5 tabs, CA-grade)
- 10ad219 PartyMastersPage rebuilt (inline edit, completeness)
Run: cd "C:\Shreerang 2026\Horizon Code" && git push origin master

## Pages Live (in repo, need git push)
AccountingHub v35 (991 lines, 5 tabs: Dashboard/Pipeline/GST/Mills/Customers)
PartyMastersPage (1039 lines, inline editing, completeness score, GST status)
SmartFinancePage (1138 lines: Bill OCR + GST Recon + Bank Recon + TDS)
RecFromMillPage | MissingRecFromMillPage | SalesBillsPage | PurchaseBillsPage
GreyPurchasePage | ProcessIssuesPage | DesignLifecyclePage | DesignCostingPage
AdminLayout (mobile hamburger) | AdminSidebar (Smart Finance in nav, no duplicates)

## Pending Tasks (priority order)
1. git push -- run from terminal: cd "C:\Shreerang 2026\Horizon Code" && git push origin master
2. Import FIXED3.json into n8n (replaces FIXED2)
3. compute_jw_allocation() -- run after resync reaches Apr 2026
4. GST filing status -- GSTN API integration in n8n (columns ready)
5. DesignGalleryPage -- BunnyNet CDN https://shreerang.b-cdn.net/designs/{design_no}.jpg
6. Outstanding Recv/Pay pages -- need review for accuracy

## MCP Setup
claude_desktop_config.json at C:\Users\SHRIKUMAR\AppData\Roaming\Claude\
Filesystem + Supabase MCPs. Windows-MCP for ASCII files only (not JSX).

## Two-File System
- CLAUDE.md = this file (loads every session) -- update at end of each session
- CLAUDE_MASTER.md = full history (read only when deep context needed)
