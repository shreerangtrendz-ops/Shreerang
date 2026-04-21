# SRTPL Horizon -- Active Context
*Last updated: 21-Apr-2026*

## Infrastructure
- Code: C:\Shreerang 2026\Horizon Code
- Supabase: zdekydcscwhuusliwqaz
- n8n: workflow CU6dMm7DCtSP6rMQ at n8n.shreerangtrendz.com (mobile hotspot only)
- GitHub: shreerangtrendz-ops/Shreerang | branch: master | Vercel auto-deploy
- VPS: 72.61.249.86 | FRP auth: ShreerangFRP2026

## FRP / Tally Tunnel -- CONFIRMED WORKING (21-Apr-2026)
- frpc config: C:\FRP_Office\frpc.toml | start: C:\FRP_Office\1_START_FRPC.bat
- frpc maps: localPort 9005 -> remotePort 9005 (Tally primary TCP)
- frpc maps: localPort 9999 -> remotePort 9001 (Tally Gold gateway)
- VPS nginx: /etc/nginx/sites-enabled/tally-n8n (DO NOT TOUCH)
  upstream tally_backend { server 127.0.0.1:9005; server 127.0.0.1:9006 backup; }
  server { listen 9080; proxy_pass http://tally_backend; }
- n8n Check Tally Health hits: http://172.19.0.1:9005 (FIXED4 -- direct TCP, no nginx)
- n8n TALLY_URL in code: http://172.19.0.1:9005 (same)
- MONDAY/any day: no port change needed -- nginx handles failover automatically
  OLD "sed -i 's/9006/9005/'" COMMAND IS PERMANENTLY OBSOLETE

## n8n Workflow Status (21-Apr-2026)
- Current file: SRTPL_Tally_Sync_v35_FIXED4.json (imported and working)
- All 13 steps: SUCCESS on last run
- Sync: 2022-11-17 (1251 days behind, auto-running every 30 min)
- Transporters still 0 -- routeLedger needs Tally group name check
- S_AV_LINES fixed: added DEFAULT gen_random_uuid() to id column
- receipt_payment_lines bill_ref DEFAULT '' added

## Voucher Chain V-01->V-05
grey_purchase -> issue_to_mill -> jobwork_expenses -> rec_from_mill -> sales_bills

## 4 Join Keys
- KEY 1: grey_purchase.lot_no = issue_to_mill.lot_no = rec_from_mill.grey_lot_no
- KEY 2: jobwork_expenses.voucher_number = rec_from_mill.jw_voucher_number
- KEY 3: rec_from_mill.design_no = sales_bills.design_no
- KEY 4: sales_bills.bill_number = credit_note.bill_ref

## Coding Rules (never break)
- NEVER commit via GitHub Desktop -- Git CLI only
- ALWAYS Math.abs() on ALL cost display fields
- JSX files: ALWAYS Claude server bash_tool + git push -- NEVER Windows-MCP FileSystem
- Supabase import: customSupabase as supabase from @/lib/customSupabaseClient

## SQL Migrations Applied (all Apr-2026)
1. add_tally_master_fields_v35
2. fix_receipt_payment_lines_upsert_null_bill_ref -- UNIQUE NULLS NOT DISTINCT
3. create_ai_accounting_tables -- 7 smart finance tables
4. fix_customer_data_quality
5. add_gst_filing_status_columns
6. fix_receipt_payment_lines_id_default -- gen_random_uuid() default + bill_ref DEFAULT ''

## FY 2024-25 Key Numbers
- Sales: Rs 15.46 Cr | 2,450 bills | 487 customers
- Grey: Rs 5.67 Cr | JW: Rs 4.80 Cr | CN: Rs 1.29 Cr | GP: ~Rs 3.70 Cr (24%)
- Output GST: Rs 73.6L | ITC: Rs 27L | Net: ~Rs 46.6L

## Pages Live (Vercel -- pending git push of JSX files)
AccountingHub v35 (5 tabs) | PartyMastersPage | SmartFinancePage
RecFromMillPage | SalesBillsPage | PurchaseBillsPage | GreyPurchasePage
ProcessIssuesPage | DesignLifecyclePage | DesignCostingPage
AdminLayout (mobile hamburger) | AdminSidebar (Smart Finance in nav)

## Pending Tasks (priority order)
1. Fix Vercel build: copy DEPLOY_TallyAccountingHub.jsx + DEPLOY_SmartFinancePage.jsx
   then run: powershell -ExecutionPolicy Bypass -File fix_build.ps1
2. compute_jw_allocation() -- run after resync reaches Apr 2026 (~60 days)
3. Check transporter Tally group name in Tally masters
4. GST filing status GSTN API integration
5. DesignGalleryPage -- BunnyNet CDN https://shreerang.b-cdn.net/designs/{design_no}.jpg

## MCP Setup
Filesystem + Supabase MCPs. Windows-MCP for ASCII files only (not JSX).

## Two-File System
- CLAUDE.md = this file (loads every session)
- CLAUDE_MASTER.md = full history
