# 🔧 Fabric Master Troubleshooting

## 1. Common Errors

### "SKU not unique"
*   **Symptom**: Form shows an error when trying to save.
*   **Cause**: A fabric with the exact same Base, Construction, Width, and Finish already exists.
*   **Solution**: Search for the existing fabric in the Master List. If it exists, update it instead of creating a new one.

### "Export Failed"
*   **Symptom**: Clicking "Export" does nothing or shows an error.
*   **Cause**: Browser popup blocker or extremely large dataset causing memory limit.
*   **Solution**: Try exporting a smaller selection (e.g., filter by Base first).

### "Dropdown option missing"
*   **Symptom**: You need a Base or Finish that isn't in the list.
*   **Cause**: The options are hardcoded in the application constants.
*   **Solution**: Contact the developer/admin to add the new option to `fabricMasterConstants.js`.

## 2. Performance Issues

### Slow List Page
*   **Symptom**: Page lags when scrolling or typing in search.
*   **Cause**: Rendering too many rows at once (e.g., >500 fabrics).
*   **Solution**: The system uses pagination/virtualization, but ensure you aren't showing "All" records if the dataset is massive. Use filters to reduce the view.

## 3. Database Issues

### Connection Timeout
*   **Symptom**: "Failed to load fabrics" toast message.
*   **Cause**: Weak internet connection or Supabase service interruption.
*   **Solution**: Check your network. Refresh the page. If persistent, check Supabase status.

## 4. UI/Display Issues

### Columns Misaligned
*   **Symptom**: Header doesn't match the data columns.
*   **Cause**: Horizontal scrolling on a small screen might desync momentarily.
*   **Solution**: Refresh the page. Ensure you are not zoomed in/out excessively (Ctrl+0).