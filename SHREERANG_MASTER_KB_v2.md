# SHREERANG TRENDZ — MASTER KNOWLEDGE BASE v2.0
Last Updated: 2026-03-09 | Session: VPS Cleanup + Health Check

---

## SECTION 1 — PROJECT IDENTITY

| Item | Value |
|------|-------|
| Company | Shreerang Trendz Pvt. Ltd. — Textile converter, Surat, Gujarat |
| Owner | Shrikumar (kumarmaru7@gmail.com) |
| GitHub | https://github.com/shreerangtrendz-ops/Shreerang (master → auto-deploy) |
| Live Site | https://www.shreerangtrendz.com |
| Admin Dashboard | https://www.shreerangtrendz.com/admin/dashboard |
| Supabase ID | zdekydcscwhuusliwqaz |
| KVM VPS | 72.61.249.86 (Ubuntu 22.04, root) / Hostinger KVM1, server ID: 1246379 |
| Tally FRP URL | https://tally.shreerangtrendz.com |
| n8n | https://n8n.shreerangtrendz.com (PM2, port 5678) — admin / shreerang_auto |
| Bunny CDN | https://shreerang.b-cdn.net (zone: shreerang-s) |
| FRP Auth Token | ShreerangFRP2026 |
| Vercel Project | shreerang under shrikumar-marus-projects |

Tech Stack: React 18 + Vite 5 (JSX) / Vercel / Supabase PostgreSQL / Bunny.net CDN / Tally Prime GOLD (port 9000) / FRP 0.58.0 / Nginx + Certbot / n8n via PM2 / WhatsApp Business API / GitHub CI/CD

---

## SECTION 2 — VPS INFRASTRUCTURE (Updated 2026-03-09)

### Server Details
| Item | Value |
|------|-------|
| Hostinger VPS ID | 1246379 (srv1246379.hstgr.cloud) |
| OS | Ubuntu 22.04 LTS (KVM) |
| Plan | KVM 1 — 1 vCPU, 4 GB RAM, 50 GB disk |
| SSH | ssh root@72.61.249.86 (password: Shreerang2014.) |
| SSH Port | 22 — firewall rule added 2026-03-09 (allow from anywhere) |

### Active Services
| Service | Status | Port | Purpose |
|---------|--------|------|---------|
| nginx | active | 80, 443 | Reverse proxy for all subdomains |
| frps | active | 7000 (bind), 19000 (vhost) | Tally FRP tunnel server |
| n8n (PM2 id=0) | online | 5678, 5679 | n8n automation |
| backup-api (PM2 id=1) | online | 3500 | /opt/shreerang/api/server.js |
| sshd | active | 22 | Remote access |

### VPS Cleanup — 2026-03-09 (REMOVED)
| Removed | Disk Saved |
|---------|-----------|
| Docker CE + containerd + all images (19 dead containers) | ~1.6 GB |
| Easypanel + Docker Swarm + Traefik | cleared |
| Wine (winehq-stable) | ~500 MB |
| avahi-daemon | cleared |
| snapd + LXD | ~300 MB |
| /opt/frp_0.58.0_linux_amd64 (duplicate) | ~33 MB |
| /opt/frp_0.58.1_linux_amd64 (duplicate) | ~33 MB |
Disk before: 22 GB used → Disk after: 10 GB used (FREED 12 GB)

### /opt/ Directory (Current Clean State)
/opt/frp/           — Active FRP binary v0.58.0 (frps + frpc + configs)
/opt/shreerang/     — backup-api Node.js app (api/server.js)

### FRP Configuration
File: /opt/frp/frps.toml
  bindPort = 7000
  vhostHTTPPort = 19000
  [auth]
  method = "token"
  token = "ShreerangFRP2026"

Systemd: ExecStart=/opt/frp/frps -c /opt/frp/frps.toml

