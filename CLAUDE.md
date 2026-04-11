# SRTPL Horizon — Active Context
*Slim file (~2,000 tokens). Full history in CLAUDE_MASTER.md. Read that for deep context.*
*Last updated: 11-Apr-2026*

## Infrastructure
- **Code:** C:\Shreerang 2026\Horizon Code
- **Supabase:** zdekydcscwhuusliwqaz | https://zdekydcscwhuusliwqaz.supabase.co
- **n8n:** workflow CU6dMm7DCtSP6rMQ at n8n.shreerangtrendz.com (use mobile hotspot — office network blocks VPS)
- **GitHub:** shreerangtrendz-ops/Shreerang | branch: master
- **Vercel:** auto-deploy from master
- **VPS:** 72.61.249.86 | FRP auth: ShreerangFRP2026 | Tally port: 9005
- **Accounts:** shreerangtrendz@gmail.com (primary) + kumarmaru7@gmail.com (secondary) — both Pro, same project, same context

## Voucher Chain V-01→V-05
grey_purchase → issue_to_mill → jobwork_expenses → rec_from_mill → sales_bills

## 4 Join Keys
- **KEY 1:** grey_purchase.lot_no = issue_to_mill.lot_no = rec_from_mill.grey_lot_no
- **KEY 2:** issue_to_mill.tally_voucher_no = lot_no (same value)
- **KEY 3:** rec_from_mill.jw_voucher_number → JOIN jobwork_expenses ON voucher_number (resolved by compute_jw_allocation). party_challan_no = mill's own bill no. issue_challan_ref = our issue challan (Tally "Reference No")
- **KEY 4:** rec_from_mill.design_no = sales_bills.design_no = credit_note_items.design_no

## Tally REC From Mill Fields → Supabase
- "No." → tally_voucher_no | "Reference No" → issue_challan_ref | "Party Ch. No" → party_challan_no | "Lot No" → grey_lot_no

## Coding Rules (never break)
- NEVER commit via GitHub Desktop — Git CLI only
- ALWAYS Math.abs() on ALL cost display fields
- Gold standard page: SalesBillsPage.jsx (teal theme, FY tabs, SummaryCard, 50-row pagination)
- Supabase import: correct relative path always

## Sync Status (11-Apr-2026)
- Synced to: Jan 2025 | Days behind: ~440 | Auto-sync: every 30 min
- sales_bills: ~3,280 | issue_to_mill: ~1,800 | rec_from_mill: 3,421 | rpl: ~11,800
- All sync errors fixed (S3 sales, S5b issue_to_mill, S_AV_LINES, S_CN_items)

## Pages Live
AccountingHub ✅ | RecFromMillPage ✅ | MissingRecFromMillPage ✅
SalesBillsPage ✅ | PurchaseBillsPage ✅ | GreyPurchasePage ✅
ProcessIssuesPage ✅ | DesignLifecyclePage ✅ | DesignCostingPage ✅

## Pending Tasks (priority order)
1. **Font size** — all accounting pages (15px rows, 26px cards, 22px titles)
2. **Mobile hamburger** — AdminLayout.jsx sidebar overlay on <768px
3. **DesignGalleryPage** — BunnyNet CDN https://shreerang.b-cdn.net/designs/{design_no}.jpg
4. **compute_jw_allocation()** — run after sync reaches Apr 2026
5. **n8n v34 multi-lot fix** — grey_purchase flatMap, see src/n8n/N8N_CODE_v34_patch.md
6. **n8n MCP** — fix endpoint URL in claude_desktop_config.json (see MCP Setup below)

## MCP Setup (both accounts)
claude_desktop_config.json at C:\Users\SHRIKUMAR\AppData\Roaming\Claude\
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem",
               "C:\\Shreerang 2026\\Horizon Code",
               "H:\\My Drive\\Shreerang"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest",
               "--supabase-url", "https://zdekydcscwhuusliwqaz.supabase.co",
               "--supabase-key", "SERVICE_ROLE_KEY_HERE"]
    }
  }
}
```
n8n MCP: disabled until correct endpoint URL confirmed from n8n workflow editor.
To fix: open n8n → MCP workflow → copy trigger URL → add to config as shreerang-n8n server.

## Two-File System
- CLAUDE.md = this slim file (~2,000 tokens, loads every session automatically)
- CLAUDE_MASTER.md = full history (~10,000 tokens, read only when deep context needed)
- Update CLAUDE.md pending section after each session
- Append session summary to CLAUDE_MASTER.md after major work

## Token Efficiency Rules
- One task per chat session — never mix topics
- Never upload n8n JSON unless asked
- Never paste full sync logs — failing line only
- Batch SQL queries into one call
- Run /compact in Claude Code when context warned
- Read CLAUDE_MASTER.md only when deep history needed
