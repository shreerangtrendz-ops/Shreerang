# SHREERANG 2026 — MASTER REFERENCE DOCUMENT
**SheeRang Trendz Pvt. Ltd. | Tally ↔ n8n ↔ Supabase ↔ Web Platform**
*Last Updated: 06-Apr-2026 (Session 3) | Author: Shrikumar Maru*

---

## 1. INFRASTRUCTURE OVERVIEW

| Component | Details |
|---|---|
| **Supabase** | Project: `zdekydcscwhuusliwqaz` · Region: ap-northeast-2 · URL: https://zdekydcscwhuusliwqaz.supabase.co |
| **Vercel** | Team: `team_LYYmREzCpoHYnvToxlhACgrc` · Project: `prj_TTqBNS3XLlk8C5RX43YZ8zr7U9I5` · Auto-deploy from `shreerangtrendz-ops/Shreerang` master branch |
| **n8n** | Self-hosted at `n8n.shreerangtrendz.com` · Workflow: `CU6dMm7DCtSP6rMQ` · MCP workflow: `rPJxgZgZJ76R1M1j` |
| **Tally Prime** | Gold edition · Company: SheeRang Trendz Pvt. Ltd. (from 1-Apr-2019) · Port: 9005 via FRP |
| **VPS** | srv1246379 · IP: 72.61.249.86 · n8n DB: `/var/lib/docker/volumes/n8n-ened_n8n_data/_data/database.sqlite` |
| **Local Code** | `I:\My Drive\Automation\Shreerang 2026\Horizon Code\src\` |

**Tally sync trigger:** POST to `https://n8n.shreerangtrendz.com/api/v1/workflows/CU6dMm7DCtSP6rMQ/run` with header `X-N8N-API-KEY: n8n_api_45dba335541e42cfa98255662629155c`

---

## 2. COMPLETE TALLY → SUPABASE → WEB FIELD MAPPING

### 2.1 GREY PURCHASE (Purchase Voucher in Tally)

**Tally Voucher Type:** Purchase
**Supabase Table:** `grey_purchase`
**Web Page:** `GreyPurchasePage.jsx`

| Tally Field | Supabase Column | Data Type | Notes |
|---|---|---|---|
| Voucher No (Tally seq) | `tally_voucher_no` | text | e.g. "555" |
| Voucher Date | `voucher_date` | date | |
| Supplier Name (Party) | `supplier_name` | text | |
| Supplier GSTIN | `supplier_gstin` | text | |
| Supplier Invoice No | `supplier_invoice_no` | text | e.g. "1070/22-23" |
| Supplier Invoice Date | `supplier_invoice_date` | date | |
| **Batch Name (Stock Alloc)** | **`lot_no`** | text | **KEY 1 — e.g. "151/22-23"** |
| Item Name | `item_name` | text | e.g. "Two Tone Rayon Gray" |
| HSN Code | `hsn_code` | text | |
| Taka/Pcs | `taka_pcs` | integer | |
| Taka ABC | `taka_abc` | text | |
| Taka No | `taka_no` | text | |
| Actual Qty (mtrs) | `actual_qty_mtrs` | numeric | Physical measurement |
| Billed Qty (mtrs) | `billed_qty_mtrs` | numeric | Invoice quantity |
| Rate (per mtr) | `rate` | numeric | Grey fabric rate |
| Item Amount | `item_amount` | numeric | Before GST |
| Assessable Value | `assessable_value` | numeric | |
| Net Rate | `net_rate` | numeric | After comm deduction |
| CGST Amount | `cgst_amount` | numeric | |
| SGST Amount | `sgst_amount` | numeric | |
| IGST Amount | `igst_amount` | numeric | Interstate purchases |
| Round Off | `round_off` | numeric | |
| Total Amount | `total_amount` | numeric | Final bill value |
| Godown Name | `godown_name` | text | Where fabric stored |
| Process Lot No | `process_lot_no` | text | |
| Process Mill Name | `process_mill_name` | text | |
| Broker Name | `broker_name` | text | |
| Comm Rate | `comm_rate` | numeric | % |
| Comm Amount | `comm_amount` | numeric | Negative (deduction) |
| Place of Supply | `place_of_supply` | text | |
| Purchase Ledger | `purchase_ledger` | text | |
| Track Party | `track_party` | text | |
| Track Date | `track_date` | date | |
| Track Ref No | `track_ref_no` | text | |
| Narration | `narration` | text | |

**Join Keys:**
- `lot_no` → `issue_to_mill.lot_no` (Key 1 — grey fabric batch identity)
- `lot_no` → `rec_from_mill.grey_lot_no` (Key 1 continued)

---

### 2.2 ISSUE TO MILL (Stock Journal in Tally)

**Tally Voucher Type:** Issue to Mill (Stock Journal sub-type)
**Supabase Table:** `issue_to_mill`
**Web Page:** `JobWorkBillsPage.jsx` (Tab: Issue to Mill)

| Tally Field | Supabase Column | Data Type | Notes |
|---|---|---|---|
| Voucher No (Tally seq) | `tally_voucher_no` | text | Often = lot_no e.g. "151/22-23" |
| Voucher Date | `voucher_date` | date | |
| Mill Name (Destination Godown Party) | `mill_name` | text | Full registered name |
| Destination Godown | `destination_godown` | text | Mill's godown short name |
| Source Godown | `godown_name` | text | Our godown (where fabric was) |
| Item Name | `item_name` | text | Grey fabric name |
| HSN Code | `hsn_code` | text | |
| Taka/Pcs | `taka_pcs` | integer | |
| **Batch Name (Stock Alloc OUT)** | **`lot_no`** | text | **KEY 1 — same as grey_purchase.lot_no** |
| Qty (mtrs) | `qty_mtrs` | numeric | ⚠ Often 0 for newer entries — use grey_purchase.actual_qty_mtrs |
| Rate | `rate` | numeric | Grey fabric cost rate |
| Amount | `amount` | numeric | |
| Batch Qty Mtrs | `batch_qty_mtrs` | numeric | |
| Batch Amount | `batch_amount` | numeric | |
| Track Party Name | `track_party_name` | text | |
| Track Date | `track_date` | date | |
| Track Ref No | `track_ref_no` | text | |
| Is Sampling? | `is_sampling` | boolean | |
| Purpose Note | `purpose_note` | text | |
| Process Type | `process_type` | text | |
| Stage No | `stage_no` | integer | 1=first process, 2+=subsequent |
| Parent Lot No | `parent_lot_no` | text | For multi-stage lots |
| Narration | `narration` | text | |

**⚠ IMPORTANT:** `qty_mtrs = 0` for many entries. Use `grey_purchase.actual_qty_mtrs` via `lot_no` join for actual metres.

**Join Keys:**
- `lot_no` = `grey_purchase.lot_no` (Key 1 backward)
- `lot_no` = `rec_from_mill.grey_lot_no` (Key 1 forward)

