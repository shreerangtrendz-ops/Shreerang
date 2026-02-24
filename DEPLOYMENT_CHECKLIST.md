# ✅ DEPLOYMENT CHECKLIST

## Section 1: Pre-Deployment
- [ ] **Code Freeze**: All features merged and tested.
- [ ] **Linting**: `npm run lint` passes with 0 errors.
- [ ] **Environment**: `.env` file populated with production keys.
- [ ] **Database**: Migrations applied to production Supabase instance.
- [ ] **Backup**: Database snapshot taken.

## Section 2: Build Verification
- [ ] Run `npm run build`.
- [ ] Verify `dist/` folder exists.
- [ ] Check bundle size (ensure no large accidental imports).
- [ ] Verify `index.html` loads correctly locally (`npm run preview`).

## Section 3: Database Verification
- [ ] `whatsapp_conversations` table exists.
- [ ] `whatsapp_messages` table exists.
- [ ] `designs` table exists.
- [ ] RLS policies enabled for Authenticated users.
- [ ] Real-time replication enabled for `whatsapp_messages`.

## Section 4: Integration Verification
- [ ] **WhatsApp**: Send a test message from prod URL.
- [ ] **Bunny.net**: Upload a test image; verify CDN link.
- [ ] **Supabase**: Verify Auth login works.

## Section 5: Security Verification
- [ ] No `console.log` with sensitive data.
- [ ] API Keys not hardcoded in JS bundles.
- [ ] Routes protected by `<ProtectedRoute>`.
- [ ] File upload limits (size/type) active.

## Section 6: Post-Deployment
- [ ] Smoke Test: Create 1 Sales Order.
- [ ] Smoke Test: Upload 1 Design.
- [ ] Monitor Browser Console for 404s/500s.
- [ ] Check Supabase logs for RLS denials.

## Section 7: Sign-Off
*   **Deployed By**: ____________________
*   **Date**: ____________________
*   **Status**: [ ] Success  [ ] Rollback