# SRTPL Horizon — Master Reference
*Full history. Loaded only when deep context needed. Active context in CLAUDE.md.*
*Last updated: 11-Apr-2026*

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:3000 (also accessible on network)
npm run build      # Run LLM generation script, then Vite production build
npm run preview    # Preview production build on port 3000
npm run lint       # ESLint (quiet mode — only errors, no warnings)
```

Dev server binds to `::` (all interfaces) on port 3000.

## Environment Setup

Copy `.env.example` to `.env` and configure Supabase keys before running. Supports `.env.local`, `.env.development`, `.env.production`, `.env.staging`.

Path alias `@` maps to `./src` (configured in vite.config.js and eslint.config.mjs).

## Architecture Overview

**Textile industry ERP + e-commerce SPA** built with React 18 + Vite, backed by Supabase (auth, DB, storage), deployed on Vercel.

### Routing (src/App.jsx)
200+ routes organized into:
- **Public:** `/`, `/shop`, `/products/:slug`, `/cart`, `/checkout`, `/about`, `/contact`, `/login`, `/register`
- **Customer portal:** `/customer/*` (dashboard, catalogue, designs, orders, outstanding)
- **Admin:** `/admin/*` — protected with `role='admin'`, spans fabric master, design center, cost engine, accounting, integrations, sales/orders, reporting, operations

### State & Data Flow
- **Auth:** `SupabaseAuthContext` (src/contexts/) manages session and role-based access
- **Cart:** `CartContext` (src/contexts/) for e-commerce cart state
- **Forms:** React Hook Form + Zod validation throughout
- **API calls:** Always go through the service layer — never call Supabase directly from components

### Service Layer (src/services/ — 88 files)
All business logic lives here, organized by domain:
- Fabric: `FabricService`, `BaseFabricService`, `FinishFabricService`, `FabricHierarchyService`
- Design: `DesignService`, `DesignUploadService`, `DesignImageService`
- Costing: `CostService`, `CostSheetService`, `HakobaBatchService`, `SchiffliCostingService`
- Pricing: `PriceService`, `TierPricingService`, `PriceDatabaseService`
- Purchasing: `PurchaseService`, `PurchaseEntryService`, `PurchaseOrderService`
- Orders/Sales: `OrderService`, `CustomerOrderService`
- Integrations: `TallySyncService`, `GoogleDriveService`, `WhatsAppService`, `N8nService`, `BunnyNetService`
- Bulk ops: `BulkImportService`, `BulkFabricImportService`

### Component Organization (src/components/)
- `ui/` — Shadcn/Radix UI primitives (treat as library code)
- `admin/` — 18+ subdirectories organized by admin domain
- `common/` — shared layout/utility components
- `customer/`, `shop/` — portal-specific components

### Custom Hooks (src/hooks/)
`useActivityLog`, `useDropdownOptions`, `useFabricDropdowns`, `useFabricForm`, `useShopFilters`, `useUnsavedChanges`, `useUserProfile`

### External Integrations
- **Tally** — accounting data sync
- **Google Drive** — asset management and cloud storage
- **BunnyNet** — CDN for image delivery
- **WhatsApp** (Meta API) — customer communication
- **N8n** — workflow automation

### GitHub Actions
- `.github/workflows/backup-restore.yml` — database backup/restore
- `.github/workflows/db-migrate.yml` — database migrations

### UI Stack
TailwindCSS with HSL CSS variables for theming, dark mode via class strategy. Custom scrollbar utilities. Framer Motion for animations, Recharts for charts, Radix UI for headless components.

## SRTPL Horizon — Project Rules

### Critical rules (never break these)
- Never commit via GitHub Desktop — use Git CLI only (branch: master)
- Always apply `Math.abs()` to ALL cost display fields across accounting pages
- Supabase import: always use `import { supabase } from '@/lib/supabase'` (re-exports from `@/lib/customSupabaseClient`) — never use absolute URL strings in components
- Monday morning: run `sed -i 's/9006/9005/' /etc/nginx/conf.d/tally-internal.conf && nginx -t && systemctl reload nginx` before opening Tally

### Voucher pipeline (V-01 → V-05)
See Data Quality table below for current row counts and sync status. Quick reference:
- V-01: `grey_purchase` | V-02: `issue_to_mill` | V-03: `jobwork_expenses`
- V-04: `rec_from_mill` | V-05: `sales_bills`

### Gold standard page
`SalesBillsPage.jsx` — teal color theme, FY tabs, SummaryCard components, `Math.abs()` on costs, 50-row pagination. All new pages must match this pattern.

### Pages pending
- SQL: `jw_allocated_cost` + `jw_allocation_pct` via `compute_jw_allocation()` — run after sync catches up
- `TallyAccountingHub.jsx.bak` — delete (stale backup file)
- Design P&L page: pending answers to 6 open questions (see Open questions section)

### Infrastructure
- Supabase project: `zdekydcscwhuusliwqaz`
- VPS: `72.61.249.86` | n8n: `n8n.shreerangtrendz.com`
- Office network blocked — use mobile hotspot if VPS unreachable
- FRP auth token: `ShreerangFRP2026` | Tally port: `9005`

## SRTPL Horizon — Deep Reference

### Infrastructure (complete)
- Supabase: `zdekydcscwhuusliwqaz` · ap-northeast-2 · https://zdekydcscwhuusliwqaz.supabase.co
- Vercel team: `team_LYYmREzCpoHYnvToxlhACgrc` · project: `prj_TTqBNS3XLlk8C5RX43YZ8zr7U9I5` · auto-deploy from master
- n8n workflow ID: `CU6dMm7DCtSP6rMQ` · MCP workflow: `rPJxgZgZJ76R1M1j`
- Tally sync trigger: `POST https://n8n.shreerangtrendz.com/api/v1/workflows/CU6dMm7DCtSP6rMQ/run` · header: `X-N8N-API-KEY: n8n_api_45dba335541e42cfa98255662629155c`
- VPS: `srv1246379` · `72.61.249.86` · n8n DB: `/var/lib/docker/volumes/n8n-ened_n8n_data/_data/database.sqlite`
- Tally: Gold edition · Company: SheeRang Trendz Pvt. Ltd. (from 1-Apr-2019) · Port: 9005 via FRP

### Voucher pipeline — join keys (THE most important thing to know)
```
V-01 grey_purchase.lot_no = "151/22-23"   (KEY 1 — grey fabric batch identity)
  ↓ joins via lot_no
V-02 issue_to_mill.lot_no                  (KEY 1 — same batch going to mill)
  ↓ lot_no joins to
V-04 rec_from_mill.grey_lot_no             (KEY 1 — grey lot received back)
V-04 rec_from_mill.design_no               (KEY 3 — BORN HERE — finished fabric design no e.g. "3270")
  ↓ design_no joins to
V-05 sales_bills.design_no
```
- `design_no` is born at V-04 (`rec_from_mill`). It does NOT exist in V-01/V-02/V-03.
- `party_challan_no` in `rec_from_mill` = mill's OWN receipt no — use `v.partyChNo` (not `v.reference`) in n8n
- `issue_to_mill.qty_mtrs` is often 0 — always use `grey_purchase.actual_qty_mtrs` via `lot_no` join

### n8n sync steps
```
S1: tally_sync_log (last date)
→ S2: Fetch Tally XML
→ S3: sales_bills
→ S4: purchase_bills
→ S4b: grey_purchase
→ S5: process_issues
→ S5b: issue_to_mill
→ S5c: rec_from_mill
→ S5d: stock_journal
→ S_CN: credit_note + items
→ S_DN: debit_note
→ S_JW: jobwork_expenses
→ S_AV: accounting_vouchers
→ S_AV_LINES: receipt_payment_lines
```
Conflict keys: `sales_bills=tally_voucher_no`, `grey_purchase=(tally_voucher_no,lot_no)`, `process_issues=challan_no`, `issue_to_mill=(lot_no,voucher_date)`, `rec_from_mill=tally_voucher_no`

### n8n v33 fix — ALREADY APPLIED
`partyChNo` fix in `buildRecFromMillRow`: `party_challan_no: v.partyChNo || v.reference || v.vnum` ✅

### n8n v34 — APPLIED (10-Apr-2026) ✅
`buildGreyPurchaseRow` flatMap over ALL `batchallocations` ✅
Conflict key `(tally_voucher_no, lot_no)` ✅
Workflow file: `src/n8n/n8n-tally-sync-v34.json`

### DO NOT delete and resync — preserve these
- `rec_from_mill` computed columns: `grey_purchase_rate`, `cumulative_cost_per_mtr`, `jw_allocated_cost`, `jw_allocation_pct`
- `mill_godown_map` table (40 mappings — mill short name → full party name for JW allocation)
- `missing_rec_from_mill` view

### Supporting table row counts (as of Apr 2026)
`customers=1162`, `agents=213`, `suppliers=79`, `tally_sync_log=966`, `process_issues=14409`, `mill_challan_takas=30`, `mill_godown_map=40`

### Pages status
- **LIVE:** `GreyPurchasePage`, `SalesBillsPage` (gold std), `ProcessIssuesPage` (gold std ✓), `JobWorkBillsPage` (gold std ✓ 4 tabs), `MissingRecFromMillPage`, `OutstandingReportPage`, `DesignCostingPage`, `RecFromMillPage`, `DesignPnLPage`, `PurchaseBillsPage` (gold std ✓), `TallyAccountingHub` (v26 — all 11 voucher types)
- **LIVE (10-Apr-2026):** `DesignLifecyclePage.jsx` — route: `/admin/accounting/design-lifecycle/:designNo` and `/admin/accounting/design-lifecycle?lot=<lotNo>` · Grey → Mill → REC → Sale full journey · imported as `DesignLifecycleDetailPage` in App.jsx
- **COMPONENT:** `src/components/accounting/OriginPanel.jsx` — collapsible origin trail · wired into SalesBillsPage + DesignCostingPage · queries `design_origin` view
- **REMOVE** (old manual-entry pages): `JobWorkBillDashboard`, `JobWorkBillForm`, `PurchaseBillDashboard`, `PurchaseBillForm`, `SalesBillDashboard`, `SalesBillForm`, `CommissionBrokerageDashboard`, `CommissionBrokerageForm`

### MissingRecFromMillPage — key detail
Filter by `destination_godown` NOT `mill_name` (`mill_name` is 97% NULL).
`OutstandingReportPage` has caveat banner: `receipt_payments` only from Jul-2024.

### Outstanding SQL join pattern
```sql
sales_bills sb
LEFT JOIN customers c ON c.tally_ledger_name = sb.customer_name
LEFT JOIN receipt_payment_lines rpl ON rpl.bill_ref = sb.tally_voucher_no
WHERE voucher_type = 'Receipt'  -- for received amounts
```
Ageing buckets: >90d, 61–90d, 31–60d, 0–30d

### Security fixes applied (08-Apr-2026)
RLS + service_role policy added to: `accounting_vouchers`, `receipt_payment_lines`, `receipt_payments`.
These 3 tables had `account_number` column exposed via API — now blocked.

### Database constraints fixed (09-Apr-2026)
- `grey_purchase`: `UNIQUE(tally_voucher_no)` → `UNIQUE(tally_voucher_no, lot_no)` — one bill can have multiple lots to different mills
- `issue_to_mill`: `UNIQUE(lot_no)` → `UNIQUE(lot_no, voucher_date)` + `source_godown` column added
- `sales_bills`: `all_design_nos jsonb` column added
- `receipt_payment_lines`: constraint recreated cleanly
- `credit_note_items`: old UNIQUE constraint removed (n8n uses DELETE+INSERT pattern)

### Table purpose clarification (09-Apr-2026)
- `purchase_bills` = finished fabric bought for direct resale (S4 in n8n)
- `grey_purchase` = raw grey fabric bought for own mill processing (S4b in n8n) — one bill = multiple lots (batchallocations)
- `process_issues` = taka/roll level challan data, powers `missing_rec_from_mill` view
- `issue_to_mill` = voucher header level, one row per Issue to Mill voucher

### Sync errors fixed (09-Apr-2026) — all 3 were blocking data
- S3 sales 400: `all_design_nos` column was missing — fixed (column added)
- S5b issue_to_mill 400: wrong constraint + missing `source_godown` — fixed
- S_AV_LINES 500: constraint issue — fixed
- S_CN_items 409: old UNIQUE constraint blocking DELETE+INSERT — fixed

### Open questions (answer before building Design P&L page)
1. Outstanding cutoff: bills before Jul-2024 — show as unpaid or exclude?
2. Credit notes: subtract `credit_note.party_amount` from outstanding?
3. Primary Batch bills (1,067): include in Design P&L or exclude?
4. Multi-stage lots: cost chain accumulates across `stage_no` 1→2→3 — confirm logic
5. REC FROM MILL page: read-only or allow accountant flagging?
6. `customers.area`: manual or Tally-synced?

## SRTPL — 4 Join Keys (Complete Chain)

**KEY 1 — `lot_no`:** `grey_purchase.lot_no` = `issue_to_mill.lot_no` = `rec_from_mill.grey_lot_no`
Format: `"151/22-23"` | One lot = one grey fabric batch | Status: FULLY WIRED

**KEY 2 — `jw_voucher_number` (V-03 ↔ V-04):** `jobwork_expenses.voucher_number` = `rec_from_mill.jw_voucher_number`
- **NOT a direct field match** — `supplier_invoice_no` (V-03) is the mill's OWN invoice number (e.g. `"10521/24-25"`); `party_challan_no` (V-04) is our original issue challan number (e.g. `"1210"`). These are **different numbers** and must NOT be equated.
- The correct link is resolved by `compute_jw_allocation()` which writes the matched jobwork voucher number into `rec_from_mill.jw_voucher_number`.
- **Always JOIN via:** `jobwork_expenses.voucher_number = rec_from_mill.jw_voucher_number`
- Alternative (fallback) match: `job_godown` → `mill_godown_map` → `party_name` AND same `voucher_date`

### V-04 Tally field mapping — confirmed from voucher screenshot (10-Apr-2026)
```
Tally "Party Ch. No"  → party_challan_no   — mill's OWN JW bill number (e.g. "10521/24-25")
                         Potentially matches jobwork_expenses.supplier_invoice_no (mill's own invoice)
Tally "Reference No"  → issue_challan_ref  — our Issue Challan No (V-02 lot_no, e.g. "1210")
                         Links back to issue_to_mill.lot_no / tally_voucher_no
Tally "Lot No"        → grey_lot_no        — same as Issue Challan No in most cases
```
- `issue_challan_ref` column added to `rec_from_mill` (10-Apr-2026) — stores Tally "Reference No"
- n8n v34 `buildRecFromMillRow` must split `v.partyChNo` and `v.reference` into two separate fields:
  ```js
  party_challan_no:  v.partyChNo || v.vnum,   // "Party Ch. No" = mill's own bill no
  issue_challan_ref: v.reference || null,       // "Reference No" = our Issue Challan (V-02 key)
  ```
- Previously v33 had: `party_challan_no: v.partyChNo || v.reference || v.vnum` — this was polluting party_challan_no with the Issue Challan No when partyChNo was missing

**KEY 3 — `design_no`:** `rec_from_mill.design_no` = `sales_bills.design_no` = `credit_note_items.design_no`
Born in REC FROM MILL destination batch | Status: FULLY WIRED
One lot → MULTIPLE designs possible | One sales bill → MULTIPLE designs (line_items JSONB)

**KEY 4 — `bill_ref`:** `sales_bills.bill_number` = `credit_note.bill_ref`
`sales_bills.tally_voucher_no` = `receipt_payment_lines.bill_ref`
Outstanding = `total_amount - SUM(bill_amount WHERE voucher_type='Receipt')` | Status: FULLY WIRED

## SRTPL — Cost Chain (Profit per Design)

```
grey_purchase.rate × actual_qty_mtrs                              = raw material cost (via lot_no)
rec_from_mill.job_amount = job_rate × finish_qty_mtrs             (NEGATIVE value from Tally)
rec_from_mill.jw_allocated_cost = (finish_qty_mtrs / group_total_mtrs) × jobwork_expenses.expense_amount
rec_from_mill.cumulative_cost_per_mtr = (grey_cost_actual + job_amount) / finish_qty_mtrs
Profit per design = (selling_rate - cumulative_cost_per_mtr) × quantity_mtrs - comm_amount - credit note returns
```

## SRTPL — Critical Column Traps (DO NOT get wrong)

**`jobwork_expenses`:** NO `amount` column — use `expense_amount` (main amount) and `party_amount` (net payable)

**`sales_bills` — use these columns:**
- `quantity_mtrs` NOT `billed_qty`/`actual_qty`
- `total_taka_pcs` NOT `taka_pcs`
- `rate_per_mtr` NOT `net_rate`
- `taxable_value` NOT `assessable_value`

**`sales_bills` — NON-EXISTENT columns** (will cause query errors):
`billed_qty`, `actual_qty`, `taka_pcs`, `reference_no`, `gst_number`, `net_rate`, `mill_godown`, `assessable_value`, `folding_details`

**`rec_from_mill`:** `mill_name` is NULL for 97% of rows — use `job_godown` + `mill_godown_map` for mill name

**`issue_to_mill`:** `qty_mtrs` = 0 for many rows — use `grey_purchase.actual_qty_mtrs` via `lot_no` join

## SRTPL — n8n Workflow Status

- Current file: `n8n-tally-sync-v34.json` (10-Apr-2026) — upload to n8n workflow `CU6dMm7DCtSP6rMQ`
- `partyChNo` fix: APPLIED in v33 ✅
- `issue_to_mill` conflict key `(lot_no, voucher_date)` ✅ | `source_godown` column ✅
- `sales_bills` `all_design_nos` jsonb ✅ | `line_items` jsonb (multi-design) ✅
- `grey_purchase` conflict key `(tally_voucher_no, lot_no)` ✅ | flatMap over all batches ✅
- `issue_to_mill` inventory fix: uses `INVENTORYENTRIESOUT.LIST` (not `ALLINVENTORYENTRIES`) ✅
- `credit_note_items`: multi-design loop + `batch_name` + `dest_godown` populated ✅
- **Schedule:** Every-30-min trigger node added + existing 3x daily retained ✅
- **Batch size:** `CHUNK_DAYS=7`, `MAX_CHUNKS_PER_RUN=1` — prevents 300s timeout ✅
- `buildSalesRow` Primary Batch (1,067 bills): still null design_no — open issue

## SRTPL — Data Quality (as of 06-Apr-2026 master reference)

| Table | Rows | Last sync | Status |
|---|---|---|---|
| `sales_bills` | 9,091 | ~2026-03-30 | ✅ current |
| `receipt_payments` | 2,753 | current | ✅ current |
| `rec_from_mill` | 3,388 | 2024-06-03 | ⚠ 672 days behind |
| `issue_to_mill` | 4,187 | 2024-08-29 | ⚠ 585 days behind |
| `grey_purchase` | 843 | ~2024 | ⚠ behind |
| `jobwork_expenses` | 2,602 | ~2024 | ⚠ behind |

Missing REC from Mill: **2,102 lots OVERDUE** + 375 SYNC_LAG = ₹2.05 Cr, 3,82,684 metres at risk
`design_no` NULL: 1,067 `sales_bills` have Primary Batch (no design) | 1,391 `credit_note_items` NULL

## File Locations — Exact Paths

### Codebase root
`I:\My Drive\Automation\Shreerang 2026\Horizon Code\`

### Key source folders
```
src/pages/admin/            — all admin panel pages
src/pages/admin/accounting/ — all voucher/accounting pages
src/pages/                  — all page components
src/components/             — shared UI components
src/lib/supabase.js         — Supabase client (use this import, never recreate)
src/hooks/                  — custom hooks
src/App.jsx                 — router — add new routes here
src/lib/rbac.js             — role-based access control helpers
```

Sidebar nav: search for `"accounting"` in `src/components/` to find the nav file.

### Code Review Page
- File: `src/pages/admin/CodeReviewPage.jsx`
- Route: `/admin/code-review`
- Queries live from: `tally_sync_log`, uses hardcoded schema stats
- Auto-refreshes every 30 seconds via `useEffect` interval

### Schema location (Supabase)
- Project: `zdekydcscwhuusliwqaz` — all tables in schema `public`
- SQL Editor: `https://supabase.com/dashboard/project/zdekydcscwhuusliwqaz/sql`

### How to find things
- Page → `src/pages/admin/` or `src/pages/`
- Routes → `src/App.jsx`
- Supabase queries in a page → search `.from('` in the file
- Table columns → query `information_schema` in SQL editor
- Sync status → `SELECT * FROM tally_sync_log ORDER BY synced_at DESC LIMIT 5`
- Refresh JW costs after resync → `SELECT * FROM compute_jw_allocation()`

### GitHub
Repo: `shreerangtrendz-ops/Shreerang` · Branch: `master`
Commit: `git add -A && git commit -m "message" && git push origin master`

### Supabase diagnostic queries (run at session start if relevant)
```sql
SELECT synced_at, records_synced, status FROM tally_sync_log ORDER BY synced_at DESC LIMIT 3;
SELECT COUNT(*) AS unmatched FROM rec_from_mill WHERE jw_voucher_number IS NULL;
SELECT urgency, COUNT(*) FROM missing_rec_from_mill GROUP BY urgency;
```

## SRTPL — Page Routes (complete)

| Route | Component |
|---|---|
| `/admin/accounting/grey-purchase` | `GreyPurchasePage.jsx` |
| `/admin/accounting/sales-bills` | `SalesBillsPage.jsx` **(GOLD STANDARD)** |
| `/admin/accounting/job-work-bills` | `JobWorkBillsPage.jsx` (4 tabs: Issue/REC/Jobwork/Expenses) |
| `/admin/accounting/jobwork` | `JobWorkExpensesPage.jsx` |
| `/admin/accounting/vouchers` | `FinancialVouchersPage.jsx` |
| `/admin/accounting/process-issues` | `ProcessIssuesPage.jsx` (4 tabs, sampling toggle) |
| `/admin/accounting/missing-rec` | `MissingRecFromMillPage.jsx` |
| `/admin/accounting/outstanding` | `OutstandingReportPage.jsx` (5 tabs: Party/City/Area/Broker/Ageing) |
| `/admin/accounting/design-costing` | `DesignCostingPage.jsx` |
| `/admin/accounting/rec-from-mill` | `RecFromMillPage.jsx` |
| `/admin/accounting/purchase-bills` | `PurchaseBillsPage.jsx` |
| `/admin/accounting/design-pnl` | `DesignPnLPage.jsx` |
| `/admin/accounting/design-lifecycle/:designNo` | `DesignLifecyclePage.jsx` (also `?lot=<lotNo>`) |
| `/admin/code-review` | `CodeReviewPage.jsx` |

## SRTPL — Files to delete (old manual-entry, conflicts with Tally sync)

`JobWorkBillDashboard.jsx`, `JobWorkBillForm.jsx`, `PurchaseBillDashboard.jsx`, `PurchaseBillForm.jsx`,
`SalesBillDashboard.jsx`, `SalesBillForm.jsx`, `CommissionBrokerageDashboard.jsx`, `CommissionBrokerageForm.jsx`,
`TallyAccountingHub.jsx.bak`

## Tally JSON field mapping — confirmed from actual JSON files

### V-01 grey_purchase (Purchase voucher)
Tally JSON field → Supabase column:
- `vouchernumber` → `tally_voucher_no` (e.g. `"1068"`)
- `reference` → `supplier_invoice_no` (e.g. `"19/24-25"`) ← supplier bill number
- `partymailingname` / `partyledgername` → `supplier_name` (e.g. `"B K TEXTILE"`)
- `partygstin` → `supplier_gstin`
- `date` → `voucher_date`
- `allinventoryentries[0].stockitemname` → `item_name`
- `allinventoryentries[0].rate` → `rate` (e.g. `"39.00/mtrs"`)
- `allinventoryentries[0].actualqty` → `actual_qty_mtrs`
- `allinventoryentries[0].billedqty` → `billed_qty_mtrs`
- `allinventoryentries[0].amount` → `item_amount` (negative in JSON, store positive)
- `allinventoryentries[0].batchallocations[0].batchname` → `lot_no` (e.g. `"1030/24-25"`) ← **KEY 1**
- `allinventoryentries[0].batchallocations[0].godownname` → `godown_name` (= mill godown, same as `destination_godown` in V-02)
- `allinventoryentries[0].batchallocations[0].udf:trackrefno[1].value` → `track_ref_no`
- `allinventoryentries[0].batchallocations[0].udf:trackrefdate[1].value` → `track_date`
- `allinventoryentries[0].batchallocations[0].udf:trackrefparty[1].value` → `track_party` (e.g. `"Govindji Textile"`)
- `allinventoryentries[0].batchallocations[0].udf:batchitmtaka[1].value` → `taka_pcs` count
- `allinventoryentries[0].batchallocations[0].udf:batchitmtakano[1].value` → `taka_no`
- `ledgerentries[0].billallocations[0].name` → `supplier_invoice_no` CONFIRMED (same as `reference`)
- `ledgerentries[0].billallocations[0].udf:erpbrokername[1].value` → `broker_name`
- `ledgerentries[0].billallocations[0].udf:erpcommrate[1].value` → `comm_rate` (e.g. `0.95%`)
- `ledgerentries[0].billallocations[0].udf:erpcommamount[1].value` → `comm_amount` (e.g. `-735.00`)
- `ledgerentries[0].billallocations[0].udf:erpcommassvalue[1].value` → `assessable_value`
- `ledgerentries[0].billallocations[0].udf:erpcommnetrate[1].value` → `net_rate`
- `ledgerentries` where `ledgername="Purchase CGST"` → `cgst_amount`
- `ledgerentries` where `ledgername="Purchase SGST"` → `sgst_amount`

**KEY INSIGHT from V-01 JSON:**
- `batchname` in grey_purchase = `lot_no` = issue_to_mill challan number
- `godownname` in batchallocations = mill destination godown (links V-01 → V-02 godown)
- V-01 already knows which mill the fabric is going to (via `godownname`)
- `V-01.lot_no` = `V-02.vouchernumber` = `V-02.batchname` = `"1030/24-25"`
- ONE grey_purchase can have MULTIPLE `batchallocations` (multiple lots to different mills)

### V-02 issue_to_mill (Issue to Mill voucher)
Tally JSON field → Supabase column:
- `vouchernumber` → `tally_voucher_no` AND `lot_no` (e.g. `"1030/24-25"`) ← **KEY 1**
- `reference` → lot_no short (e.g. `"1030"`)
- `partyledgername` → `mill_name` (FULL registered name e.g. `"VEEKAY PRINTS PVT. LTD."`) ← no `mill_godown_map` needed
- `destinationgodown` → `destination_godown` (e.g. `"Veekay Prints Mill"`)
- `vouchersourcegodown` → `godown_name` (our source godown)
- `date` → `voucher_date`
- `inventoryentriesin[0].stockitemname` → `item_name`
- `inventoryentriesin[0].rate` → `rate`
- `inventoryentriesin[0].actualqty` → `qty_mtrs`
- `inventoryentriesin[0].batchallocations[0].batchname` → `lot_no` (same as `vouchernumber`)
- `inventoryentriesin[0].batchallocations[0].godownname` → `destination_godown` (mill's godown)

**KEY INSIGHT from V-02 JSON:**
- V-02 has NO `supplier_name` or `supplier_invoice_no` fields — fetch via `JOIN grey_purchase ON lot_no`
- `V-02.partyledgername` = full mill name = same as `jobwork_expenses.party_name`
- `V-02.destinationgodown` ≈ `rec_from_mill.job_godown` (short name variant)

### Critical V-01 ↔ V-02 link (CONFIRMED from actual JSON files — 09-Apr-2026)
- `V-01.batchallocations[0].batchname` = `"1030/24-25"` = `V-02.vouchernumber` ← **KEY 1 confirmed**
- `V-01.batchallocations[0].godownname` = `"Veekay Prints Mill"` = `V-02.destinationgodown`
- Therefore: `grey_purchase.lot_no` = `issue_to_mill.tally_voucher_no` = `issue_to_mill.lot_no` (all same value)

## design_origin view — live in Supabase (confirmed 09-Apr-2026)

- **View name:** `design_origin` — **LIVE**, verified 7,234 rows
- **Keyed by:** `design_no` (plus `lot_no` for multi-lot designs)
- **Joins:** `rec_from_mill` + `grey_purchase` (KEY 1) + `issue_to_mill` (KEY 1) + `mill_godown_map` + `jobwork_expenses` (KEY 2)
- **Coverage:** 7,234 rows | 91% clean `design_no` | 76% JW matched | 41% supplier linked (will grow after v33 resync)
- **React usage:** `supabase.from('design_origin').select('*').eq('design_no', x)`
- **For issue_to_mill screen:** `.eq('lot_no', x)` to get supplier origin
- **First consumer:** `src/components/accounting/OriginPanel.jsx` (09-Apr-2026)

## OriginPanel React component — BUILT (09-Apr-2026) ✅

- **File:** `src/components/accounting/OriginPanel.jsx`
- **Props:** `designNo` OR `lotNo`
- **Query:** `design_origin` view
- **Shows:** `supplier_name → supplier_bill_no → lot_no → mill_name → rec_date → cost_per_mtr`
- **Wired into:** SalesBillsPage, DesignCostingPage
- **Note:** includes `decodeHtml` helper for Tally XML entities (&#10; &#13; &amp; &quot;)
- **Use on:** every accounting page (REC from Mill, Sales Bills, Design Costing, Credit Note, Issue to Mill)

## Session 10-Apr-2026 — changes made

### n8n v34 workflow
- `buildGreyPurchaseRow`: rewrote to return array via `batches.map()` — one row per lot (flatMap in S4b)
- `buildIssueToMillRow` + `buildMillChallanTakaRows`: fixed to use `INVENTORYENTRIESOUT.LIST` (was returning empty for stock journals)
- `buildCreditNoteRow`: now iterates all batch allocations per item (multi-design), populates `batch_name` and `dest_godown` on every CN item row
- `buildSalesRow`: multi-design `line_items` JSONB + aggregate totals across all designs
- Batch tuning: `CHUNK_DAYS=7`, `MAX_CHUNKS_PER_RUN=1` — fixes 300s timeout
- Schedule: every-30-min trigger node added alongside existing 3x daily
- File saved: `src/n8n/n8n-tally-sync-v34.json`

### App.jsx routes added
- `/admin/accounting/design-lifecycle/:designNo` → `DesignLifecycleDetailPage`
- `/admin/accounting/design-lifecycle` → `DesignLifecycleDetailPage` (query-string fallback)

### DesignLifecyclePage.jsx
- Built by Claude Code (874 lines): Grey → Mill → REC → Sale full journey page
- Route: `/admin/accounting/design-lifecycle/:designNo` and `?lot=<lotNo>`
- File: `src/pages/admin/accounting/DesignLifecyclePage.jsx`

### DesignLifecyclePage.jsx V-03 JobworkBlock fix (10-Apr-2026 evening)
- `JobworkBlock` now receives `recRow` (the paired V-04 REC row) as a prop
- **KEY 2 mapping confirmed correct:** `V-03.supplier_invoice_no` = `V-04.party_challan_no`
  - `jobwork_expenses.supplier_invoice_no` = the **jobworker's own bill number** on the invoice they send us for processing
  - `rec_from_mill.party_challan_no` = that **same jobworker bill number**, written on the REC challan when fabric is returned
  - ALL REC entries with the same `party_challan_no` belong to ONE jobwork bill
  - JW `expense_amount` = SUM of all `rec_from_mill.job_amount` WHERE `party_challan_no` = same value
  - V-01 batch_name (lot_no) = V-02 batch_name = also visible in V-04 lot/batch field (KEY 1 chain)
  - V-04 output batch = Primary Batch OR design_no OR color number (born here)
- Matching box shows `V-03.supplier_invoice_no` = `V-04.party_challan_no` with green ✓ matched / amber ⚠ mismatch
- "✓ Same date as V-04" green badge — V-03 and V-04 always share voucher_date
- When JW bill not yet matched: shows the bill no from `party_challan_no` and says which field to look in
- Caller site: `<JobworkBlock row={jwRow} recRow={rec} />`

### RecFromMillPage.jsx KEY 2 display fix (10-Apr-2026 evening)
- Table row: `party_challan_no` now labelled **JW Ch:** in amber to distinguish from lot_no
- Expanded detail: `party_challan_no` renamed to **Party Challan No (KEY 2)** with orange warning if missing

## AntiGravity Updates (09-Apr-2026)

- **multi-design tracking (ll_design_nos, line_items)**: Added extractLineItems logic to uildSalesRow inside 
8n-tally-vouchers-v26.js returning native array structure to accurately map and parse sales_bills multi-design margin traceability natively on Supabase.
- **multi-lot jobwork decoupling**: Applied latMap() iteration across uildProcessRow and uildRecFromMillRow to successfully map Jobwork Journals / Multiple entries into parallel DB rows rather than strictly capping at index \[0]\.
- **Primary Upsert Keys adjusted**: Updated ec_from_mill upside constraints to \tally_voucher_no,lot_no\ and process_issues to \challan_no,lot_no\ inside n8n to resolve multidimensional voucher payloads.
- **DesignPnLPage.jsx Analytics upgrade**: Removed static .not('design_no') fallback limitations and utilized line_items to directly parse and visualize accurate margins. Embedded OriginPanel traceability natively.

## Session 09-Apr-2026 — complete

### Pages built/fixed
- AccountingHub: pipeline redesign (V-01→V-05 flow), sync health bar, authenticated read policies
- RecFromMillPage: gold standard, all cost columns, shortage flag, OriginPanel on expand
- MissingRecFromMillPage: wired to /admin/accounting/missing-rec + sidebar
- OriginPanel: HTML entity decoder added (decodeHtml helper), mill_name falls back to job_godown
- PurchaseBillsPage: gold standard complete

### Supabase fixes applied
- sales_bills: all_design_nos jsonb column added (was causing S3 400 error)
- issue_to_mill: UNIQUE(lot_no) → UNIQUE(lot_no, voucher_date) + source_godown column
- grey_purchase: UNIQUE(tally_voucher_no) → UNIQUE(tally_voucher_no, lot_no)
- credit_note_items: old UNIQUE constraint removed (DELETE+INSERT pattern)
- receipt_payment_lines: WITH CHECK added to RLS policy + bill_ref nullable
- 6 sync tables: authenticated SELECT policies added (grey_purchase, issue_to_mill, rec_from_mill, jobwork_expenses, process_issues, receipt_payment_lines)
- design_origin view: created joining all 5 voucher types

### n8n v34 status
- buildGreyPurchaseRow: flatMap over all batches ✅
- partyChNo fix: applied manually in n8n editor ✅
- issue_to_mill source_godown + UDF fields: added manually ✅
- Schedule triggers: Every 30 min + 3x daily (6AM/2PM/9:30PM IST) ✅
- Tally health check before sync ✅

### Live sync status (19:00 IST)
- sales_bills: 3,142 | grey_purchase: 1,622 | issue_to_mill: 1,339
- rec_from_mill: 3,421 | jw_expenses: 2,947 | rpl: 11,095
- All synced to: 25 Jan 2025 (439 days behind — catching up overnight)

### rec_from_mill cost health
- JW matched: 1,779/3,421 (52%) — will reach ~85% after full sync
- has grey_purchase_rate: 1,164 (34%) — will improve as grey_purchase syncs
- avg cost/mtr: ₹43.07 | avg shortage: 10.41% | high shortage >15%: 502 batches

### Tomorrow morning tasks
1. Run SELECT * FROM compute_jw_allocation() — refresh JW costs after sync catches up
2. Check if issue_to_mill > 3,000 rows (should be fully populated)
3. Build Design P&L Page using design_costing_v1 view
4. Check S_AV_LINES — should be ok after WITH CHECK policy fix

### Known data quirks
- design_no shows lot_no format (1355/22-23) for old FY22-23 entries — partyChNo not captured in old sync
- grey_purchase_rate = 0 for many REC rows — grey_purchase data not yet synced for those lots
- OriginPanel decodeHtml helper: decodes &#10; &#13; &amp; &quot; from Tally XML entities

## Session 12-13-Apr-2026 -- Party Masters + SQL Migration + n8n v35 Plan

### CRITICAL LESSON LEARNED: Windows-MCP FileSystem corrupts unicode
Windows-MCP FileSystem write() converts all non-ASCII characters to \uXXXX escape sequences.
These appear as literal text on screen (e.g. \uD83D\uDCCB instead of emoji, \u2014 instead of --).
RULE: ALL JSX file writes MUST go through Claude's server bash_tool + git push. NEVER use Windows-MCP for JSX.

### PartyMastersPage.jsx -- Status
- Built: 783-line full profile page with 4 tabs, customer/agent/supplier/transporter profiles
- Live sales stats, recent bills, AI analysis button per customer
- PROBLEM: Page showing unicode escapes on live site
- CAUSE: Windows-MCP wrote old 657-line version with unicode corruptions, Claude's server has correct 783-line version at commit fab8828 but it never got pushed to GitHub
- FIX NEEDED: git push from terminal (or GitHub PAT) to push commit fab8828

### SQL Migration Applied: add_tally_master_fields_v35 (13-Apr-2026)
Applied to Supabase zdekydcscwhuusliwqaz:
- customers: + opening_balance, tally_group, pan_number, transporter_name, enable_broker, distance, tally_sync_at, tally_opening_dr, tally_opening_cr
- suppliers: + opening_balance, tally_group, pan_number, supplier_type, tally_sync_at, tally_opening_dr, tally_opening_cr
- agents: + tally_ledger_name, opening_balance, pan_number, tally_group, tally_sync_at
- transporters: + address, state, pincode, email, gst_number, pan_number, tally_ledger_name, tally_group, opening_balance, status, notes, tally_sync_at
- Indexes: tally_ledger_name on all 4 tables + transporters.name

### Full Gap Analysis Done
Current n8n v34 ONLY syncs vouchers (Sales/Purchase/Issue/REC/JW etc). It NEVER calls Tally Ledger Master export. This means:
- customers.gst_number = NULL for 100% of records
- customers.phone = blank for 100%
- customers.address = blank for 100%
- customers.city = partially wrong (comes from voucher STATENAME, not ledger master)
- suppliers.city/state/phone/email = all blank
- transporters = only had 5 columns (id,name,city,phone,created_at) -- now has 17 columns
- agents = missing tally_ledger_name, PAN, opening balance

### n8n v35 Plan (S_LM Step)
New step calls Tally Collection of Ledger Masters XML endpoint.
Parses: NAME, MAILINGNAME, MAILINGADDR, STATENAME, PINCODE, LEDGERMOBILE, LEDGEREMAIL, GSTIN, PANIT, CREDITPERIOD, OPENINGBALANCE, PARENT, COUNTRYNAME, ISDEEMEDPOSITIVE
Routes to tables by PARENT group:
- Sundry Debtors -> customers (ON CONFLICT tally_ledger_name)
- Sundry Creditors/Grey/Mill/Fabric -> suppliers
- Transport Agency/Courier -> transporters
- Broker/Commission/Agent -> agents
Opening balance parsing: "-12,17,20,542.99 Dr" -> tally_opening_dr / tally_opening_cr / opening_balance
Do NOT overwrite: bank_name, bank_account_number, ifsc_code, account_holder_name, notes in suppliers

### Build Order for v35
1. SQL columns -- DONE (13-Apr-2026)
2. PartyMastersPage UI -- fix unicode + show all new fields (pending git push)
3. n8n v35 code -- write S_LM step + add to workflow
4. Test S_LM on one ledger group first (transporters -- smallest)
5. After S_LM runs -- all master data will populate correctly

### Files Updated This Session
- CLAUDE.md -- updated with current status + build plan
- CLAUDE_MASTER.md -- this file, appended
- SHREERANG_2026_MASTER_REFERENCE.md -- sections 12-15 added (Party Masters field mapping, n8n v35 plan, sessions log)
- Supabase: migration add_tally_master_fields_v35 applied
- PartyMastersPage.jsx: correct 783-line version on Claude server commit fab8828 (NOT yet on GitHub)

### Data Reference (13-Apr-2026)
- customers: 1,162 | agents: 213 | suppliers: 79 | transporters: 225
- Top cities: Mumbai(388), Ahmedabad(116), Surat(100), Kolkata(86), Delhi(85), Jaipur(61)
- Resync running since 11-Apr: last_synced_voucher_date reset to 2022-03-31
- After resync completes: run SELECT * FROM compute_jw_allocation()
