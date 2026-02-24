# 🛡️ Fabric Master Administrator Guide

## 1. System Configuration
The Fabric Master module relies on the `base_fabrics` table in Supabase.
*   **RLS Policies**: Row Level Security is enabled. Only authenticated users with `admin`, `manager`, or `office_team` roles can Create/Update/Delete. Read access is broader.
*   **Indexes**: Performance indexes exist on `sku`, `base`, and `created_at` to ensure fast filtering even with thousands of records.

## 2. Data Integrity
*   **Referential Integrity**: Deleting a fabric is blocked if it is referenced in `finish_fabrics` or `sales_order_items`. This prevents "orphan" records in orders.
*   **Unique Constraints**: While the database allows duplicate SKUs (soft constraint), the frontend enforces uniqueness to prevent user confusion.

## 3. Bulk Operations Management
*   **Export Limits**: The Excel export runs entirely client-side. For datasets >10,000 records, consider implementing server-side pagination or CSV streaming.
*   **Import Validation**: (Future Feature) When importing via Excel, ensure the template matches the exact column headers defined in the `FabricService` export method.

## 4. Maintenance
*   **Orphan Cleanup**: Periodically check for fabrics with `status='inactive'` that haven't been used in 2+ years and archive them.
*   **Dropdown Updates**: If new Fabric Bases or Constructions are needed, update `src/lib/fabricMasterConstants.js` and redeploy the frontend.

## 5. Troubleshooting
*   **Slow List Loading**: If the list page takes >2 seconds, verify that `FabricMasterGroupedView` isn't re-rendering unnecessarily. Check console for "Excessive re-render" warnings.
*   **Sync Issues**: If a user creates a fabric but others don't see it, ensure they refresh the page. Real-time subscriptions for this table are **disabled** by default to save resources.