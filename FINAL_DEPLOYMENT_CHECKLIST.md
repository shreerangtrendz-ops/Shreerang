# Final Deployment Checklist: Fabric Master Bulk Import

## 1. Pre-Deployment
- [ ] **Package Check**: Ensure `xlsx` and `lucide-react` are in `package.json`.
- [ ] **Build Check**: Run `npm run build` locally to ensure no compilation errors.
- [ ] **Lint Check**: Run linter to catch unused variables or syntax issues.
- [ ] **Environment**: Ensure Supabase environment variables are correctly set in production.

## 2. Deployment
- [ ] **Deploy Code**: Push changes to the main branch/deployment pipeline.
- [ ] **Verify Assets**: Check that `Fabric_Import_Template.xlsx` generation works (it's generated in-browser, so code deployment is sufficient).

## 3. Post-Deployment Verification
- [ ] **Access**: Log in as Admin and navigate to Fabric Master.
- [ ] **UI Check**: Verify "Import" and "Delete Selected" buttons appear.
- [ ] **Template**: Download the template and open it to ensure it's not corrupt.
- [ ] **Test Import**: Upload a small test file (3 rows). Verify success.
- [ ] **Test Delete**: Delete the 3 test rows. Verify success.

## 4. Rollback Procedures
Since this is a client-side feature with new API endpoints (via Supabase client), rollback is code-based.
- [ ] **Revert Commit**: If critical bugs are found, revert the git commit.
- [ ] **Database Cleanup**: If bad data was imported, use the **Bulk Delete** feature or run a SQL script to clean up based on `created_at` timestamp.

## 5. Monitoring
- [ ] **Error Rates**: Monitor support channels for reports of "Upload Failed".
- [ ] **Performance**: Check if the "Fabric Master" page load time increases (unlikely, as pagination is used).

## 6. Support Handover
- [ ] **Guides**: Distribute `FABRIC_MASTER_BULK_IMPORT_GUIDE.md` to the Operations team.
- [ ] **Training**: Schedule a 15-minute demo with the Data Entry team.