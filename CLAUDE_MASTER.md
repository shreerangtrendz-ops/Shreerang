# SRTPL Horizon ERP — Master Reference
*Full technical history | Updated: 21-Apr-2026*

---

## ══ BUSINESS OVERVIEW ══

**Company:** ShreeRang Trendz Pvt. Ltd. (SRTPL)
**Location:** Surat, Gujarat, India
**Business:** Fabric converter — grey fabric purchase → multi-stage mill processing → finished fabric → domestic + international sales
**Accounting:** Tally Prime GOLD (source of truth)
**ERP:** Horizon (custom React/Supabase app built by Shrikumar)

### Process Flow
```
Grey Fabric (purchase) 
  → Issue to Mill (dyeing/printing/embroidery/schiffli/foil/digital/crush/pleating)
    → Jobwork Bill (mill charges)
      → REC from Mill (finished fabric received)
        → Sales Bills (to customers)
          → Receipt (payment collection)
```

### Sales Markets
- Domestic: Kerala, Maharashtra, Gujarat, Rajasthan, Delhi, West Bengal, Karnataka
- International: Dubai, Kuwait, Malaysia

### Design Code Pattern
SR-MP-YYYY-NNN (Tally cost centre for design-level P&L tracking)

---

## ══ COMPLETE INFRASTRUCTURE ══

### Office PC (Tally Server)
- Role: Runs Tally Prime GOLD, BizAnalyst, frpc tunnel
- On only during working hours
- Tally data: D:\Tally New Data\Tally data
- TDL file: D:\Tally New Data\Tdl\TextileSolutionGST (8).tcp
- Gold License Server: 192.168.1.15:9999 (LAN)
- frpc service: C:\FRP_Office\ (installed as Windows service "TallyFRP" on 21-Apr-2026)
- BizAnalyst: ODBC to Tally localhost:9005

### Laptop (Dev Machine — SHRIKUMAR)
- Role: All Horizon development, Claude Desktop, GitHub
- Code path: C:\Shreerang 2026\Horizon Code
- Tally client: connects to office via 192.168.1.15:9999
- Google Drive synced: H:\My Drive\Shreerang, I:\My Drive\Automation\Shreerang 2026

### VPS (Hostinger — 72.61.249.86)
- OS: Ubuntu 22.04
- Panel: hpanel.hostinger.com/vps/2060614/terminal (browser terminal, SSH port 22 blocked by cloud firewall)
- Docker Swarm + Easypanel + Traefik (owns ports 80/443)
- n8n: Docker container n8n-ened-Shreerang-1, port 32773→5678
- frps: /opt/frp/frps -c /opt/frp/frps.toml (systemd service since 02-Apr-2026)
- frps config: bindPort=7000, vhostHTTPPort=8080, webServer.port=8081 (admin/admin)
- nginx: /etc/nginx/sites-enabled/tally-n8n (all tally configs here)

### Network Note
Office ISP (Ishan Netsol) blocks outbound to VPS.
Use phone mobile hotspot (WiFi OFF) to access n8n/VPS from office PC.

---

## ══ COMPLETE PORT MAP ══

### Office PC
| Port | Service |
|------|---------|
| 9005 | Tally Prime HTTP + ODBC (shared) |
| 9999 | Tally Gold Gateway (Windows service) |
| 9509 | Tally Migration Tool |
| 9009 | Tally Migration Port |

### VPS
| Port | Service |
|------|---------|
| 7000 | frps bind port (frpc connects here) |
| 8080 | frps vhostHTTPPort |
| 8081 | frps web dashboard |
| 9005 | frpc TCP tunnel endpoint → office PC:9005 |
| 9001 | frpc TCP tunnel endpoint → office PC:9999 (Gold gateway) |
| 9080 | nginx → tally_backend (127.0.0.1:9005) |
| 32773 | n8n Docker container |
| 80/443 | Traefik (Easypanel managed) |

### n8n to Tally Connection
n8n container (172.19.0.2) → Docker bridge gateway (172.19.0.1) → nginx:9080 OR direct 9005 → frpc → office PC:9005 → Tally
Current: n8n hits http://172.19.0.1:9005 directly (FIXED4, bypasses nginx)

---

## ══ TALLY SYNC — COMPLETE HISTORY ══

### Workflow Version History
| Version | Date | Key Changes |
|---------|------|-------------|
| v24 | Mar-2026 | Added issue_to_mill, grey_purchase, credit/debit notes, jobwork |
| v25 | Mar-2026 | Bank fields, bill allocations, broker UDF fields |
| v26 | Apr-2026 | party_challan_no fix (v.partyChNo not v.reference) |
| v27 | Apr-2026 | Ledger master sync (S_LM) added |
| v34 | Apr-2026 | Current file in repo (contains v35 code) |
| v35 | Apr-2026 | S_LM step added, receipt_payment_lines per-bill rows |
| FIXED | Apr-2026 | Function declarations moved from try/else (strict mode fix) |
| FIXED2 | Apr-2026 | getAddress() literal newline fix (SyntaxError line 1376) |
| FIXED3 | Apr-2026 | routeLedger() transport group names expanded |
| FIXED4 | Apr-2026 | Check Tally Health + TALLY_URL changed 9080→9005 (ECONNABORTED fix) |

