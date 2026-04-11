# SRTPL Horizon — Active Context
*Slim file. Full history in CLAUDE_MASTER.md. Read that for deep context.*

## Infrastructure
- Supabase: zdekydcscwhuusliwqaz | URL: https://zdekydcscwhuusliwqaz.supabase.co
- n8n workflow: CU6dMm7DCtSP6rMQ at n8n.shreerangtrendz.com
- GitHub: shreerangtrendz-ops/Shreerang | branch: master
- Local code: C:\ShreerangDev (was I:\My Drive\Automation\Shreerang 2026\Horizon Code)
- Vercel: auto-deploy from master branch
- VPS: 72.61.249.86 | FRP auth: ShreerangFRP2026 | Tally port: 9005

## Voucher Chain (V-01 → V-05)
grey_purchase → issue_to_mill → jobwork_expenses → rec_from_mill → sales_bills

## 4 Join Keys
- KEY 1: grey_purchase.lot_no = issue_to_mill.lot_no = rec_from_mill.grey_lot_no
- KEY 2: issue_to_mill.tally_voucher_no = lot_no (same value)
- KEY 3: rec_from_mill.party_challan_no = mill's own bill no → matches SPLIT_PART(jw.supplier_invoice_no,'/',1). Link resolved by compute_jw_allocation() → stored in rfm.jw_voucher_number. JOIN: jobwork_expenses jw ON jw.voucher_number = rfm.jw_voucher_number
- KEY 4: rec_from_mill.design_no = sales_bills.design_no = credit_note_items.design_no

## Tally REC Screen Fields → Supabase
- "No." → tally_voucher_no
- "Reference No" → issue_challan_ref (our issue challan)
- "Party Ch. No" → party_challan_no (mill's own bill number)
- "Lot No" → grey_lot_no

## Coding Rules (never break these)
- NEVER commit via GitHub Desktop — Git CLI only
- ALWAYS Math.abs() on ALL cost display fields
- ALWAYS use correct relative Supabase import path
- Gold standard page: SalesBillsPage.jsx (teal theme, FY tabs, SummaryCard, 50-row pagination)

## Current Sync Status
- Last synced: Jan 2025 | Days behind: ~440 | Auto-sync: every 30 min
- All 4 sync errors fixed (see CLAUDE_MASTER.md for details)
- issue_to_mill: ~1,800 rows | sales_bills: ~3,280 | rec_from_mill: 3,421

## Pages Live (key ones)
- AccountingHub: /admin/accounting/hub ✅
- RecFromMillPage: /admin/accounting/rec-from-mill ✅
- MissingRecFromMillPage: /admin/accounting/missing-rec ✅
- SalesBillsPage, PurchaseBillsPage, GreyPurchasePage, ProcessIssuesPage ✅
- DesignLifecyclePage: /admin/accounting/design-lifecycle/:designNo ✅

## Pending (next tasks)
1. Font size increase across all accounting pages (15px rows, 26px cards)
2. Mobile hamburger menu in AdminLayout.jsx
3. DesignGalleryPage with BunnyNet CDN images
4. Run compute_jw_allocation() after sync catches up to Apr 2026
5. n8n v34: grey_purchase multi-lot flatMap fix (patch in src/n8n/N8N_CODE_v34_patch.md)

## Token Efficiency Rules
- One task per chat session
- Never upload n8n JSON unless asked
- Never paste full sync logs — only the failing line
- Batch SQL queries into one call
- Run /compact when context warned
- Read CLAUDE_MASTER.md only when deep history needed