Windows frpc.toml (both Tally PCs use same token):
  serverAddr = "72.61.249.86"
  serverPort = 7000
  [auth] method = "token" token = "ShreerangFRP2026"
  [[proxies]] name = "tally" type = "http" localPort = 9000
  customDomains = ["tally.shreerangtrendz.com"]

Two Tally PCs:
  Main PC: 116.74.139.17, frpc v0.58.1, proxy = tally
  Test PC: 202.179.159.129, frpc v0.58.0, proxy = tally-test
NOTE: "proxy already exists" warning in frps logs is NORMAL when both PCs run simultaneously.

### Nginx Active Vhosts
n8n.shreerangtrendz.com         → 127.0.0.1:5678
tally.shreerangtrendz.com       → 127.0.0.1:19000 (FRP)
tally-test.shreerangtrendz.com  → 127.0.0.1:19000 (FRP)
backup.shreerangtrendz.com      → 127.0.0.1:3500

### Hostinger Firewall Rules (2026-03-09)
- TCP 7000 (FRP) — always open
- TCP 22 (SSH) — added 2026-03-09, allow from anywhere

### Daily Health Check Command
ssh root@72.61.249.86 "systemctl is-active nginx frps pm2-root && pm2 list && df -h /"

Full check (on VPS):
echo "====== SERVICES ======" && systemctl is-active nginx frps pm2-root ssh && echo "" && echo "====== PM2 ======" && pm2 list && echo "" && echo "====== PORTS ======" && ss -tlnp | grep -E 'nginx|node|frps|sshd' && echo "" && echo "====== FRP ======" && systemctl status frps --no-pager | grep -E 'Active|login|proxy' | head -5 && echo "" && echo "====== DISK & RAM ======" && df -h / && free -h | grep Mem

Expected healthy output:
- All 4 services: active
- PM2: n8n online (~262 MB), backup-api online (~55 MB), 0 restarts
- Ports: 80, 443, 22, 5678, 3500, 7000, 19000
- Disk: ~10 GB / 49 GB (21%)
- RAM: ~530 MB / 3.8 GB

---

## SECTION 3 — DATABASE SCHEMA (Supabase public)

Key Tables:
tally_companies, tally_sync_log, tally_sync_errors, tally_sync_state
purchase_bills, sales_bills, challans, manufacturing_entries
job_workers, suppliers, customers, products
base_fabrics, finish_fabrics, sales_orders (+ order_channel, payment_method, payment_status, tally_voucher_id)
order_items, fabric_stock_live, design_batch_master
cash_bank_ledger, payment_followups, cart_sessions, supplier_prices
finish_fabric_designs, backup_activity_log

Pending Migration (⚠️ NOT YET EXECUTED in Supabase SQL Editor):
- Add order_channel/tally_voucher_id to order views
- Add payment_method/payment_status to sales_orders
Project: zdekydcscwhuusliwqaz

Key Views: outstanding_receivable, landed_cost_calculator, vendor_shrinkage_summary

---

## SECTION 4 — TALLY INTEGRATION

Path: Tally (port 9000) → frpc.exe → VPS:7000 → Nginx → tally.shreerangtrendz.com → Supabase edge fn tally-proxy
Delta Sync v4: reads tally_sync_state → 7-day chunks → upserts → updates tally_sync_log
Active blocker: Tally sync returns 0 records if Import Dialog open in Tally — close it.

---

## SECTION 5 — N8N WORKFLOWS

1. Daily Tally Sync v3 — Schedule 3x daily (00:30, 08:30, 13:30 IST)
2. WhatsApp Commerce Bot — Webhook /whatsapp-webhook
3. Smart Customer Recognition — Webhook /whatsapp-incoming
4. Google Drive → Bunny CDN Sync — Drive trigger 1min poll
5. Supplier Rate Card OCR — Webhook /rate-card-incoming

n8n access: https://n8n.shreerangtrendz.com | admin / shreerang_auto
PM2: id=0, /usr/bin/n8n, node v20.20.0

---

