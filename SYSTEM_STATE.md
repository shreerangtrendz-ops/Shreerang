# SRTPL — System State
## Last Updated: 05-Apr-2026 | By: shreerang.dispatch@gmail.com

> **HOW TO USE THIS FILE:**
> At the start of every Claude session, paste this file and say:
> *"Read this and continue from Next Tasks section"*
> This replaces uploading session docx exports (saves ~7,500 tokens per session).

---

## 🔄 Tally Sync Status

| Item | Value |
|------|-------|
| Workflow | n8n v26 — active, 3x daily (6AM / 2PM / 9:30PM IST) |
| Sync Progress | Reached **2022-09-08** — ~1,312 days behind |
| Latest JSON | `n8n/n8n-tally-sync-v26_19ready.json` in repo |
| Last Fix | CHUNK=50 for S_AV_LINES + sanitizeRow() added |

**All steps currently:** S3✅ S4✅ S4b✅ S5✅ S5b✅ S5c✅ S5d✅ S_CN✅ S_DN✅ S_JW✅ S_AV✅ S_AV_LINES✅

---

## 🔴 Open Issues
- Verify JobWorkExpensesPage fix commit went through (commit after ca66c80)
- Scan remaining pages for `customSupabase` import issues

---

## ✅ Recently Completed (05-Apr-2026)

- **ProcessIssuesPage.jsx** — 4 tabs: Issue to Mill · REC FROM MILL · Pending at Mill · Reconciliation. Sampling toggle (website-side flag), process type selector, days-pending alerts
- **GreyPurchasePage.jsx** — FY selector tabs, 6 summary cards, expandable lot rows with linked REC costing
- **Supabase functions:** `update_rec_costing()` + `update_jobwork_recon()` — nightly pg_cron at 2AM IST
- **Schema additions:**
  - `issue_to_mill`: is_sampling, purpose_note, process_type, stage_no, parent_lot_no
  - `rec_from_mill`: stage_no, parent_rec_id, grey_purchase_rate, cumulative_cost_per_mtr, recon_status
  - `jobwork_expenses`: gp_number, recon_status, recon_note, expected_rec_count, actual_rec_count, sum_rec_job_cost, recon_diff
- **n8n v26 fixes:** sanitizeRow(), CHUNK=50, S_CN_items delete+insert, S_JW dedup by voucher_number only, S_AV_LINES chunked

---

## 📋 Next Tasks (in order)

1. **Verify** JobWorkExpensesPage fix — check commit after ca66c80
2. **Fix** remaining `customSupabase` import issues across all admin pages
3. **Build** `DesignCostingPage` — per-design P&L: grey cost + job cost + sale price = margin %
4. **Build** `JobWorkBillsPage` upgrade — GP linkage, recon status badges, missing REC alerts
5. **Build** `Reconciliation Dashboard` — missing entry alerts for accountant
6. **Build** `Pending at Mill` report — operational followup for manager

---

## 🏗️ Multi-Stage Costing Logic (Business Rule — Locked)

```
Stage 1: Grey Cost = issued_qty × purchase_rate (from grey_purchase.lot_no join)
         Job Cost S1 = finish_qty × job_rate (from rec_from_mill)
         Factory Cost/mtr = (Grey Cost + Job Cost) ÷ finish_qty

Stage 2+: Carry forward S1 cost/mtr as input cost for next stage
          Each shortage reduces qty but cost absorbs → cost/mtr goes up

Reconciliation: Sum(REC job costs per GP) vs Jobwork bill gross
               Mismatch > threshold → flag "Mismatch"
               REC exists, no JW bill → flag "Missing JW Bill"
```

**Costing = Option A** (REC-based per-design), Jobwork bill used for reconciliation only.

**Design Numbers:** Can be new at each stage or hyphenated (e.g. 2611-SCH). Operator decides.

**Sampling flag:** Set on website (process_issues.is_sampling) — NOT in Tally. Unticked = Production.
- Sampling → reminder after 3 days
- Production → reminder after 15 days

---

## 🖥️ Infrastructure

| Item | Value |
|------|-------|
| VPS | srv1246379, IP `72.61.249.86` |
| frpc Office | remotePort **9005** (primary) |
| frpc Laptop | remotePort **9006** (weekend backup) |
| nginx | port **9080** — this is `TALLY_URL` — **NEVER CHANGE** |
| n8n | n8n.shreerangtrendz.com |
| Admin Panel | shreerangtrendz.com/admin |
| Supabase | `zdekydcscwhuusliwqaz` |
| GitHub | shreerangtrendz-ops/Shreerang |

---

## 🗄️ DB Tables (all current)

```
sales_bills          purchase_bills       grey_purchase
process_issues       issue_to_mill        rec_from_mill
jobwork_expenses     credit_note          credit_note_items
debit_note           accounting_vouchers  receipt_payment_lines
stock_journal        mill_challan_takas
tally_sync_state     tally_sync_log
```

---

## ⚠️ Known Quirks (don't re-debug these)

- n8n dashboard shows **OFFLINE badge** = false alarm. Health check doesn't follow redirects. n8n is running fine.
- Zero-voucher n8n runs with `httpStatus=200` = already-synced data, not errors.
- `S3:cols` showing `voucher_class` in column list = OK, column exists in sales_bills table.
- Recon baseline (05-Apr-2026): 1,921 missing REC · 465 mismatches · 209 pending.
- `purchase_bills.line_items` field was REMOVED from buildPurchaseRow in v26 — don't add back.
- `process_issues.line_items` field was REMOVED from buildProcessRow in v26 — don't add back.

---

## 📁 Admin Pages Built (React)

| Page | Route | Status |
|------|-------|--------|
| ProcessIssuesPage | /admin/accounting/process-issues | ✅ Live |
| GreyPurchasePage | /admin/accounting/grey-purchase | ✅ Live |
| JobWorkExpensesPage | /admin/accounting/jobwork | ✅ Fix pending verify |
| SalesBillsPage | /admin/accounting/sales | ✅ Live |
| DesignCostingPage | /admin/accounting/design-costing | ❌ Not built yet |
| JobWorkBillsPage | /admin/accounting/jobwork-bills | ❌ Not built yet |
| ReconciliationDashboard | /admin/accounting/reconciliation | ❌ Not built yet |
