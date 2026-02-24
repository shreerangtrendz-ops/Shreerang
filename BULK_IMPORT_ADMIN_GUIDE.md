# Bulk Import Admin Guide

## Admin Responsibilities
1.  **Template Management**: Ensure the downloadable Excel templates (in `src/lib/excelTemplateConstants.js`) match the current database schema.
2.  **Data Cleanup**: Periodically check `Import History` for failed logs and clean up old records if necessary.
3.  **Support**: Assist users who encounter "Database Errors" or "SKU Conflicts".

## Monitoring
*   Go to **Import History** page.
*   Filter by "Failed" to see problematic imports.
*   Check `import_errors` table in Supabase for raw error logs if UI details are insufficient.

## Performance Optimization
*   **Indexes**: Ensure `sku`, `base_fabric_name`, and `finish_fabric_sku` columns are indexed in the database.
*   **Batch Size**: If timeouts occur, advise users to split files into 500-row chunks.

## Database Backup
*   Before any massive import (>5000 items), trigger a manual database backup in the Supabase dashboard.
*   **Rollback**: If a bad import occurs (e.g., wrong prices), use SQL to delete records created by a specific `import_id`.

## Auditing
*   Every import record is linked to `created_by` (User ID).
*   Use this to track who is introducing data quality issues.