### Bug History
1. **SyntaxError line 1376** — literal newline inside split('') in getAddress() → Fixed in FIXED2
2. **Function declarations in try/else** — strict mode violation → Fixed in FIXED
3. **transporters=0** — routeLedger() didn't match "Transport Agency" etc → Fixed in FIXED3
4. **ECONNABORTED 8000ms** — n8n Docker can't reach 172.19.0.1:9080 (nginx) → Fixed in FIXED4 (use :9005)
5. **S_AV_LINES 500 error** — receipt_payment_lines.id had no DEFAULT → Fixed with gen_random_uuid()
6. **partial status (0 records)** — frpc disconnected from office PC 14-Apr, reconnected 21-Apr
7. **duplicate tally_backend upstream** — /etc/nginx/conf.d/tally-proxy.conf created by mistake → deleted

### Current Sync Status (21-Apr-2026)
- Running: ✅ All 13 steps success
- Last synced: 2022-12-15 (1,223 days behind)
- Rate: ~400 records/30 min batch
- ETA full catch-up: ~25 more working days
- frpc: Windows service "TallyFRP" on office PC (auto-start)

### S_LM Ledger Master Results
- Total ledgers in Tally: 8,694
- Routed: customers=5,635, suppliers=1,894, agents=517, transporters=0
- Transporters=0 because they're text fields in vouchers (not separate ledgers)
- Fix: tally_ledger_name = name set for all 225 transporters (21-Apr-2026)

---

## ══ DATABASE COMPLETE SCHEMA ══

### Core Tally Sync Tables
```
sales_bills          — V-05 Sales | 57 cols | bill_number (PK conflict)
purchase_bills       — V-01 Grey purchase bills | 59 cols
grey_purchase        — V-01 Grey purchase lots | 38 cols | tally_voucher_no+lot_no
issue_to_mill        — V-02 Fabric to mill | 29 cols | lot_no+voucher_date
jobwork_expenses     — V-03 JW bills | 34 cols | voucher_number
rec_from_mill        — V-04 Fabric from mill | 47 cols | tally_voucher_no+lot_no
stock_journal        — Stock transfers | 15 cols
credit_note          — 26 cols | tally_voucher_no
credit_note_items    — 11 cols
debit_note           — 23 cols | tally_voucher_no
accounting_vouchers  — Receipt/Payment/Journal/Contra | 33 cols | voucher_number+type
receipt_payment_lines — Per-bill payment detail | 29 cols | voucher_number+type+bill_ref (NULLS NOT DISTINCT)
mill_challan_takas   — Per-taka detail | 8 cols | lot_no+taka_sr_no
```

### Master Tables (from S_LM)
```
customers    — 58 cols | tally_ledger_name (conflict key)
suppliers    — 37 cols | tally_ledger_name
agents       — 24 cols | tally_ledger_name
transporters — 18 cols | tally_ledger_name (=name, since transporters have no Tally ledger)
```

### AI Accounting Tables (SmartFinancePage)
```
ocr_uploads          — Bill scanner results
gst_recon_sessions   — GSTR-2B reconciliation sessions
gst_recon_lines      — Per-line GSTR-2B match results
bank_recon_sessions  — Bank statement reconciliation
bank_recon_lines     — Per-line bank match results
tds_entries          — TDS 194C entries
tds_vendor_summary   — Vendor-wise TDS summary
```

### Costing Chain
```
grey_purchase_rate (grey_purchase.rate)
+ Math.abs(job_rate) (rec_from_mill.job_rate)
= cost_per_mtr (cumulative_cost_per_mtr in rec_from_mill)

Process loss absorbed into Tally average cost method.
jw_allocated_cost computed by compute_jw_allocation() SQL function.
```

### Key SQL Functions
```sql
compute_jw_allocation()    -- matches JW bills to REC FROM MILL, updates jw_voucher_number
update_rec_costing()       -- nightly pg_cron 20:30 UTC
update_jobwork_recon()     -- nightly pg_cron 20:30 UTC
```

### GST Columns (added 13-Apr-2026)
```
customers.gst_filing_status         -- regular/composition/non_filer/suspended/cancelled
customers.gst_registration_type     -- Regular/Composition/SEZ etc
customers.gst_status_checked_at     -- when GSTN API last checked
customers.gst_last_return_period    -- last GSTR-3B period (YYYY-MM)
(same columns on suppliers table)
```

