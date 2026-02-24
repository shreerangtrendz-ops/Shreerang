# Excel Import Guide

## Overview
The Bulk Import tool allows you to upload inventory data quickly using standard Excel (.xlsx) or CSV files. The 5-step wizard ensures data integrity before adding records to the database.

## Preparation
1. **Download Template**: Go to the Import page and download the `.xlsx` template.
2. **Fill Data**:
   - **Required Fields**: Name is mandatory.
   - **Unique Names**: Ensure fabric names are unique.
   - **Formatting**: Keep "GSM" and "Weight" as numbers.

## Steps to Import
1. **Upload**: Select your file.
2. **Auto-Detect**: The system scans columns and suggests mappings.
   - *Green*: High confidence match.
   - *Yellow*: Low confidence (check manually).
3. **Mapping**: If columns are not detected, select the target field from the dropdown. Select "Ignore" to skip columns.
4. **Validate**: The system checks for errors (e.g., missing names, text in number fields).
   - **Fix Errors**: You must fix errors in your Excel file and re-upload if critical issues are found.
5. **Import**: Click "Start Import" to process valid records.

## Troubleshooting
- **"File not readable"**: Ensure it is a valid .xlsx file, not an older .xls.
- **"Zero records found"**: Check if the first row contains headers.
- **"Validation Failed"**: Download the error log (if available) or check the on-screen error table.