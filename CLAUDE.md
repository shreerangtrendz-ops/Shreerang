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
- `ProcessIssuesPage`, `JobWorkBillsPage` — upgrade to gold standard
- SQL: `jw_allocated_cost` + `jw_allocation_pct` via `compute_jw_allocation()`
- `TallyAccountingHub.jsx.bak` — delete (stale backup file)

### Infrastructure
- Supabase project: `zdekydcscwhuusliwqaz`
- VPS: `72.61.249.86` | n8n: `n8n.shreerangtrendz.com`
- Office network blocked — use mobile hotspot if VPS unreachable
- FRP auth token: `ShreerangFRP2026` | Tally port: `9000`

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

### n8n v34 fix — NOT YET APPLIED TO n8n (09-Apr-2026)
`buildGreyPurchaseRow` must flatMap over ALL `batchallocations`, not just `batches[0]`.
Conflict key must change from `tally_voucher_no` → `(tally_voucher_no, lot_no)`.
Patch reference: `src/n8n/N8N_CODE_v34_patch.md`

### DO NOT delete and resync — preserve these
- `rec_from_mill` computed columns: `grey_purchase_rate`, `cumulative_cost_per_mtr`, `jw_allocated_cost`, `jw_allocation_pct`
- `mill_godown_map` table (40 mappings — mill short name → full party name for JW allocation)
- `missing_rec_from_mill` view

### Supporting table row counts (as of Apr 2026)
`customers=1162`, `agents=213`, `suppliers=79`, `tally_sync_log=966`, `process_issues=14409`, `mill_challan_takas=30`, `mill_godown_map=40`

### Pages status
- **LIVE:** `GreyPurchasePage`, `SalesBillsPage` (gold std), `ProcessIssuesPage` (gold std ✓), `JobWorkBillsPage` (gold std ✓ 4 tabs), `MissingRecFromMillPage`, `OutstandingReportPage`, `DesignCostingPage`, `RecFromMillPage`, `DesignPnLPage`, `PurchaseBillsPage` (gold std ✓ manual entry removed 09-Apr-2026), `TallyAccountingHub` (v26 — all 11 voucher types)
- **COMPONENT:** `src/components/accounting/OriginPanel.jsx` — collapsible origin trail (09-Apr-2026) · wired into SalesBillsPage + DesignCostingPage · queries `design_origin` view
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

**KEY 2 — `party_challan_no`:** `rec_from_mill.party_challan_no` = `jobwork_expenses.supplier_invoice_no`
= mill's own challan no (e.g. `"442"`) | Status: FIXED in v33 (`v.partyChNo || v.reference || v.vnum`)
Alternative match: `job_godown` → `mill_godown_map` → `party_name` AND same `voucher_date`

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

- Current file: `N8N_CODE_v33.js` (08-Apr-2026) — uploaded to n8n workflow `CU6dMm7DCtSP6rMQ`
- `partyChNo` fix: ALREADY APPLIED in v33 ✅
- `issue_to_mill` conflict key: `(lot_no, voucher_date)` composite — DB constraint updated 09-Apr-2026 ✅
- `issue_to_mill` `source_godown` column: ADDED 09-Apr-2026 ✅
- `sales_bills` `all_design_nos` jsonb column: ADDED 09-Apr-2026 ✅
- `grey_purchase` conflict key: `(tally_voucher_no, lot_no)` — DB constraint updated 09-Apr-2026 ✅
- `buildSalesRow` design extraction: still broken for Primary Batch bills (1,067 affected) — fix in `buildSalesBillRow` to read `INVENTORYENTRIESOUT` sub-screen
- **v34 patch needed:** `buildGreyPurchaseRow` flatMap over all batchallocations — see `src/n8n/N8N_CODE_v34_patch.md`
- **Auto-sync:** Schedule Trigger to add in n8n workflow `CU6dMm7DCtSP6rMQ` — every 30 min — see `src/n8n/SCHEDULE_SETUP.md`

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

## OriginPanel React component — TO BUILD

- **File:** `src/components/accounting/OriginPanel.jsx`
- **Props:** `designNo` OR `lotNo`
- **Query:** `design_origin` view
- **Shows:** `supplier_name → supplier_bill_no → lot_no → mill_name → rec_date → cost_per_mtr`
- **Use on:** every accounting page (REC from Mill, Sales Bills, Design Costing, Credit Note, Issue to Mill)

## AntiGravity Updates (09-Apr-2026)

- **multi-design tracking (ll_design_nos, line_items)**: Added extractLineItems logic to uildSalesRow inside 
8n-tally-vouchers-v26.js returning native array structure to accurately map and parse sales_bills multi-design margin traceability natively on Supabase.
- **multi-lot jobwork decoupling**: Applied latMap() iteration across uildProcessRow and uildRecFromMillRow to successfully map Jobwork Journals / Multiple entries into parallel DB rows rather than strictly capping at index \[0]\.
- **Primary Upsert Keys adjusted**: Updated ec_from_mill upside constraints to \	ally_voucher_no,lot_no\ and process_issues to \challan_no,lot_no\ inside n8n to resolve multidimensional voucher payloads.
- **DesignPnLPage.jsx Analytics upgrade**: Removed static .not('design_no') fallback limitations and utilized line_items to directly parse and visualize accurate margins. Embedded OriginPanel traceability natively.
