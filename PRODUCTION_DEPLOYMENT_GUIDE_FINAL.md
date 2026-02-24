# Production Deployment Guide (Final)

## Phase 1: Pre-Deployment Checklist
- [ ] **Data Validation**: Ensure all existing fabric records have been updated with HSN codes (run a script or manual check).
- [ ] **Master Setup**: Populate the `HSN Code Master` with the standard list of codes (5208, 9988, etc.) before users start data entry.
- [ ] **User Roles**: Verify that only Admins and Accountants have access to the HSN Master to prevent accidental tax rate changes.
- [ ] **Backup**: Export current database schema and data as a JSON/CSV backup via Supabase dashboard.

## Phase 2: Deployment Steps
1.  **Code Deployment**: Push the latest React build to the hosting provider (e.g., Vercel/Netlify).
2.  **Database Migration**:
    *   Ensure the SQL scripts for new tables (`process_hsn_codes`, etc.) have run successfully.
    *   Verify columns (`hsn_code`, `gst_rate`) exist in fabric tables.
3.  **Environment Variables**:
    *   Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in the production environment.
    *   Verify `RESEND_API_KEY` for email notifications.

## Phase 3: Post-Deployment Verification
1.  **Smoke Test**:
    *   Login as Admin.
    *   Navigate to `HSN Master`. Create a test code.
    *   Navigate to `Fabric Master`. Create a Base Fabric and verify the HSN dropdown works.
    *   Create a Finish Fabric and verify it inherits the HSN.
2.  **Integration Check**:
    *   Test Excel Import with the new HSN columns.
    *   Test Google Drive sync.
3.  **Performance**:
    *   Check load times on the Fabric Dashboard.
    *   Verify "Loading..." states appear correctly during data fetches.

## Phase 4: User Handover
1.  **Training**: Share the `QUICK_START_GUIDE_HSN.md` with the data entry team.
2.  **Support**: Monitor the system logs for the first 48 hours for any `500` errors.