---

### 2.3 REC FROM MILL (Stock Journal in Tally — Production side)

**Tally Voucher Type:** REC FROM MILL (Inventory Voucher)
**Supabase Table:** `rec_from_mill`
**Web Page:** `JobWorkBillsPage.jsx` (Tab: REC from Mill) ← NEEDS DEDICATED PAGE

This is the most important voucher — it is where **design_no is born** and **cost is calculated**.

**Tally screen has TWO sides:**
- **Source (Consumption) = LEFT side** = grey fabric going OUT of mill godown
- **Destination (Production) = RIGHT side** = finished fabric coming IN to Main Location

| Tally Field | Supabase Column | Data Type | Notes |
|---|---|---|---|
| No. (Tally seq) | `tally_voucher_no` | text | e.g. "796" |
| Date | `voucher_date` | date | **Must match Jobwork bill date for JW cost allocation** |
| **Reference No** | stored in `party_challan_no` | text | = your lot no (e.g. "151") ← n8n BUG |
| **Party Ch. No** | should be `party_challan_no` | text | = mill's OWN receipt no (e.g. "698") ← CORRECT link to JW bill |
| Lot No. (header) | `lot_no` (also = `design_no`) | text | Finished design batch no |
| Issue Challan No | `issue_challan_no` | text | |
| Job Godown | `job_godown` | text | Short mill name e.g. "Rivaa Export (Sachin)" |
| Our Godown | `our_godown` | text | "Main Location" |
| **Source: Batch/Lot (OUT batch)** | **`grey_lot_no`** | text | **KEY 1 — joins grey_purchase.lot_no** |
| Source: Item Name | `grey_item_name` | text | Grey fabric |
| Source: Godown | `source_godown` | text | Mill's godown |
| Source: Qty (issued) | `grey_issued_qty_mtrs` | numeric | |
| Source: Rate | `grey_rate` | numeric | Grey rate at time of issue |
| Source: Amount | `grey_amount` | numeric | |
| Source: Job Rate (UDF) | `job_rate` | numeric | Processing rate per mtr |
| Source: Job Amount (UDF) | `job_amount` | numeric | Negative (cost to P&L) |
| Source: Gross Amt (UDF) | `gross_amount` | numeric | |
| **Destination: Batch (IN batch)** | **`design_no`** | text | **KEY 3 — born here e.g. "3270"** |
| Destination: Item Name | `finish_item_name` | text | Finished fabric name |
| Destination: Godown | `dest_godown` | text | "Main Location" |
| Destination: Qty (received) | `finish_qty_mtrs` | numeric | Actual metres received back |
| Destination: Rate | `finish_rate` | numeric | |
| Destination: Amount | `finish_amount` | numeric | |
| Weaver Name (UDF) | `weaver_name` | text | |
| Quality Name (UDF) | `quality_name` | text | |
| Shortage Mtrs (UDF) | `shortage_mtrs` | numeric | |
| Shortage % (UDF) | `shortage_pct` | numeric | |
| Short Qty Mtrs | `short_qty_mtrs` | numeric | |
| Stage No | `stage_no` | integer | |
| Parent Rec ID | `parent_rec_id` | uuid | For multi-stage |
| Parent Lot No | `parent_lot_no` | text | |
| Process Type | `process_type` | text | |
| Narration | `narration` | text | |
| Grey Recd Qty Mtrs | `grey_recd_qty_mtrs` | numeric | Same as finish_qty_mtrs |

**Computed cost columns (calculated by system, not from Tally):**
| Column | Calculation |
|---|---|
| `grey_purchase_rate` | From grey_purchase.rate via lot_no join |
| `grey_cost_actual` | grey_purchase_rate × finish_qty_mtrs |
| `cumulative_cost_per_mtr` | (grey_cost + job_amount) / finish_qty_mtrs |
| `recon_status` | 'matched'/'mismatch'/'pending' |
| `jw_voucher_number` | Linked jobwork_expenses.voucher_number |
| `jw_expense_amount` | JW bill total |
| `jw_allocated_cost` | (finish_qty / group_total_mtrs) × jw_expense_amount |
| `jw_allocation_pct` | % of JW bill allocated to this REC entry |

**⚠ KNOWN BUG: `mill_name` is NULL for 3,290 of 3,388 rows.** Mill identity is in `job_godown`. Fix: use `job_godown` and join `mill_godown_map` for full registered name.

