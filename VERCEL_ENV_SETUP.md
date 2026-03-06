# Vercel Environment Variables Setup
## Shreerang Trendz — Required Env Variables

Go to: **Vercel Dashboard → shreerangtrendz → Settings → Environment Variables**

---

## 🔐 Security Variables

| Variable | Value | Environments |
|----------|-------|-------------|
| `VITE_BACKUP_PIN` | Your 6-digit PIN (e.g. a NEW secure PIN, not 925937) | Production, Preview |

> **⚠️ Action Required:** Set `VITE_BACKUP_PIN` to a new secure PIN immediately.  
> The old PIN `925937` was in source code and should be considered compromised.

---

## 🔗 Supabase Variables

| Variable | Value | Environments |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://zdekydcscwhuusliwqaz.supabase.co` | All |
| `VITE_SUPABASE_ANON_KEY` | (your anon key from Supabase dashboard) | All |

---

## 📱 WhatsApp / n8n Variables

| Variable | Value | Environments |
|----------|-------|-------------|
| `VITE_N8N_WEBHOOK_URL` | `https://yvone-unincreased-wilford.ngrok-free.app` | Production |
| `VITE_WHATSAPP_PHONE_ID` | (from Meta Business → WhatsApp → Phone Number ID) | Production |

---

## 🖼️ Bunny CDN

| Variable | Value | Environments |
|----------|-------|-------------|
| `VITE_BUNNY_CDN_BASE` | `https://shreerangtrendz.b-cdn.net` | All |

---

## 📋 How to Set in Vercel

1. Go to [https://vercel.com/shreerangtrendz-ops](https://vercel.com/shreerangtrendz-ops)
2. Select your project → **Settings** → **Environment Variables**
3. Add each variable above
4. Click **Save** then **Redeploy** from the Deployments tab

---

*Last updated: 2026-03-06*
