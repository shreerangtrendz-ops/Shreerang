# Vercel Environment Variables Setup
## Shreerang Trendz — Required Env Variables (Bot v3)

Go to: **Vercel Dashboard → shreerangtrendz → Settings → Environment Variables**

---

## 🔐 WhatsApp Bot Variables (REQUIRED)

| Variable | Value | Where to find |
|----------|-------|---------------|
| `WHATSAPP_TOKEN` | `EAAKigiKCL4gB...` | Meta Business → WhatsApp → Access Token |
| `WHATSAPP_PHONE_NUMBER_ID` | `868455029689394` | Meta Business → WhatsApp → Phone Numbers |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | `shreerang_secure_verify_2026` | Set this value in Meta webhook too |

---

## 🤖 AI API Keys (REQUIRED for v3)

| Variable | Value | Notes |
|----------|-------|-------|
| `GEMINI_API_KEY` | `AIzaSyA86vpx6KothltoItlZa-oL3CVvgjnFvmw` | Fast replies — already set |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Get from console.anthropic.com — for Claude Haiku |

---

## 🗄️ Supabase Variables (REQUIRED)

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://zdekydcscwhuusliwqaz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API → service_role |
| `VITE_SUPABASE_URL` | `https://zdekydcscwhuusliwqaz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | From Supabase → Settings → API → anon public |

---

## 🔗 Frontend Variables

| Variable | Value |
|----------|-------|
| `VITE_BACKUP_PIN` | Your secure 6-digit PIN |
| `VITE_BUNNY_CDN_BASE` | `https://shreerangtrendz.b-cdn.net` |
| `VITE_N8N_WEBHOOK_URL` | `https://n8n.shreerangtrendz.com` |

---

## 📋 How to Set in Vercel

1. Go to https://vercel.com/shrikumar-marus-projects
2. Select your project → **Settings** → **Environment Variables**
3. Add each variable above (Production + Preview)
4. Click **Save** then **Redeploy**

---

## 🗃️ Database Migration (ONE TIME)

Run this SQL in **Supabase SQL Editor**:
https://supabase.com/dashboard/project/zdekydcscwhuusliwqaz/sql/new

Copy-paste from: `database_migration_v3.sql` in GitHub repo

---

*Updated: 2026-03-17 (Bot v3 — fuzzy match, admin approval, follow-up engine)*
