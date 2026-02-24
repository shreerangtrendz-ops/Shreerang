# Bulk Import Troubleshooting Guide

## Common Issues & Solutions

### 1. File Upload Fails
*   **Symptom**: "File too large" or file not selected.
*   **Cause**: File exceeds 5MB or invalid extension.
*   **Fix**: Check file size (Right click > Properties). Ensure it is `.xlsx` or `.csv`.

### 2. "Invalid Width" Error
*   **Symptom**: Row marked red in preview with Width error.
*   **Cause**: You entered a width like "59" or "60" that isn't in the allowed list.
*   **Fix**: Change to standard widths: 58, 60 (if allowed), 44, etc. Check the template instructions sheet.

### 3. "Duplicate SKU" Error
*   **Symptom**: Row marked red. Error: "SKU already exists".
*   **Cause**: You are trying to import a fabric that is identical (Name + Width + Finish) to one already in the system.
*   **Fix**: 
    1. Check if you actually need to import it (maybe it's already there).
    2. If it's different, change the **Fabric Name** or manually enter a unique **Short Code**.

### 4. Progress Bar Stuck
*   **Symptom**: Import hangs at 50% or 90%.
*   **Cause**: Network interruption or server timeout.
*   **Fix**: 
    1. Wait 1 minute.
    2. If still stuck, refresh the page.
    3. Check the list to see what was imported.
    4. Re-import the remaining items (the system will block duplicates, so it's safe).

### 5. Short Codes Not Generating
*   **Symptom**: "Short Code" column is empty in preview.
*   **Cause**: Fabric Name doesn't contain recognizable patterns (e.g., numbers).
*   **Fix**: The system will fall back to a random code if needed, or you can manually fill the "Short Code" column in your Excel file.

---

## Recovery Procedures

### Partial Import Recovery
If an import fails halfway (e.g., 50 of 100 items imported):
1.  **Don't Panic**: The 50 items are safely saved.
2.  **Identify**: Check the fabric list (sort by "Created At") to see what made it in.
3.  **Retry**: You can upload the **same file** again.
    - The first 50 will now show as "Duplicate SKU" errors (Red).
    - The remaining 50 will show as Valid (Green).
    - Click **"Import Valid Rows"** to finish the job.

### Data Cleanup
If you accidentally imported wrong data:
1.  Use the **Bulk Delete** feature.
2.  Select the incorrect items.
3.  Delete them immediately.

---

## Diagnostic Information
When contacting support, please provide:
1.  The **Excel/CSV file** you tried to upload.
2.  A screenshot of the **Error Log** in the import modal.
3.  Your **Browser** and Version (e.g., Chrome 120).