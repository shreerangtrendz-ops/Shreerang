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
- Use correct relative Supabase import path (not absolute)
- Monday morning: run `sed -i 's/9006/9005/' /etc/nginx/conf.d/tally-internal.conf && nginx -t && systemctl reload nginx` before opening Tally

### Voucher pipeline (V-01 → V-05)
- V-01: `grey_purchase` (785 rows)
- V-02: `issue_to_mill` (0 rows — n8n sync BLOCKED, fix: `v.reference` → `v.partyChNo`)
- V-03: `jobwork_expenses` (1,527 rows)
- V-04: `rec_from_mill` (3,387 rows)
- V-05: `sales_bills` (973 rows)

### Gold standard page
`SalesBillsPage.jsx` — teal color theme, FY tabs, SummaryCard components, `Math.abs()` on costs, 50-row pagination. All new pages must match this pattern.

### Pages pending
- `MissingRecFromMillPage` — route + sidebar wiring
- `PurchaseBillsPage`, `ProcessIssuesPage`, `JobWorkBillsPage` — upgrade to gold standard
- SQL: `jw_allocated_cost` + `jw_allocation_pct` via `compute_jw_allocation()`

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
Conflict keys: `sales_bills=tally_voucher_no`, `grey_purchase=tally_voucher_no`, `process_issues=challan_no`, `issue_to_mill=lot_no`, `rec_from_mill=tally_voucher_no`

### n8n v28 fix (MUST apply before next resync)
In `buildRecFromMillRow` (~line 591):
```js
// WRONG:
party_challan_no: v.reference || v.vnum
// CORRECT:
party_challan_no: v.partyChNo || v.reference || v.vnum
```

### DO NOT delete and resync — preserve these
- `rec_from_mill` computed columns: `grey_purchase_rate`, `cumulative_cost_per_mtr`, `jw_allocated_cost`, `jw_allocation_pct`
- `mill_godown_map` table (40 mappings — mill short name → full party name for JW allocation)
- `missing_rec_from_mill` view

### Supporting table row counts (as of Apr 2026)
`customers=1162`, `agents=213`, `suppliers=79`, `tally_sync_log=966`, `process_issues=14409`, `mill_challan_takas=30`, `mill_godown_map=40`

### Pages status
- **LIVE:** `GreyPurchasePage`, `SalesBillsPage` (gold std), `ProcessIssuesPage`, `JobWorkBillsPage`, `MissingRecFromMillPage`, `OutstandingReportPage`, `DesignCostingPage`
- **NEEDED:** `RecFromMillPage` (dedicated), Design P&L Page, PurchaseBills (finished fabric)
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
- `partyChNo` fix: ALREADY APPLIED in v33
- `issue_to_mill` conflict key: `lot_no,voucher_date` (composite)
- `buildSalesRow` design extraction: still broken for Primary Batch bills (1,067 affected) — fix in `buildSalesBillRow` to read `INVENTORYENTRIESOUT` sub-screen

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

## SRTPL — Files to delete (old manual-entry, conflicts with Tally sync)

`JobWorkBillDashboard.jsx`, `JobWorkBillForm.jsx`, `PurchaseBillDashboard.jsx`, `PurchaseBillForm.jsx`,
`SalesBillDashboard.jsx`, `SalesBillForm.jsx`, `CommissionBrokerageDashboard.jsx`, `CommissionBrokerageForm.jsx`