---

## ══ COMPLETE MIGRATION LOG ══

| Date | Migration | What It Does |
|------|-----------|-------------|
| 28-Mar | fix_canonical_schema_28mar2026 | Schema cleanup |
| 28-Mar | fix_purchase_bills_not_null | NOT NULL fixes |
| 28-Mar | sync_item_name_from_fabric_name | Trigger for item_name |
| 29-Mar | add_all_tally_fields_29mar | New Tally fields |
| 30-Mar | fix_party_ch_no_xml_bleed | XML bleed fix in party_ch_no |
| 30-Mar | design_lifecycle_view | Design lifecycle SQL view |
| 30-Mar | fix_receipt_payments_id_sequence | ID sequence fix |
| 31-Mar | shreerang_team_permissions | RLS policies for staff roles |
| 02-Apr | add_credit_note_items_unique | Unique constraint on CN items |
| 02-Apr | clean_rec_from_mill_lot_no | Clean lot_no/design_no fields |
| 03-Apr | add_receipt_payment_lines_v2 | New per-bill RPL table |
| 03-Apr | create_accounting_views | Accounting SQL views |
| 03-Apr | backfill_receipt_payment_lines | Backfill from old data |
| 04-Apr | add_mill_challan_takas | Taka-level detail table |
| 04-Apr | fix_design_costing_v1 | Design costing view fix |
| 04-Apr | fix_rec_from_mill_* (multiple) | XML/constraint fixes |
| 04-Apr | fix_xml_blobs_grey_purchase | XML in grey purchase |
| 04-Apr | fix_html_entities_all_tables_v2 | Decode &#10; etc |
| 04-Apr | populate_customers_from_tally | Backfill customer data |
| 05-Apr | fix_all_corruption_final_v4 | Final data cleanup |
| 06-Apr | add_jw_allocation_columns | jw_allocated_cost, jw_allocation_pct |
| 06-Apr | missing_rec_from_mill_view | View for missing RECs |
| 09-Apr | add_authenticated_read_policies | RLS for sync tables |
| 10-Apr | rec_from_mill_issue_challan_ref | issue_challan_ref column |
| 11-Apr | create_ai_accounting_tables | 7 SmartFinancePage tables |
| 13-Apr | add_tally_master_fields_v35 | New columns for S_LM sync |
| 13-Apr | fix_receipt_payment_lines_upsert | UNIQUE NULLS NOT DISTINCT |
| 13-Apr | fix_customer_data_quality | HTML entity decode, city cleanup |
| 13-Apr | add_gst_filing_status_columns | GST compliance tracking |
| 21-Apr | fix_receipt_payment_lines_id_default | gen_random_uuid() default |
| 21-Apr | link_transporters_to_sales_bills | tally_ledger_name=name for 225 transporters |

---

## ══ FRONTEND PAGES COMPLETE LIST ══

### Accounting Pages
| Page | Route | Description |
|------|-------|-------------|
| TallyAccountingHub v35 | /admin/accounting/hub | 5-tab CA dashboard: Dashboard/Pipeline/GST/Mills/Customers |
| SalesBillsPage | /admin/accounting/sales-bills | FY tabs, 50-row pagination, design drill-down |
| PurchaseBillsPage | /admin/accounting/purchase-bills | Grey purchase bills |
| GreyPurchasePage | /admin/accounting/grey-purchase | Lot-level grey fabric with recon status |
| RecFromMillPage | /admin/accounting/rec-from-mill | Finished fabric with costing |
| MissingRecFromMillPage | /admin/accounting/missing-rec | Overdue mill lots alert |
| ProcessIssuesPage | /admin/accounting/process-issues | 4-tab: Issue/REC/Pending/Recon |
| JobWorkExpensesPage | /admin/accounting/job-work-bills | JW bills with recon |
| DesignCostingPage | /admin/accounting/design-costing | Per-design cost analysis |
| DesignPnLPage | /admin/accounting/design-pnl | Design-level P&L |
| SmartFinancePage | /admin/smart-finance | Bill OCR, GST Recon, Bank Recon, TDS (⚠️ build error) |

### CRM Pages
| Page | Route | Description |
|------|-------|-------------|
| PartyMastersPage | /admin/masters | Inline editing, completeness score, GST status |
| CustomersPage | /admin/customers | Customer list |
| SmartOutstandingPage | /admin/smart-outstanding | Outstanding receivables |

### Admin Infrastructure
| Component | Description |
|-----------|-------------|
| AdminLayout | Mobile hamburger topbar (<1024px) |
| AdminSidebar | Collapsible, search, role-based, Smart Finance in Accounting section |
| accounting.css | Shared design system: rows 15px, KPI 26px, title 22px |

---

## ══ ACCOUNTINGHUB v35 — 5 TABS ══