**⚠ KNOWN BUG: `party_challan_no`** currently stores Reference No (= lot no = "151") instead of Party Ch. No (= mill's own challan = "442"). n8n fix required: `party_challan_no: v.partyChNo || v.reference || v.vnum`

---

### 2.4 JOBWORK EXPENSES (Purchase Voucher in Tally — Jobwork/Expenses type)

**Tally Voucher Type:** Jobwork | Expenses
**Supabase Table:** `jobwork_expenses`
**Web Page:** `JobWorkBillsPage.jsx` (Tabs: Jobwork Bills / Other Expenses)

| Tally Field | Supabase Column | Data Type | Notes |
|---|---|---|---|
| Voucher No (Tally seq) | `voucher_number` | text | |
| Voucher Type | `voucher_type` | text | **'Jobwork' OR 'Expenses'** |
| Voucher Date | `voucher_date` | date | **Must match rec_from_mill.voucher_date for JW allocation** |
| **Supplier Invoice No (Party's bill no)** | **`supplier_invoice_no`** | text | **KEY 2 — e.g. "1021/22-23" OR "442"** |
| Supplier Invoice Date | `supplier_invoice_date` | date | |
| Party Name | `party_name` | text | Full registered mill name |
| Party GSTIN | `party_gstin` | text | |
| GST Reg Type | `gst_reg_type` | text | |
| Place of Supply | `place_of_supply` | text | |
| Entered By | `entered_by` | text | |
| Narration | `narration` | text | |
| Bill Ref | `bill_ref` | text | |
| Bill Type | `bill_type` | text | |
| **Expense Ledger** | **`expense_ledger`** | text | The P&L ledger |
| **Expense Amount** | **`expense_amount`** | numeric | **Main amount — NOT `amount`** |
| TDS Amount | `tds_amount` | numeric | |
| CGST Amount | `cgst_amount` | numeric | |
| SGST Amount | `sgst_amount` | numeric | |
| IGST Amount | `igst_amount` | numeric | |
| Round Off | `round_off` | numeric | |
| Party Amount | `party_amount` | numeric | Net payable |
| Total Amount | `total_amount` | numeric | Gross including GST |
| Ledger Entries | `ledger_entries` | jsonb | All Dr/Cr ledger lines |
| GP Number | `gp_number` | text | Our GP/challan reference (added later) |
| Recon Status | `recon_status` | text | 'matched'/'mismatch'/'missing_rec'/'pending' |
| Recon Note | `recon_note` | text | |
| Expected REC Count | `expected_rec_count` | integer | |
| Actual REC Count | `actual_rec_count` | integer | |
| Sum REC Job Cost | `sum_rec_job_cost` | numeric | Sum of rec_from_mill.job_amount for same group |
| Recon Diff | `recon_diff` | numeric | |

**⚠ THERE IS NO `amount` COLUMN. Always use `expense_amount`.**

**JW Cost Allocation Logic:**
- Match: `rec_from_mill.job_godown` → `mill_godown_map` → `jobwork_expenses.party_name`
- AND `rec_from_mill.voucher_date = jobwork_expenses.voucher_date`
- Allocate: `jw_allocated_cost = (finish_qty_mtrs / total_group_mtrs) × expense_amount`
- When multiple JW bills same date → pick closest by `ABS(expense_amount - sum_rec_job_cost)`

---

### 2.5 SALES BILLS (Sales Voucher in Tally)

**Tally Voucher Type:** Sales
**Supabase Table:** `sales_bills`
**Web Page:** `SalesBillsPage.jsx`

| Tally Field | Supabase Column | Data Type | Notes |
|---|---|---|---|
| Our Bill No | `bill_number` | text | e.g. "1490" |
| Tally Voucher No | `tally_voucher_no` | text | e.g. "SRTPL/1490/22-23" |
| Bill Date | `bill_date` | date | |
| Effective Date | `effective_date` | date | |
| Voucher Class | `voucher_class` | text | |
| Party A/C | `customer_name` | text | |
| Customer GSTIN | `customer_gstin` | text | |
| Customer State | `customer_state` | text | |
| Place of Supply | `place_of_supply` | text | |
| Item Name | `item_name` | text | Finished fabric name |
| Fabric Name | `fabric_name` | text | |
| **Design No (Stock Alloc batch)** | **`design_no`** | text | **KEY 3 — links to rec_from_mill.design_no** |
| **Batch Name** | **`batch_name`** | text | Same as design_no e.g. "D No.3270" |
| Godown | `godown` | text | |
| **Qty (mtrs) — Actual** | **`quantity_mtrs`** | numeric | **NOT `billed_qty` or `actual_qty`** |
| **Taka/Pcs** | **`total_taka_pcs`** | integer | **NOT `taka_pcs`** |
| **Rate per Mtr** | **`rate_per_mtr`** | numeric | **NOT `net_rate`** |
| **Taxable Value** | **`taxable_value`** | numeric | **NOT `assessable_value`** |
| IGST Amount | `igst_amount` | numeric | |
| CGST Amount | `cgst_amount` | numeric | |
| SGST Amount | `sgst_amount` | numeric | |
| Round Off | `round_off` | numeric | |
| Total Amount | `total_amount` | numeric | |
| Broker Name | `broker_name` | text | |
| Comm Rate | `comm_rate` | numeric | % |
| Comm Amount | `comm_amount` | numeric | |
| Comm Assessed Value | `comm_assessed_value` | numeric | |
| Comm Ledger Name | `comm_ledger_name` | text | |
| Sales Ledger | `sales_ledger` | text | |
| Credit Days | `credit_days` | text | |
| Bill Ref Number | `bill_ref_number` | text | |
| Transporter | `transporter_name` | text | |
| LR Number | `lr_number` | text | |
| Destination City | `destination_city` | text | |
| e-Way Bill No | `eway_bill_no` | text | |
| IRN | `irn` | text | |
| IRN Ack No | `irn_ack_no` | text | |
| Entered By | `entered_by` | text | |
| Narration | `narration` | text | |
| Agent Name | `agent_name` | text | |
| Line Items (sub-screen alloc) | `line_items` | jsonb | Multiple designs in one bill |

**⚠ COLUMNS THAT DO NOT EXIST:** `billed_qty`, `actual_qty`, `taka_pcs` (use `total_taka_pcs`), `reference_no`, `gst_number`, `net_rate` (use `rate_per_mtr`), `mill_godown`, `assessable_value` (use `taxable_value`), `folding_details`

**⚠ DATA QUALITY:** 1,067 bills have `design_no = NULL` and `batch_name = 'Primary Batch'` with no `line_items` data. These are multi-design bills where n8n is not extracting design from the allocation sub-screen. Needs fix.

**Join Keys:**
- `design_no` = `rec_from_mill.design_no` (Key 3)
- `bill_number` = `credit_note.bill_ref` (Key 4)
- `tally_voucher_no` = `receipt_payment_lines.bill_ref` (Outstanding)

---

### 2.6 CREDIT NOTE

**Tally Voucher Type:** Credit Note
**Supabase Tables:** `credit_note` (header) + `credit_note_items` (line items)
**Web Page:** Part of `FinancialVouchersPage.jsx`

#### credit_note (header)
| Tally Field | Supabase Column | Notes |
|---|---|---|
| Voucher No | `tally_voucher_no` | e.g. "Cn143" |
| Date | `voucher_date` | |
| Party Name | `party_name` | Customer |
| Party GSTIN | `party_gstin` | |
| Place of Supply | `place_of_supply` | |
| State | `state_name` | |
| Original Voucher No | `original_voucher_no` | |
| Original Bill Date | `original_bill_date` | |
| **Against Ref (bill ref)** | **`bill_ref`** | **KEY 4 — joins sales_bills.bill_number** |
| IRN | `irn` | |
| IRN Ack Date | `irn_ack_date` | |
| Entered By | `entered_by` | |
| Narration | `narration` | |
| CGST | `cgst_amount` | |
| SGST | `sgst_amount` | |
| IGST | `igst_amount` | |
| Discount | `discount_amount` | |
| Round Off | `round_off` | |
| Party Amount | `party_amount` | Net credit |
| Broker Name | `broker_name` | |
| Comm Rate | `comm_rate` | |
| Comm Amount | `comm_amount` | |
| Comm Assessed Value | `comm_assessed_value` | |

#### credit_note_items (one row per design in the CN)
| Tally Field | Supabase Column | Notes |
|---|---|---|
| Tally Voucher No | `tally_voucher_no` | Links to credit_note header |
| Item Name | `item_name` | |
| HSN Code | `hsn_code` | |
| **Design No (batch)** | **`design_no`** | **Returned design — KEY 3 (may differ from original sale)** |
| Godown | `godown_name` | |
| Qty (mtrs) | `qty_mtrs` | |
| Rate | `rate` | |
| Discount % | `discount_pct` | |
| Item Amount | `item_amount` | |

**Important:** `design_no` in `credit_note_items` = the **returned** design, which may be different from the original sale design. Join `credit_note_items.design_no` directly for design-level P&L — do NOT use the CN header's `bill_ref` for this.

---

### 2.7 DEBIT NOTE

**Tally Voucher Type:** Debit Note
**Supabase Table:** `debit_note`
**Web Page:** Part of `FinancialVouchersPage.jsx`

| Tally Field | Supabase Column | Notes |
|---|---|---|
| Voucher No | `tally_voucher_no` | |
| Date | `voucher_date` | |
| Party Name | `party_name` | Supplier |
| Party GSTIN | `party_gstin` | |
| Place of Supply | `place_of_supply` | |
| State | `state_name` | |
| Original Bill Ref | `original_bill_ref` | |
| Original Bill Date | `original_bill_date` | |
| Nature of Return | `nature_of_return` | |
| Entered By | `entered_by` | |
| Description | `user_description` | |
| Narration | `narration` | |
| Bill Ref | `bill_ref` | |
| Expense Ledger | `expense_ledger` | |
| Expense Amount | `expense_amount` | |
| CGST | `cgst_amount` | |
| SGST | `sgst_amount` | |
| IGST | `igst_amount` | |
| Round Off | `round_off` | |
| Party Amount | `party_amount` | |

---

### 2.8 ACCOUNTING VOUCHERS — RECEIPT / PAYMENT / CONTRA / JOURNAL

**Tally Voucher Types:** Receipt, Payment, Contra, Journal
**Supabase Table:** `accounting_vouchers`
**Supabase Table (lines):** `receipt_payment_lines` (bill-wise settlement detail)
**Web Page:** `FinancialVouchersPage.jsx`

#### accounting_vouchers
| Tally Field | Supabase Column | Notes |
|---|---|---|
| Voucher No | `voucher_number` | |
| Voucher Type | `voucher_type` | Receipt/Payment/Contra/Journal |
| Date | `voucher_date` | |
| Party Name | `party_name` | |
| Entered By | `entered_by` | |
| Narration | `narration` | |
| Dr Ledger | `dr_ledger` | |
| Dr Amount | `dr_amount` | |
| Cr Ledger | `cr_ledger` | |
| Cr Amount | `cr_amount` | |
| Total Amount | `total_amount` | |
| Bank Ledger | `bank_ledger` | |
| Payment Mode | `payment_mode` | |
| Instrument No | `instrument_no` | Cheque no |
| Instrument Date | `instrument_date` | |
| Payment Favouring | `payment_favouring` | |
| URN | `urn` | UPI ref |
| Transfer Mode | `transfer_mode` | |
| IFSC Code | `ifsc_code` | |
| Bank Name | `bank_name` | |
| Account Number | `account_number` | |
| Bill Allocations | `bill_allocations` | jsonb — bill-wise settlement |
| Ledger Entries | `ledger_entries` | jsonb — all Dr/Cr lines |

#### receipt_payment_lines (one row per bill settled in a payment/receipt)
| Column | Notes |
|---|---|
| `voucher_number` | Links to accounting_vouchers |
| `voucher_type` | Receipt / Payment |
| `voucher_date` | |
| `party_name` | Customer/Supplier |
| `bill_ref` | **= sales_bills.tally_voucher_no — for outstanding calculation** |
| `bill_type` | New Ref / Against Ref |
| `bill_amount` | Amount settled in this line |
| `broker_name` | |
| `comm_rate`, `comm_amount`, `comm_ass_value`, `comm_net_rate` | Broker commission on receipt |
| `bank_ledger`, `payment_mode`, `instrument_no` | Payment details |

---

## 3. THE 4 JOIN KEYS — COMPLETE CHAIN

```
GREY PURCHASE ──────── lot_no ─────────────────────────────────────────────────────────┐
      │                                                                                 │
      │ (KEY 1: lot_no)                                                                 │
      ↓                                                                                 │
ISSUE TO MILL ────── lot_no ─────────────────────────────────────────────────────────── ↓
      │                                                                               REC FROM MILL
      │ (KEY 1: grey_lot_no)                                    KEY 2: party_challan_no → supplier_invoice_no
      ↓                                                                               ↓
REC FROM MILL ──── design_no ────────────────────────────────────────────── JOBWORK EXPENSES
      │ (KEY 3)
      ↓
SALES BILLS ──── bill_number / tally_voucher_no ─────────────────────────────────────┐
      │                                                                               │
      │ (KEY 4: bill_ref)                              RECEIPT/PAYMENT (outstanding)  │
      ↓                                                      bill_ref ────────────────┘
CREDIT NOTE ──── tally_voucher_no ────→ CREDIT NOTE ITEMS (design_no, qty_mtrs)
```

### Key 1 — `lot_no` (Grey Batch Identity)
- `grey_purchase.lot_no` = `issue_to_mill.lot_no` = `rec_from_mill.grey_lot_no`
- **Status: ✅ FULLY WIRED**
- Format: `151/22-23` (sequential number / FY)
- One lot = one purchase = one batch of grey fabric

### Key 2 — `party_challan_no` (Mill's Own Challan → JW Bill)
- `rec_from_mill.party_challan_no` should = `jobwork_expenses.supplier_invoice_no`
- **Status: ⚠ PARTIALLY BROKEN**
- Tally has TWO fields on REC FROM MILL:
  - **Reference No** = your lot number (e.g. "151") — currently stored as party_challan_no ← WRONG
  - **Party Ch. No** = mill's delivery challan (e.g. "442", "696") — CORRECT value needed
- **n8n Fix (v28):** `party_challan_no: v.partyChNo || v.reference || v.vnum`
- Alternative allocation: match by `job_godown` → `mill_godown_map` → `party_name` AND same `voucher_date`
- One JW bill covers many REC entries → allocate proportionally by `finish_qty_mtrs`

### Key 3 — `design_no` (Finished Design Identity)
- `rec_from_mill.design_no` = `sales_bills.design_no` = `sales_bills.batch_name` = `credit_note_items.design_no`
- **Status: ✅ FULLY WIRED**
- **Born in:** REC FROM MILL → Destination Batch (Production side OUT batch)
- Does NOT exist in grey_purchase or issue_to_mill
- One lot can produce MULTIPLE designs (different REC entries from same grey lot)
- One sales bill can contain MULTIPLE designs (in `line_items` JSONB)
- `credit_note_items.design_no` = RETURNED design (may differ from original sale)

### Key 4 — `bill_ref` (Sales → Credit Note → Payment)
- `sales_bills.bill_number` = `credit_note.bill_ref`
- `sales_bills.tally_voucher_no` = `receipt_payment_lines.bill_ref`
- **Status: ✅ FULLY WIRED**
- Outstanding = `sales_bills.total_amount` - SUM(`receipt_payment_lines.bill_amount WHERE voucher_type='Receipt'`)

---

## 4. COST CHAIN — HOW COST FLOWS FROM PURCHASE TO SALE

This is the main purpose of all the mapping above. The goal is to calculate **profit per design**.

```
GREY FABRIC COST (grey_purchase)
  → rate per mtr × actual_qty_mtrs = raw material cost

ISSUE TO MILL (issue_to_mill)
  → fabric leaves our stock at grey_purchase rate

PROCESSING COST (rec_from_mill + jobwork_expenses)
  → job_amount = job_rate × finish_qty_mtrs (from rec_from_mill, negative value)
  → jw_allocated_cost = proportional share of JW bill amount
  → cumulative_cost_per_mtr = (grey_cost_actual + job_amount) / finish_qty_mtrs

FINISHED FABRIC READY (rec_from_mill)
  → design_no born
  → finish_qty_mtrs = physical metres received back
  → shortage = grey_issued_qty - finish_qty (mill wastage / sample cuts)

SALE (sales_bills)
  → total_amount / quantity_mtrs = selling rate per mtr
  → comm_amount = broker commission

PROFIT PER DESIGN
  = (selling_rate - cumulative_cost_per_mtr) × quantity_mtrs
  - broker commission
  - returns from credit_note_items
```

**Cost columns in rec_from_mill:**

| Column | Formula | Example (lot 151, design 3270, 712m) |
|---|---|---|
| `grey_purchase_rate` | From grey_purchase.rate | ₹34/m |
| `grey_cost_actual` | rate × finish_qty_mtrs | ₹34 × 712 = ₹24,208 |
| `job_amount` | job_rate × finish_qty_mtrs | ₹34 × 712 = ₹24,208 (negative) |
| `jw_allocated_cost` | (712/total_group_mtrs) × JW bill | Proportional |
| `cumulative_cost_per_mtr` | (grey_cost + job) / finish_qty | ₹70.70/m |

---

## 5. DATA QUALITY AUDIT (as of 06-Apr-2026)

### 5.1 Sync Status
| Table | Records | Last Voucher Date | Days Behind |
|---|---|---|---|
| `sales_bills` | 9,091 | 2026-03-30 | ~7 days |
| `issue_to_mill` | 4,187 | 2024-08-29 | 585 days |
| `rec_from_mill` | 3,388 | 2024-06-03 | 672 days |
| `grey_purchase` | 843 | ~2024 | Behind |
| `jobwork_expenses` | 2,602 | ~2024 | Behind |
| `credit_note` | 1,555 | ~2024 | Behind |
| `accounting_vouchers` | 6,881 | ~2024 | Behind |
| `receipt_payments` | 2,753 | 2026-04-01 | Current ✅ |
| `receipt_payment_lines` | 4,842 | Current | Current ✅ |

### 5.2 Design No Mapping Quality

| Table | Total | Clean Numeric | Primary Batch | NULL/Garbage | Status |
|---|---|---|---|---|---|
| `rec_from_mill.design_no` | 3,388 | 2,957 (87%) | 294 (9%) | 137 (4%) | Good |
| `sales_bills.design_no` | 9,091 | 7,888 (87%) | 0 | 1,070 (12%) NULL | ⚠ Issue |
| `credit_note_items.design_no` | 2,474 | 960 (39%) | 110 (4%) | 1,391 (56%) NULL | ⚠ Issue |

**Root cause of NULLs in sales_bills:** 1,067 bills have `batch_name = 'Primary Batch'` — n8n not extracting design from Tally stock allocation sub-screen for multi-design sales. Fix needed in n8n `buildSalesBillRow`.

**Root cause of NULLs in credit_note_items:** Same issue — CN items without batch allocation in Tally.

### 5.3 rec_from_mill.mill_name Quality
- **3,290 of 3,388 rows have `mill_name = NULL`**
- Mill identity is correctly in `job_godown` (short name)
- Use `mill_godown_map` table to get full registered name
- Pages should use `job_godown` not `mill_name` for mill display

### 5.4 issue_to_mill qty_mtrs
- Many rows have `qty_mtrs = 0` — older entries where qty was not stored
- Correct qty = `grey_purchase.actual_qty_mtrs` via `lot_no` join

### 5.5 Missing REC FROM MILL
- **2,102 lots issued to mill with no REC entry (OVERDUE — before sync cutoff)**
- **375 lots potentially sync_lag (issued after rec sync cutoff)**
- Fabric at risk: ₹2.05 Cr, 3,82,684 metres
- View `missing_rec_from_mill` is live in Supabase
- Page `MissingRecFromMillPage.jsx` exists in accounting folder

---

## 6. PAGE INVENTORY — ACCOUNTING SECTION
*Last verified: 06-Apr-2026 against GitHub master branch `shreerangtrendz-ops/Shreerang`*

### 6.1 Pages that SHOULD EXIST and DO EXIST ✅

| Page File | Route | Tally Source | Status |
|---|---|---|---|
| `GreyPurchasePage.jsx` | `/admin/accounting/grey-purchase` | grey_purchase | ✅ Working — reference pattern for new pages |
| `SalesBillsPage.jsx` | `/admin/accounting/sales-bills` | sales_bills | ✅ v3 — all correct Tally columns |
| `JobWorkBillsPage.jsx` | `/admin/accounting/job-work-bills` | issue_to_mill + rec_from_mill + jobwork_expenses | ✅ v4 — **4 tabs** (Issue / REC / Jobwork / Expenses) |
| `JobWorkExpensesPage.jsx` | `/admin/accounting/jobwork` | jobwork_expenses | ✅ Working — recon badges, GP number |
| `FinancialVouchersPage.jsx` | `/admin/accounting/vouchers` | accounting_vouchers | ✅ Working — all voucher types |
| `ProcessIssuesPage.jsx` | `/admin/accounting/process-issues` | process_issues | ✅ Working — 4 tabs, sampling toggle, alerts |
| `MissingRecFromMillPage.jsx` | `/admin/accounting/missing-rec` | missing_rec_from_mill (view) | ✅ **Live** — route + sidebar confirmed in App.jsx |
| `OutstandingReportPage.jsx` | `/admin/accounting/outstanding` | sales_bills + receipt_payment_lines + customers | ✅ **Live** — 5 tabs: Party/City/Area/Broker/Ageing |
| `DesignCostingPage.jsx` | `/admin/accounting/design-costing` | design_costing_v1 (view) | ✅ Exists |

**Notes:**
- `MissingRecFromMillPage` uses `destination_godown` (not `mill_name`) for mill filter — `mill_name` is 97% NULL
- `OutstandingReportPage` has ⚠️ caveat banner: receipt_payments only from Jul-2024

### 6.2 Pages that ARE MISSING and NEEDED ❌

| Missing Page | Data Source | Priority | Why Needed |
|---|---|---|---|
| **RecFromMillPage** (dedicated) | `rec_from_mill` | HIGH | Currently only a tab in JobWorkBillsPage. Needs own page: all cost columns, mill filter (job_godown), design filter, shortage >15% flag, JW allocated cost column |
| **Design P&L Page** | `rec_from_mill` + `sales_bills` + `credit_note_items` | HIGH | Cost vs selling price per design — PENDING 6 business questions (see Section 11) |
| **Purchase Bills (Finished Fabric)** | `purchase_bills` (950 rows) | MEDIUM | Currently no dedicated page |

### 6.3 Pages that SHOULD BE REMOVED / Are Redundant 🗑️

| Page File | Reason to Remove |
|---|---|
| `JobWorkBillDashboard.jsx` | Old manual-entry dashboard — conflicts with Tally sync |
| `JobWorkBillForm.jsx` | Manual entry form — data comes from Tally, not manual |
| `PurchaseBillDashboard.jsx` | Old dashboard — superseded by GreyPurchasePage |
| `PurchaseBillForm.jsx` | Manual entry — conflicts |
| `SalesBillDashboard.jsx` | Old dashboard — superseded |
| `SalesBillForm.jsx` | Manual entry — conflicts |
| `CommissionBrokerageDashboard.jsx` | Now part of SalesBillsPage |
| `CommissionBrokerageForm.jsx` | Manual — conflicts |
| `QuotationDashboard.jsx`, `QuotationForm.jsx` | Check if used |
| `PendingOrdersDashboard.jsx`, `PendingOrderForm.jsx` | Check if used |

---

## 7. OUTSTANDING REPORT — DESIGN AND SQL

**Available data:**
- `sales_bills.tally_voucher_no` = bill identity (e.g. "SRTPL/1490/22-23")
- `sales_bills.total_amount` = invoice value
- `sales_bills.bill_date` = invoice date
- `sales_bills.customer_name` links to `customers.tally_ledger_name`
- `customers.city`, `customers.state`, `customers.area` = geographical dimensions
- `receipt_payment_lines.bill_ref` = matches `sales_bills.tally_voucher_no`
- `receipt_payment_lines.bill_amount` WHERE `voucher_type = 'Receipt'` = amount received

**Outstanding SQL:**
```sql
SELECT 
  sb.tally_voucher_no as bill_no,
  sb.bill_date,
  sb.customer_name,
  c.city, c.state, c.area,
  sb.broker_name,
  sb.total_amount as billed,
  COALESCE(SUM(rpl.bill_amount) FILTER (WHERE rpl.voucher_type='Receipt'), 0) as received,
  sb.total_amount - COALESCE(SUM(rpl.bill_amount) FILTER (WHERE rpl.voucher_type='Receipt'), 0) as outstanding,
  CURRENT_DATE - sb.bill_date as days_outstanding,
  CASE
    WHEN CURRENT_DATE - sb.bill_date > 90 THEN 'Overdue >90d'
    WHEN CURRENT_DATE - sb.bill_date > 60 THEN '61-90 days'
    WHEN CURRENT_DATE - sb.bill_date > 30 THEN '31-60 days'
    ELSE '0-30 days'
  END as ageing_bucket
FROM sales_bills sb
LEFT JOIN customers c ON c.tally_ledger_name = sb.customer_name
LEFT JOIN receipt_payment_lines rpl ON rpl.bill_ref = sb.tally_voucher_no
WHERE sb.total_amount > 0
GROUP BY sb.id, c.city, c.state, c.area
HAVING sb.total_amount - COALESCE(SUM(rpl.bill_amount) FILTER (WHERE rpl.voucher_type='Receipt'), 0) > 0
ORDER BY outstanding DESC;
```

**Dimensions for grouping:**
- By Party: `GROUP BY sb.customer_name`
- By City: `GROUP BY c.city`
- By State: `GROUP BY c.state`
- By Area: `GROUP BY c.area`
- By Broker: `GROUP BY sb.broker_name`
- By Ageing: `GROUP BY ageing_bucket`

---

## 8. RESYNC PLAN — WHAT TO FIX BEFORE RESYNCING

### DO NOT full-delete and resync. These things must be preserved:
- `rec_from_mill` computed columns: `grey_purchase_rate`, `cumulative_cost_per_mtr`, `jw_allocated_cost`, `jw_allocation_pct`
- `mill_godown_map` table (40 mappings)
- `missing_rec_from_mill` view

### Fix sequence before resync:

**Step 1 — Fix n8n v28 (Critical):**
```javascript
// In buildRecFromMillRow, line ~591:
// WRONG:
party_challan_no: v.reference || v.vnum

// CORRECT:
party_challan_no: v.partyChNo || v.reference || v.vnum
```

**Step 2 — Fix design extraction in sales bills:**
In `buildSalesBillRow`, the `design_no` should be extracted from the Destination batch allocation sub-screen (`INVENTORYENTRIESOUT` or `PRODSIDEBATCHALLOCATIONS`), not just the top-level batch. For multi-design bills with Primary Batch at top level, iterate line items.

**Step 3 — Run incremental sync (not full delete):**
The n8n sync is incremental by design (uses `lastSynced` date). Simply run the sync to catch up. n8n is 1,278 days behind as of last log.

**Step 4 — After sync completes:**
Re-run `compute_jw_allocation()` in Supabase to recalculate JW cost allocations with corrected `party_challan_no` values.

---

## 9. n8n WORKFLOW — SYNC STEPS

| Step | What It Syncs | Supabase Table | Conflict Key |
|---|---|---|---|
| S1 | Get last sync date + determine batch | tally_sync_log | — |
| S2 | Fetch Tally XML for date range | — | — |
| S3 | Sales Vouchers | `sales_bills` | `tally_voucher_no` |
| S4 | Purchase Vouchers (finished fabric) | `purchase_bills` | `tally_voucher_no` |
| S4b | Grey Purchase | `grey_purchase` | `tally_voucher_no` |
| S5 | Process Issues | `process_issues` | `challan_no` |
| S5b | Issue to Mill | `issue_to_mill` | `lot_no` |
| S5c | REC FROM MILL | `rec_from_mill` | `tally_voucher_no` |
| S5d | Stock Journal | `stock_journal` | `tally_voucher_no` |
| S_CN | Credit Notes (header + items) | `credit_note`, `credit_note_items` | `tally_voucher_no` |
| S_DN | Debit Notes | `debit_note` | `tally_voucher_no` |
| S_JW | Jobwork + Expenses | `jobwork_expenses` | `voucher_number` |
| S_AV | Accounting Vouchers | `accounting_vouchers` | `voucher_number` |
| S_AV_LINES | Receipt/Payment Lines | `receipt_payment_lines` | composite |

---

## 10. SUPPORTING TABLES

| Table | Purpose | Rows |
|---|---|---|
| `mill_godown_map` | Maps `job_godown` (short) → `party_name` (full) for JW allocation | 40 |
| `customers` | 1,162 customers with city, state, area, tally_ledger_name | 1,162 |
| `agents` | 213 agents/brokers | 213 |
| `suppliers` | 79 suppliers | 79 |
| `tally_sync_log` | Sync history | 966 |
| `process_issues` | Challan-level process tracking | 14,409 |
| `mill_challan_takas` | Taka-wise detail per Issue to Mill challan | 30 |

---

## 11. QUESTIONS FOR CLARIFICATION

Before building the Outstanding Report and Design P&L page, please confirm:

1. **Outstanding cutoff**: `receipt_payments` starts from Jul-2024. Bills before that period — should outstanding be shown as fully unpaid or excluded?
2. **Credit notes in outstanding**: Should `credit_note.party_amount` be subtracted from outstanding for the linked bill?
3. **Primary Batch bills**: 1,067 bills sold from Primary Batch (no design allocated in Tally). Should these show in Design P&L or be excluded?
4. **Multi-stage lots**: Some lots go through 2-3 mill processes (stage_no = 2, 3). Cost chain should accumulate across stages. Confirm logic.
5. **REC FROM MILL dedicated page**: Should it be read-only viewer, or should accountant be able to flag/mark entries from the web?
6. **Area definition**: `customers.area` — is this manually maintained or synced from Tally?

---

*Document maintained by Shrikumar Maru. Update after every major infrastructure change.*
*Infrastructure files: `I:\My Drive\Automation\Shreerang 2026\Horizon Code\`*
*n8n workflow: `CU6dMm7DCtSP6rMQ` | Supabase: `zdekydcscwhuusliwqaz`*

---

## 12. PARTY MASTERS -- MASTER TABLE FIELD MAPPING (Added 13-Apr-2026)

This section documents the complete Tally Ledger Master -> Supabase -> UI field mapping for all 4 master tables. These fields are populated by **n8n v35 S_LM step** (not yet built).

### 12.1 CUSTOMERS (`customers` table)

Source: Tally Ledger Master -> PARENT = "Sundry Debtors"

| Tally Field | Supabase Column | Type | Status |
|---|---|---|---|
| NAME | `tally_ledger_name` | text | EXISTS |
| MAILINGNAME | `name` | text | EXISTS |
| MAILINGADDR (multi-line) | `address` | text | EXISTS |
| STATENAME | `state` | text | EXISTS (partially populated from vouchers) |
| City/Area/Location | `city` | text | EXISTS (partially populated, sometimes WRONG) |
| City/Area/Location | `area` | text | EXISTS |
| PINCODE | `pincode` | text | EXISTS |
| COUNTRYNAME | `country` | text | EXISTS |
| LEDGERMOBILE | `phone` | text | EXISTS (blank -- needs S_LM) |
| LEDGEREMAIL | `email` | text | EXISTS (blank -- needs S_LM) |
| GSTIN/UIN | `gst_number` | text | EXISTS (blank -- needs S_LM) |
| PANIT No. | `pan_number` | text | **NEW -- added 13-Apr-2026** |
| CREDITPERIOD | `credit_days` | integer | EXISTS (0 -- needs S_LM) |
| OPENINGBALANCE | `opening_balance` | numeric | **NEW -- added 13-Apr-2026** |
| ISDEEMEDPOSITIVE (Dr/Cr) | `tally_opening_dr` / `tally_opening_cr` | numeric | **NEW** |
| PARENT | `tally_group` | text | **NEW** |
| DESPATCH THROUGH | `transporter_name` | text | **NEW** |
| ENABLE BROKER COMMISSION | `enable_broker` | boolean | **NEW** |
| DISTANCE | `distance` | numeric | **NEW** |
| -- | `tally_sync_at` | timestamptz | **NEW** -- last S_LM sync time |
| (from vouchers) | `agent_name` | text | EXISTS -- populated from sales_bills |

**IMPORTANT DATA QUALITY NOTES:**
- `city` may be WRONG for some customers (e.g. "16 Fire Creation Pvt Ltd" shows Ahmedabad but Tally has Kolkata). After S_LM runs, city will be overwritten with correct Tally value.
- `gst_number` is NULL for ~100% of customers -- populated only from GSTIN in Tally Ledger Master (S_LM), not from voucher PARTYGSTIN.
- `state` is partially populated from voucher STATENAME but often wrong -- S_LM will correct.

### 12.2 SUPPLIERS (`suppliers` table)

Source: Tally Ledger Master -> PARENT = "Sundry Creditors" OR contains "Grey"/"Mill"/"Fabric"

| Tally Field | Supabase Column | Type | Status |
|---|---|---|---|
| NAME | `tally_ledger_name` | text | EXISTS |
| MAILINGNAME | `supplier_name` | text | EXISTS |
| MAILINGADDR | `address` | text | EXISTS |
| STATENAME | `state` | text | EXISTS (blank -- needs S_LM) |
| City/Area/Location | `city` | text | EXISTS (blank) |
| PINCODE | `pincode` | text | EXISTS |
| LEDGERMOBILE | `phone` | text | EXISTS (blank) |
| LEDGEREMAIL | `email` | text | EXISTS (blank) |
| GSTIN/UIN | `gst_number` | text | EXISTS (partially populated) |
| PANIT No. | `pan_number` | text | **NEW -- added 13-Apr-2026** |
| CREDITPERIOD | `credit_days` | integer | EXISTS |
| OPENINGBALANCE | `opening_balance` | numeric | **NEW** |
| ISDEEMEDPOSITIVE | `tally_opening_dr` / `tally_opening_cr` | numeric | **NEW** |
| PARENT | `tally_group` | text | **NEW** |
| (derived from tally_group) | `supplier_type` | text | **NEW** -- "Grey Supplier" / "Mill" / "General" |
| -- | `tally_sync_at` | timestamptz | **NEW** |
| (manual) | `bank_name`, `bank_account_number`, `ifsc_code`, `account_holder_name` | text | EXISTS -- manual |
| (from vouchers) | `last_purchase_rate` | numeric | EXISTS |

supplier_type derivation (n8n v35): PARENT contains "Grey"/"Fabric"/"Weaver" -> "Grey Supplier" | "Mill"/"Process"/"Job" -> "Mill / Processor" | else -> "General Supplier"

### 12.3 AGENTS (`agents` table)

Source: Tally Ledger Master -> PARENT = "Broker" OR "Commission Agent" OR "Sales Agent"

| Tally Field | Supabase Column | Type | Status |
|---|---|---|---|
| NAME | `tally_ledger_name` | text | **NEW -- added 13-Apr-2026** |
| MAILINGNAME | `name` / `agent_name` | text | EXISTS |
| MAILINGADDR | `address` | text | EXISTS |
| STATENAME | `state` | text | EXISTS (blank) |
| City/Area/Location | `city` | text | EXISTS (partially populated) |
| PINCODE | `pincode` | text | EXISTS |
| LEDGERMOBILE | `phone` | text | EXISTS (blank) |
| LEDGEREMAIL | `email` | text | EXISTS (blank) |
| PANIT No. | `pan_number` | text | **NEW** |
| OPENINGBALANCE | `opening_balance` | numeric | **NEW** |
| PARENT | `tally_group` | text | **NEW** |
| -- | `tally_sync_at` | timestamptz | **NEW** |
| (from sales_bills) | `commission_percentage` | numeric | EXISTS -- avg comm rate from vouchers |

### 12.4 TRANSPORTERS (`transporters` table)

Source: Tally Ledger Master -> PARENT = "Transport Agency" OR "Courier"

BEFORE 13-Apr-2026: Only 5 columns (id, name, city, phone, created_at)
AFTER 13-Apr-2026: Full Tally master sync support

| Tally Field | Supabase Column | Type | Status |
|---|---|---|---|
| NAME | `tally_ledger_name` | text | **NEW** |
| MAILINGNAME | `name` | text | EXISTS |
| MAILINGADDR | `address` | text | **NEW** |
| STATENAME | `state` | text | **NEW** |
| City/Area/Location | `city` | text | EXISTS |
| PINCODE | `pincode` | text | **NEW** |
| LEDGERMOBILE | `phone` | text | EXISTS |
| LEDGEREMAIL | `email` | text | **NEW** |
| GSTIN/UIN | `gst_number` | text | **NEW** |
| PANIT No. | `pan_number` | text | **NEW** |
| OPENINGBALANCE | `opening_balance` | numeric | **NEW** |
| PARENT | `tally_group` | text | **NEW** |
| -- | `status` | text | **NEW** -- default 'active' |
| -- | `notes` | text | **NEW** |
| -- | `tally_sync_at` | timestamptz | **NEW** |

---

## 13. n8n v35 -- PLANNED LEDGER MASTER SYNC (S_LM Step)

**Status:** NOT YET BUILT -- build after Party Masters UI is complete
**Builds on:** n8n v34 (10-Apr-2026)

### 13.1 Tally XML Request for Ledger Masters

```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>List of Ledgers</ID>
  </HEADER>
  <BODY><DESC>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <SVCURRENTCOMPANY>ShreeRang Trendz Pvt. Ltd. - (from 1-Apr-2019)</SVCURRENTCOMPANY>
    </STATICVARIABLES>
    <TDL><TDLMESSAGE>
      <COLLECTION NAME="List of Ledgers" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <FETCH>NAME,MAILINGNAME,MAILINGADDR,STATENAME,PINCODE,LEDGERMOBILE,
        LEDGEREMAIL,GSTIN,GSTREGISTRATIONTYPE,PANIT,CREDITPERIOD,OPENINGBALANCE,
        PARENT,COUNTRYNAME,ISDEEMEDPOSITIVE</FETCH>
      </COLLECTION>
    </TDLMESSAGE></TDL>
  </DESC></BODY>
</ENVELOPE>
```

### 13.2 Field Routing Logic (n8n v35 JavaScript)

```javascript
function routeLedger(parent) {
  const p = parent.toUpperCase();
  if (p.includes('SUNDRY DEBTOR'))                                   return 'customers';
  if (p.includes('SUNDRY CREDITOR') || p.includes('GREY')
      || p.includes('MILL') || p.includes('FABRIC'))                return 'suppliers';
  if (p.includes('TRANSPORT') || p.includes('COURIER'))             return 'transporters';
  if (p.includes('BROKER') || p.includes('COMMISSION')
      || p.includes('AGENT'))                                        return 'agents';
  return null;
}
```

### 13.3 Opening Balance Parsing

```javascript
// Tally: "-12,17,20,542.99 Dr" or "12,17,20,542.99 Cr"
function parseOpeningBalance(raw) {
  if (!raw) return { tally_opening_dr:0, tally_opening_cr:0, opening_balance:0 };
  const num = parseFloat(raw.replace(/,/g,'').replace(/[DrCr\s]/gi,'').trim());
  const isDr = raw.toUpperCase().includes('DR');
  return {
    tally_opening_dr:  isDr ? Math.abs(num) : 0,
    tally_opening_cr: !isDr ? Math.abs(num) : 0,
    opening_balance:   isDr ? Math.abs(num) : -Math.abs(num)
  };
}
```

### 13.4 Upsert Strategy

- customers: ON CONFLICT (tally_ledger_name) -- update address, state, city, phone, gst_number, pan_number, credit_days, opening_balance, transporter_name, enable_broker, distance, tally_sync_at
- suppliers: ON CONFLICT (tally_ledger_name) -- same + supplier_type. NEVER overwrite: bank_name, bank_account_number, ifsc_code, account_holder_name
- agents:    ON CONFLICT (tally_ledger_name) -- standard fields
- transporters: ON CONFLICT (tally_ledger_name) -- full upsert

---

## 14. PARTY MASTERS PAGE -- DESIGN SPEC (13-Apr-2026)

**File:** `src/pages/admin/PartyMastersPage.jsx`
**Route:** `/admin/masters`
**Status:** Live but showing unicode escapes -- commit fab8828 on Claude's server NOT yet pushed to GitHub

### 14.1 Tab Structure
- Customers (1162): Search + city filter + profile panel on row click
- Agents (213): Search + profile panel
- Suppliers (79): Search + profile panel
- Transporters (225): Search + profile panel

### 14.2 Customer Profile Panel sections
1. Header: dark navy gradient -- name, type badge, status badge, Tally ledger name
2. 4 Stat Cards: Total Sales | Total Metres | Last Order Date | Designs Bought (live from sales_bills)
3. Contact & Location: City, State, Area, Pincode, Phone, Email, Billing Address, Delivery Address, Address
4. Business Info: GST Number, GST State decoded, Agent, Credit Days, Credit Limit, PAN Number, Transporter, Opening Balance, Tally Group
5. Recent Bills: last 6 bills table (bill_no, date, mtrs, amount, design, status)
6. AI Analysis button: calls Claude API -> 3-4 line business summary
7. Action Buttons: Full Ledger | Outstanding | All Bills

### 14.3 Data gaps until n8n v35 runs
- City/State: partially populated, may be wrong (S_LM will correct)
- GST, Phone, Email, Address, PAN, Opening Balance: blank (needs S_LM)

---

## 15. SESSIONS LOG

| Session | Date | Key Changes |
|---|---|---|
| Session 1 | Jan-Mar 2026 | Initial ERP build, n8n voucher sync, basic accounting pages |
| Session 2 | 09-Apr-2026 | Security fixes, DB constraints, OriginPanel, design_origin view |
| Session 3 | 10-Apr-2026 | n8n v34, DesignLifecyclePage, KEY 2 fix confirmed, resync started |
| Session 4 | 11-Apr-2026 | Vercel build fixed (smart quote unicode), App.jsx + Sidebar wired for Party Masters |
| Session 5 | 12-13-Apr-2026 | Party Masters page built, SQL migration v35 applied, full Tally gap analysis, n8n v35 plan documented, CRITICAL: Windows-MCP FileSystem corrupts unicode -- never use for JSX |

---

*Document maintained by Shrikumar Maru. Update after every major infrastructure change.*
*Infrastructure: VPS 72.61.249.86 | Supabase zdekydcscwhuusliwqaz | n8n CU6dMm7DCtSP6rMQ*
