# Bulk Import Troubleshooting Guide

## 🔴 Critical Validation Errors

### "Required field is missing"
*   **Problem**: A mandatory column (like Fabric Name or Width) is empty in your Excel file.
*   **Solution**: Open Excel. Ensure every row has data in the required columns.
*   **Tip**: Check for hidden rows or "ghost" data at the bottom of your sheet.

### "Invalid Width / Base / Finish"
*   **Problem**: The value in the cell doesn't match the system's Allowed List exactly.
*   **Example**: You typed `58 inch` but the system expects `58"`. You typed `Polyster` but system expects `Polyester`.
*   **Solution**: Use the dropdowns provided in the downloaded template, or copy-paste from the Reference Guide.

### "Base Fabric SKU not found"
*   **Problem**: You are trying to create a Finish Fabric, but the Parent SKU you entered doesn't exist.
*   **Solution**:
    1.  Go to **Fabric Master List**.
    2.  Search for the base fabric.
    3.  Copy its SKU exactly.
    4.  Paste into your import file.
    5.  **Important**: You must import Base Fabrics BEFORE Finish Fabrics.

### "Duplicate SKU"
*   **Problem**: The item you are trying to import would create a SKU that is identical to one already in the database.
*   **Solution**:
    *   If it's a duplicate, you don't need to import it again. Remove the row.
    *   If it's different, change the attributes (e.g., different Finish) to generate a unique SKU.

## 🟡 Warnings

### "Auto-Generated Short Code"
*   **Meaning**: You left the Short Code column blank. The AI/Logic generated one for you (e.g., "COTT").
*   **Action**: Safe to ignore. Proceed with import.

## ⚙️ Technical Issues

### Import Stuck at 0%
*   **Cause**: Network interruption or server timeout.
*   **Fix**: Refresh the page. Try splitting your file into smaller batches (e.g., 200 rows instead of 2000).

### "File format not supported"
*   **Cause**: Uploading `.numbers` or `.txt` files.
*   **Fix**: Save your file as `.xlsx` (Excel Workbook) or `.csv` (Comma Delimited).

### Browser Crash / Slow Performance
*   **Cause**: File has too many rows (>5000) or too many columns.
*   **Fix**: The system is optimized for ~1000 rows. Split your data into multiple files.

## 📞 Getting Support
If these steps don't solve your issue:
1.  **Download the Error Report** (CSV) from the validation screen.
2.  Take a **screenshot** of the error message.
3.  Email IT Support with the CSV and screenshot attached.