### Tab 1: Dashboard
- 8 KPI cards: Sales, Grey+JW Cost, Gross Profit, Net GST, Received, Credit Notes, Customers, Interstate%
- Monthly sales bar chart (FY filter)
- JW allocation health (matched/unmatched/hasGrey bars)
- Cost structure CA view (5 columns with % of sales)

### Tab 2: Pipeline
- V-01→V-05 pipeline cards with record counts, last date, health dots
- Supporting vouchers grid (credit notes, debit notes, financial vouchers etc)

### Tab 3: GST Analysis
- GSTR-1 summary (output IGST, CGST, SGST with taxable values)
- ITC/output breakdown
- State-wise sales table with GST filing status badge (pending GSTN API)
- HSN note (5%/12%/18% analysis pending)

### Tab 4: Mill Performance
- Per-mill: REC count, issued mtrs, finished mtrs, shortage%, JW cost, efficiency bar
- TDS 194C note (threshold ₹30K per transaction / ₹1L annual)
- Shortage >10% red flag

### Tab 5: Top Customers
- Top 10 by FY sales value with medals
- Revenue concentration analysis (top 1/3/10 customer risk)
- GST filing status per customer (pending GSTN API)

---

## ══ SMARTFINANCEPAGE — 4 MODULES ══

### Module 1: Bill Scanner (Claude Vision OCR)
- Upload photo of vendor bill
- Claude extracts: party name, GSTIN, bill no, date, amounts, tax
- Saves to ocr_uploads table

### Module 2: GST Recon (GSTR-2B)
- Upload GSTR-2B JSON from GST portal
- Matches against purchase_bills in Supabase
- Shows matched/unmatched/missing with ITC risk flags
- Saves to gst_recon_sessions + gst_recon_lines

### Module 3: Bank Recon
- Paste bank statement (CSV or text)
- Matches against accounting_vouchers/receipt_payment_lines
- Saves to bank_recon_sessions + bank_recon_lines

### Module 4: TDS Tracker (Section 194C)
- Lists all jobwork_expenses vendors
- Applies 194C threshold (₹30K single / ₹1L annual)
- Shows TDS @1% (individual) / 2% (company)
- CSV export for TDS return filing

---

## ══ WHATSAPP BOT ══
- Phone ID: 868455029689394
- Multilingual: English/Hindi/Gujarati greeting detection
- 5 AI agent layers, state-machine sales flow
- WhatsApp Business API via Meta

---

## ══ BUNNY CDN ══
- Zone: shreerang-s
- Design images: https://shreerang.b-cdn.net/designs/{design_no}.jpg
- DesignGalleryPage: pending (next major feature)

---

## ══ KNOWN ISSUES & SOLUTIONS ══

| Issue | Cause | Solution |
|-------|-------|----------|
| ECONNABORTED 8000ms | n8n Docker can't reach nginx:9080 | Use :9005 direct (FIXED4) |
| S_AV_LINES 500 | receipt_payment_lines.id no DEFAULT | gen_random_uuid() added |
| Tally offline warning | frpc not running | TallyFRP Windows service installed |
| Git push from Claude | Claude server can't auth to GitHub | Manual git push from laptop |
| Unicode corruption | Windows-MCP writes JSX | Use bash_tool only for JSX |
| Monday nginx port | 9006 was backup, 9005 primary | nginx handles auto-failover, no manual fix needed |
| ISP blocks VPS | Ishan Netsol blocks outbound | Use mobile hotspot for VPS access |
| WARP DNS broken after disconnect | WARP leaves 127.0.2.2 DNS | Set-DnsClientServerAddress 8.8.8.8 + ipconfig /flushdns |

---

## ══ OFFICE PC SETUP CHECKLIST ══

For new office PC or after reinstall:
1. Install Tally Prime GOLD
2. Copy D:\Tally New Data\tally.ini (verify ServerPort=9005, Client Server=Both)
3. Copy C:\FRP_Office\ folder with frpc.exe + frpc.toml
4. Install TallyFRP service: `sc create "TallyFRP" binPath= "\"C:\FRP_Office\frpc.exe\" -c \"C:\FRP_Office\frpc.toml\"" start= auto`
5. Start service: `sc start TallyFRP`
6. Install BizAnalyst, set sync schedule to 1PM + 5:30PM

---

## ══ AI ACCOUNT MANAGEMENT ══

- Pro account (Shrikumar): Architecture, major features, this session
- Free Claude accounts: per-module development
- Gemini: large-context code review
- ChatGPT: research
- Strategy file: SRTPL_AI_Command_Center_v2.xlsx (Google Drive)

---

## ══ SECURITY NOTE ══

Supabase service role key was committed in debug files (check_sync.mjs, check_sync2.cjs).
Key rotation from Supabase dashboard is a REQUIRED action.
Current key (in n8n workflow code): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (rotate ASAP)
