# 🛠️ FABRIC MASTER MAINTENANCE GUIDE

This guide provides procedures for the regular maintenance of the Fabric Master module, covering database, performance, user support, and troubleshooting aspects to ensure its long-term stability and efficiency.

---

## 1. Regular Maintenance

### Daily/Weekly Tasks
*   **Review Fabric Master List**: Quickly browse the Fabric Master List (`/admin/fabric-master`) for any obvious data anomalies or errors.
*   **Check for Duplicate SKUs**: Although frontend validation prevents duplicates, a manual spot-check or a simple SQL query (e.g., `SELECT sku, COUNT(*) FROM base_fabrics GROUP BY sku HAVING COUNT(*) > 1;`) can confirm database integrity.
*   **Monitor System Activity Logs**: (If implemented) Review logs for unusual create/update/delete operations on `base_fabrics`.

### Monthly Tasks
*   **Review `base_fabrics` Table**: Ensure all fields are being utilized correctly. Identify any fabrics that have become obsolete.
*   **Archive Old Fabrics**: For fabrics no longer in use (e.g., `status='inactive'` for over 2 years), consider archiving them to a separate table or soft-deleting them if not linked to historical orders.
*   **Update Dropdown Options**: If new `Base` materials, `Construction` types, or `Finishes` are introduced in the market, update `src/lib/fabricMasterConstants.js` and redeploy.

---

## 2. Database Maintenance

*   **Index Optimization**:
    *   **Procedure**: Periodically review index usage in Supabase. If certain queries become slow, consider adding new indexes based on common filter criteria.
    *   **Verification**: Check `FABRIC_MASTER_DATABASE_SCHEMA.md` for current indexes.
*   **Cleanup**: Remove any temporary or test data from the `base_fabrics` table in non-production environments.
*   **Backups**: Ensure automated daily/weekly backups of your Supabase database are configured and verified. Test recovery from these backups periodically.

---

## 3. Performance Monitoring

*   **Key Metrics to Track**:
    *   **Page Load Time**: For `/admin/fabric-master` (should be <3 seconds).
    *   **API Response Time**: For `FabricService` calls (should be <500ms).
    *   **Database Query Time**: For queries against `base_fabrics` in Supabase (should be <100ms).
    *   **Client-side Errors**: Monitor for any JavaScript errors in the browser console.
*   **Alerts**: Set up alerts for any deviations from these metrics (e.g., a sudden increase in page load time).
*   **Bottleneck Identification**: Use browser developer tools (Network, Performance tabs) to identify frontend bottlenecks. Use Supabase dashboard for backend query analysis.

---

## 4. Log Review

*   **Error Logs**: Review application error logs (e.g., from `ErrorLogger`) for repeated errors related to Fabric Master operations.
*   **Audit Logs**: (If implemented) Review backend audit logs for `base_fabrics` modifications, especially for bulk operations or sensitive changes.

---

## 5. User Support (Common Issues & Solutions)

*   **Issue**: "SKU already exists" error when creating a fabric.
    *   **Solution**: Advise user to search for the existing fabric and edit it instead. The SKU generation logic implies a unique fabric.
*   **Issue**: Fabrics missing from the list.
    *   **Solution**: Advise user to check and clear filters. Verify if the fabric was created under a different "Base" category.
*   **Issue**: Exported Excel file is empty or corrupted.
    *   **Solution**: Check browser downloads for errors. Try exporting a smaller subset. Ensure no browser extensions are interfering.
*   **Issue**: Cannot delete a fabric.
    *   **Solution**: Explain that fabrics used in `finish_fabrics` or `sales_orders` cannot be deleted due to data integrity. Advise to first remove dependencies.

---

## 6. Troubleshooting Approach

When an issue arises:

1.  **Replicate**: Try to reproduce the issue on a test environment.
2.  **Isolate**: Narrow down the problem to a specific component, function, or data field.
3.  **Check Logs**: Examine browser console, application logs, and Supabase logs for error messages.
4.  **Verify Data**: Check the `base_fabrics` table directly in Supabase for data integrity.
5.  **Consult Documentation**: Refer to `FABRIC_MASTER_TROUBLESHOOTING.md` and `FABRIC_MASTER_API_REFERENCE.md`.