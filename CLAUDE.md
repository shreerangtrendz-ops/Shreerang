# SRTPL Horizon -- Active Context
*Last updated: 13-Apr-2026 (late evening)*

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

## n8n Workflow -- v35 LIVE
- Current: SRTPL_Tally_Sync_v35_FIXED2.json (import this into n8n)
- S_LM: 8,681 ledgers -> 5,627 customers, 1,901 suppliers, 511 agents synced
- S_LM 502 error: transient (Tally went offline during large XML fetch) -- self-heals next run
- transporters=0: check actual Tally group name, update routeLedger() in n8n
- Trigger: POST https://n8n.shreerangtrendz.com/api/v1/workflows/CU6dMm7DCtSP6rMQ/run
  Header: X-N8N-API-KEY: n8n_api_45dba335541e42cfa98255662629155c

## JW Allocation Status (13-Apr-2026)
- matched_direct=607, matched_rows=1878, unmatched=3469 (from last compute_jw_allocation run)
- 1,878 of 5,347 REC rows have JW link -- 65% still unmatched (resync still in progress from 2022)
- Run SELECT * FROM compute_jw_allocation() AFTER resync reaches Apr 2026

## Sync Status (13-Apr-2026)
- Resync at 2022-08-18 (batch running every ~12 min, catching up from 2022-03-31)
- S_AV_LINES OK | S_LM OK (502 is transient)
- After resync completes: run compute_jw_allocation()

## SQL Migrations Applied (all 13-Apr-2026)
1. add_tally_master_fields_v35 -- customers/suppliers/agents/transporters new columns
2. fix_receipt_payment_lines_upsert_null_bill_ref -- UNIQUE NULLS NOT DISTINCT
3. create_ai_accounting_tables -- 7 smart finance tables
4. fix_customer_data_quality -- decoded HTML entities, cleared address fragments from city

## FY 2024-25 Key Numbers (live from Supabase)
- Sales: Rs 15.46 Cr | 2,450 bills | 487 customers
- Grey Cost: Rs 5.67 Cr | JW Cost: Rs 4.80 Cr | Credit Notes: Rs 1.29 Cr
- Gross Profit: ~Rs 3.70 Cr | Margin: ~24%
- Output GST: Rs 73.6L (IGST Rs 63.4L + CGST/SGST Rs 10.2L)
- ITC (Purchase GST): Rs 27L | Net GST Liability: ~Rs 46.6L
- 88% interstate (IGST), 12% intra-Gujarat (CGST+SGST)
- Top states: Maharashtra Rs 5.69Cr, Kerala Rs 2.63Cr, Gujarat Rs 2.14Cr, Rajasthan Rs 2.06Cr

## Pages Live (all need git push via terminal with PAT)
AccountingHub v35 OK (991 lines, 5 tabs) | RecFromMillPage OK | MissingRecFromMillPage OK
SalesBillsPage OK | PurchaseBillsPage OK | GreyPurchasePage OK
ProcessIssuesPage OK | DesignLifecyclePage OK | DesignCostingPage OK
PartyMastersPage OK (1039 lines, inline editing, completeness score)
SmartFinancePage OK (1138 lines, Bill OCR + GST Recon + Bank Recon + TDS)

## AccountingHub v35 -- What's New (5 tabs)
1. Dashboard: 8 KPI cards, monthly sales chart, cost structure CA view, JW allocation health
2. Pipeline: V-01->V-05 pipeline cards + supporting vouchers grid
3. GST Analysis: GSTR-1 summary, ITC/output breakdown, state-wise filing table, GST filer status (pending API)
4. Mill Performance: Shortage %, JW cost, efficiency score per mill -- TDS 194C note included
5. Top Customers: Top 10 + revenue concentration analysis + GST filing status column (pending GSTN API)

## GST Filing Status -- Planned Feature
- Will fetch customer GST filing regularity from GSTN API
- customers.gst_number already synced from Tally via v35 S_LM
- Column to add: customers.gst_filing_status (regular/composition/non_filer/suspended), gst_status_checked_at
- Trigger: weekly cron via n8n calling GSTN public API
- Display in: PartyMastersPage + AccountingHub GST tab + Customer Profile

## Pending Tasks (priority order)
1. git push -- TallyAccountingHub.jsx + PartyMastersPage.jsx + SmartFinancePage.jsx via terminal with PAT
2. Import n8n FIXED2.json into n8n dashboard
3. Fix transporters sync -- check Tally group name, update routeLedger()
4. GST filing status feature -- GSTN API integration (customers.gst_filing_status column)
5. Font size -- all accounting pages (15px rows, 26px cards, 22px titles)
6. Mobile hamburger -- AdminLayout.jsx sidebar overlay on <768px
7. compute_jw_allocation() -- run after resync reaches Apr 2026
8. DesignGalleryPage -- BunnyNet CDN https://shreerang.b-cdn.net/designs/{design_no}.jpg

## MCP Setup
claude_desktop_config.json at C:\Users\SHRIKUMAR\AppData\Roaming\Claude\
Filesystem + Supabase MCPs. Windows-MCP for ASCII files only (not JSX).

## Two-File System
- CLAUDE.md = this file (loads every session) -- update at end of each session
- CLAUDE_MASTER.md = full history (read only when deep context needed)
