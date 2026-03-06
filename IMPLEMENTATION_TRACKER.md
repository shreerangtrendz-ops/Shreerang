# 🏭 Shreerang Trendz — Implementation Tracker
*Last updated: 06 Mar 2026 | Project: ERP Dashboard (shreerangtrendz.com/admin)*

---

## ✅ COMPLETED

### 🖥️ Dashboard & Navigation
| # | Feature | Commit | Status |
|---|---------|--------|--------|
| 1 | **Sidebar redesigned** — 11 sections → 5 groups (Overview, Catalogue, Accounts, Operations, Settings) | [665fc3b](https://github.com/shreerangtrendz-ops/Shreerang/commit/665fc3bc) | ✅ Live |
| 2 | **Sidebar search bar** — press `/` to instantly filter all nav items | [665fc3b](https://github.com/shreerangtrendz-ops/Shreerang/commit/665fc3bc) | ✅ Live |
| 3 | **Sidebar collapse** — `‹ ›` button shrinks to 60px icon-only mode | [665fc3b](https://github.com/shreerangtrendz-ops/Shreerang/commit/665fc3bc) | ✅ Live |
| 4 | **Dynamic sidebar width** — AdminLayout syncs collapse state with smooth CSS transition | [de36532](https://github.com/shreerangtrendz-ops/Shreerang/commit/de36532) | ✅ Live |
| 5 | **Integration status lights** — Tally, n8n, WhatsApp live indicators at sidebar bottom | [665fc3b](https://github.com/shreerangtrendz-ops/Shreerang/commit/665fc3bc) | ✅ Live |
| 6 | **Badge system** — NEW (gold), LIVE (green), AI (purple), ON (green) per nav item | [665fc3b](https://github.com/shreerangtrendz-ops/Shreerang/commit/665fc3bc) | ✅ Live |

### 📊 Dashboard KPI Cards
| # | Feature | Commit | Status |
|---|---------|--------|--------|
| 7 | **Real Sales This Month** — from `sales_bills` table (₹XL format) | [1168d55](https://github.com/shreerangtrendz-ops/Shreerang/commit/1168d557) | ✅ Live |
| 8 | **Real Purchase This Month** — from `purchase_bills` table | [1168d55](https://github.com/shreerangtrendz-ops/Shreerang/commit/1168d557) | ✅ Live |
| 9 | **Outstanding Receivable** — calculated from pending orders (red if > 0) | [1168d55](https://github.com/shreerangtrendz-ops/Shreerang/commit/1168d557) | ✅ Live |
| 10 | **Outstanding Payable** — from purchase_fabric unpaid records | [1168d55](https://github.com/shreerangtrendz-ops/Shreerang/commit/1168d557) | ✅ Live |
| 11 | **Tally Sync Status** — live ✅/❌ + last sync time | [1168d55](https://github.com/shreerangtrendz-ops/Shreerang/commit/1168d557) | ✅ Live |
| 12 | **Sync Bills Now button** — in Dashboard Tally KPI card, calls `/api/tally-sync` | [today] | ✅ Committed |

### ⚡ Tally Integration
| # | Feature | Commit | Status |
|---|---------|--------|--------|
| 13 | **`tally-health` edge function** — deployed to Supabase, checks FRP+Tally status | pre-existing | ✅ Live |
| 14 | **`api/tally-proxy.js`** — Vercel serverless, proxies XML to tally.shreerangtrendz.com | pre-existing | ✅ Live |
| 15 | **`api/tally-sync.js`** — NEW: pulls purchase+sales vouchers, parses XML, upserts into Supabase | [cfea6e3](https://github.com/shreerangtrendz-ops/Shreerang/commit/cfea6e3) | ✅ Committed |
| 16 | **n8n workflow v2** — syncs 3× daily (6AM, 2PM, 9:30PM IST) | [cfea6e3](https://github.com/shreerangtrendz-ops/Shreerang/commit/cfea6e3) | ✅ Committed (needs import) |
| 17 | **TallySyncDashboard** — `💰 Sync Bills Now` button in header + Bills Accounting section with Purchase/Sales cards | [today] | ✅ Committed |
| 18 | **`purchase_bills` table** — exists in Supabase, will populate when Tally is online | schema pre-existing | ✅ Ready |
| 19 | **`sales_bills` table** — exists in Supabase, will populate when Tally is online | schema pre-existing | ✅ Ready |
| 20 | **`tally_sync_log` table** — logs every sync with type, status, record count | pre-existing | ✅ Active |

---

## 🔴 PENDING — One Manual Step by You

### Step 1: Start FRP Tunnel on Tally PC (CRITICAL — needed for any sync to work)
**Do this on your Windows PC where Tally Prime is installed:**
1. Open **Tally Prime** → load company `ShreeRang Trendz Pvt. Ltd.`
2. Go to: Gateway → Configure → Advanced Configuration
3. Enable: **HTTP Server** = Yes, Port = **9000**
4. Open Command Prompt in the folder where `frpc.exe` is saved (Drive folder `17HHDAaoChjq_sqWaxgMT8OC2b5y96PHZ`)
5. Run: `frpc.exe -c frpc.ini`
6. You should see: `start proxy success`
7. **Test**: Go to [tally-sync-dashboard](https://shreerangtrendz.com/admin/tally-sync) → should show **🟢 Tally Live**

### Step 2: Import n8n Workflow v2 (for automated 3× daily sync)
1. Download `n8n-daily-tally-sync-workflow-v2.json` from the GitHub repo root
2. Open [n8n cloud](https://shreerangtrendz.app.n8n.cloud)
3. Click **Import workflow** → upload the JSON
4. Add credential for Supabase header auth (key: `apikey`, value: your anon key)
5. Activate the workflow
6. Sync will run automatically at 6AM, 2PM, 9:30PM IST

### Step 3: Verify bills sync
After FRP is running:
1. Go to `/admin/tally-sync` → click **💰 Sync Bills Now**
2. Check `purchase_bills` and `sales_bills` tables in Supabase for data
3. Dashboard KPIs should show real ₹ figures

---

## 🟡 NEXT UP (Recommended Order)

### Phase 2 — Product Images & Customer Fields
| # | Task | Tables | Effort |
|---|------|--------|--------|
| A | Connect Bunny CDN to `fabric_master.image_url` | fabric_master | Medium |
| B | Add customer-visible fields: composition, width, GSM, MOQ | fabric_master | Small |
| C | Map `designs.image_url` to fabric_master by SKU | designs, fabric_master | Medium |
| D | Update `FabricMasterForm.jsx` with image upload to Bunny CDN | FabricMasterForm | Medium |

### Phase 3 — AI Automation
| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| E | **AI Bill Scanner** | Upload PDF/image → extract bill data → push to Tally | High |
| F | **Smart Cost Engine** | AI suggests selling price based on cost + market | High |
| G | **WhatsApp Order Bot** | Customer message → order created → Tally entry | High |
| H | **Design Velocity AI** | Predict reorder needs from sales patterns | High |

---

## 🏗️ Architecture Reference

```
Tally Prime PC (port 9000)
    ↕ FRP tunnel (frpc.exe → tally.shreerangtrendz.com)
Vercel API Routes:
    /api/tally-proxy  → forward XML to Tally (raw)
    /api/tally-sync   → fetch vouchers → parse → upsert Supabase ← NEW
Supabase Edge Functions:
    tally-health      → health check (deployed ✅)
    tally-proxy       → Supabase-side proxy (code in repo)
Supabase DB:
    purchase_bills    → Tally purchase vouchers
    sales_bills       → Tally sales vouchers  
    tally_sync_log    → every sync logged
    outstanding_receivable → party balances
n8n Cloud:
    Workflow v2       → 3× daily: health check → /api/tally-sync
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/components/admin/AdminSidebar.jsx` | New 5-group sidebar with search + collapse |
| `src/components/admin/AdminLayout.jsx` | Dynamic sidebar width management |
| `src/pages/admin/AdminDashboard.jsx` | Real KPIs + Sync Bills Now button |
| `src/pages/admin/integrations/TallySyncDashboard.jsx` | Full sync control centre + Bills cards |
| `src/services/DashboardService.js` | Accounting KPI queries (sales, purchase, outstanding) |
| `src/services/TallySyncService.js` | Tally XML API integration service |
| `api/tally-proxy.js` | Vercel: forwards XML to Tally FRP tunnel |
| `api/tally-sync.js` | Vercel: full sync — vouchers → Supabase tables |
| `supabase/functions/tally-health/index.ts` | Edge fn: Tally health check |
| `n8n-daily-tally-sync-workflow-v2.json` | n8n: 3× daily automated sync |

---

*Generated by Claude — Shreerang Trendz ERP Project — 06 Mar 2026*
