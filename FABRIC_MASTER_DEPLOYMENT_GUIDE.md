# 🚀 FABRIC MASTER DEPLOYMENT GUIDE

This guide details the steps to deploy and verify the Fabric Master module in a production environment.

---

## 1. Pre-Deployment Checklist

Before deploying, ensure the following are completed:

*   **[ ] Database Migrations**: All necessary `base_fabrics` table columns and indexes have been applied to the production database.
    *   **Verification**: Check `FABRIC_MASTER_DATABASE_SCHEMA.md` for the latest schema.
    *   **Command**: `npm run migrate` (if using a migration tool) or manually run SQL from `FABRIC_MASTER_DATABASE_SCHEMA.md`.
*   **[ ] Environment Variables**:
    *   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly set in the production environment.
    *   Other integration variables (if any) are configured.
*   **[ ] Dependencies**: All `npm` dependencies are installed and up-to-date locally.
    *   **Command**: `npm install`
*   **[ ] Code Review**: All Fabric Master related code has been reviewed and approved.
*   **[ ] No Console Errors/Warnings**: No errors or significant warnings in the browser console during local testing.
*   **[ ] Functionality Tested**: All features (CRUD, filtering, bulk actions, export) verified in a staging environment.
*   **[ ] Backup**: A full backup of the production database has been performed.

---

## 2. Deployment Steps

Follow your standard application deployment procedure. Typically, this involves:

1.  **Build the application**: