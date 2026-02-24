# 🚀 DEPLOYMENT GUIDE

## Section 1: Pre-Deployment Checklist
- [ ] All critical errors fixed.
- [ ] All new features (WhatsApp, Designs) tested.
- [ ] Environment variables prepared.
- [ ] Database migrations (tables + RLS) applied.
- [ ] Code reviewed for sensitive data leaks.
- [ ] No console errors in DevTools.
- [ ] No critical console warnings.
- [ ] Performance tested (images load via CDN).
- [ ] Security reviewed (RLS policies active).
- [ ] Database backup created.

## Section 2: Environment Setup
Ensure these are set in your hosting provider (Vercel/Netlify/Hostinger):
*   `VITE_SUPABASE_URL`
*   `VITE_SUPABASE_ANON_KEY`
*   `VITE_WHATSAPP_ACCESS_TOKEN`
*   `VITE_BUNNY_NET_API_KEY`
*   `VITE_BUNNY_NET_CDN_URL`

## Section 3: Database Migration
1.  Open Supabase SQL Editor.
2.  Run the creation scripts for `whatsapp_conversations`, `whatsapp_messages`, `designs`, etc.
3.  Verify tables exist in Table Editor.
4.  Enable RLS on all new tables.
5.  Create Indexes for `phone_number` and `created_at`.

## Section 4: Build Process