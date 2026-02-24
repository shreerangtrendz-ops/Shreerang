# Bulk Bill Import Guide

## How it Works
The Bulk Bill Import tool uses AI simulation to read data from your uploaded bills (PDF/Image) and map them to your inventory records.

## Step-by-Step

1.  **Upload**: Go to `Fabric Master > Bulk Bill Import`. Select the bill type (Purchase or Job Work).
2.  **AI Analysis**: The system extracts Vendor Name, Date, Amount, and Line Items.
3.  **Mapping**: 
    *   The system tries to auto-match the description to a fabric in your database.
    *   If no match is found, use the dropdown to search and select the correct item.
4.  **Confirmation**: Once mapped, click "Confirm".
    *   The bill is saved to history.
    *   The cost of the selected fabric is updated (optional).
    *   The expense is logged in the Cost Dashboard.

## Troubleshooting
*   **Low Confidence**: If AI isn't sure, manually verify the fields.
*   **No Match**: Ensure the fabric exists in the master before importing the bill.