## SECTION 6 — FABRIC COSTING ENGINE

9 Process Paths. Golden Equation:
True Cost/mtr = (Grey Rate + Freight/Qty) / (1 - Shrinkage%) + Job Charge/mtr
Engine: src/services/FabricCostEngine.js — ShreerangEngine.computeCost(sku)
Price floor: margin < 12% → disable Save Quote (red warning)

---

## SECTION 7 — WHATSAPP & CRM

Phone Number ID: 868455029689394
Business Account ID: 107916048109322
Webhook: https://n8n.shreerangtrendz.com/webhook/whatsapp-incoming
Verify Token: ShreerangWA2026

---

## SECTION 8 — DESIGN SYSTEM

CSS vars: --sidebar-bg: #0B2E2B (NEVER CHANGE), --gold: #D4920A, --teal: #2BA898, --magenta: #C9106E
Navigation: ONLY via nav('screen-id', el). Screen IDs: screen-{kebab-case}
Components: .btn .badge .kpi-card .card .tbl .tabs .modal-overlay

---

## SECTION 9 — MODULE STATUS

Dashboard            → LIVE
Job-Work Flow        → LIVE
Tally Sync           → LIVE
Backup Control       → LIVE
Cost Engine          → IN PROGRESS
Vendor Performance   → IN PROGRESS
Customer Portal      → IN PROGRESS
Ecommerce Catalogue  → PLANNED
BizAnalyst (13 screens) → PLANNED
Tally Push (2-way)   → PLANNED (api/tally-push.js not created)
Razorpay             → PLANNED

---

## SECTION 10 — NEXT PRIORITIES

1. Execute pending Supabase migration SQL
2. WhatsApp sync failure notifications
3. Two-way Tally sync — create api/tally-push.js
4. Bunny CDN image upload for FinishFabric
5. BizAnalyst replacement (13 screens)
6. Razorpay payment integration

---

## SECTION 11 — QUICK REFERENCE COMMANDS

ssh root@72.61.249.86                                    # SSH into VPS
git add . && git commit -m "msg" && git push origin master  # deploy

pm2 list                    # see all processes
pm2 restart n8n             # restart n8n
pm2 restart backup-api      # restart backup API
pm2 logs n8n --lines 50     # view n8n logs

systemctl restart frps       # restart FRP server
systemctl status frps        # check FRP + connected Tally PCs
cat /opt/frp/frps.toml      # view FRP config

systemctl restart nginx
nginx -t
ls /etc/nginx/sites-enabled/

df -h / && free -h

---

## SECTION 12 — GOOGLE DRIVE FOLDERS

Root: 1QOAHKxQBXZgkpL0GTpNx6YUd7qTAYADh
Horizon Code (MAIN CODEBASE): 1qV0c6Nii7TWvVRCXr1ZnyBDpVyRxefq4
Knowledge Base: 1VPV-M8anegTdZddPaVWlNoC6zDXRZGGR
Credentials: 11vg-7x6DB4SnsLmhLtgn0-0GFUAGv1pH

---

## APPENDIX — SESSION LOG

| Date | Key Actions |
|------|-------------|
| 2026-03-04 | Master Blueprint v8.0, 17 DB tables, 20-session roadmap |
| 2026-03-03 | Security: removed .env from 60 git commits, repo private |
| 2026-03-07/08 | Session 15+: added order_channel/tally_voucher_id/payment fields, commit 30e09bb0 |
| 2026-03-09 | VPS cleanup: removed Docker/Easypanel/Wine/snapd/LXD/duplicate FRP. Freed 12 GB. Fixed frps auth token. SSH port 22 opened. Both Tally PCs reconnected. |

---

## APPENDIX — CREDENTIALS MAP

FRP token: ShreerangFRP2026 (frps.toml on VPS + frpc.toml on Windows PCs)
VPS root password: Shreerang2014.
n8n login: admin / shreerang_auto
All other keys: Vercel env vars + Credentials folder in Drive
