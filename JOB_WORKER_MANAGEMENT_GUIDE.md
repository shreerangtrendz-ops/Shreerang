# Job Worker Management Guide

## PART 1: JOB WORKER OVERVIEW
**What is a Job Worker?**
A Job Worker is a contractor who performs a specific service or process on your materials. Examples include Dyers, Printers, Embroiderers, and Stitching Units. They do not sell the material; they charge for the *labor/process*.

## PART 2: ADD JOB WORKER
1.  Navigate to **People > Job Workers**.
2.  Click **Add New Job Worker**.
3.  Fill in the form:
    *   **Worker Name:** (Compulsory) Name of the unit or contractor.
    *   **Phone:** (Compulsory).
    *   **Specialization:** (Compulsory) Critical for system logic. Select from Printing, Dyeing, Embroidery, Stitching, etc.
    *   **Rate per Piece/Unit:** (Compulsory) Their standard charge (e.g., 5.00).
    *   **Rate Unit:** e.g., "Meter", "Piece", "Kg".
4.  Click **Save**.

## PART 3: EDIT JOB WORKER
1.  Navigate to **People > Job Workers**.
2.  Click the **Edit** icon.
3.  Update details (e.g., if their rate changes).
4.  Click **Save**.

## PART 4: DELETE JOB WORKER
1.  Navigate to **People > Job Workers**.
2.  Click the **Delete** icon.
3.  Confirm deletion.

## PART 5: FILTER & SEARCH
*   Use the Search bar to find workers by Name or Phone.
*   Job Workers are often looked up by their **Specialization** during the Costing process (e.g., finding all "Embroiderers").

## PART 7: EXPORT JOB WORKERS
1.  Navigate to **Import/Export > Export to Excel**.
2.  Select **Job Workers** from the export menu.
3.  Download the file for a complete list of rates and contact info.

## PART 8: IMPORT JOB WORKERS
1.  Navigate to **Import/Export > Import from Excel**.
2.  Use the Import Wizard.
3.  Select Category: **Job Worker Master**.
4.  Ensure your Excel file has columns for `Worker Name`, `Specialization`, and `Rate`.

## PART 9: JOB WORKER SPECIALIZATIONS
Correctly categorizing workers is vital for the **Costing Module**:
*   **Printing/Dyeing:** Used in Fabric Finishing cost sheets.
*   **Embroidery/Handwork/Beading:** Used in Value Addition cost sheets.
*   **Stitching/Finishing:** Used in Garment cost sheets.

## PART 10: BEST PRACTICES
*   **Rate Updates:** When a job worker updates their rates, update them here immediately. The Costing Engine uses these rates to calculate estimated product costs.
*   **Specialization Accuracy:** Ensure a "Stitching" unit isn't labeled as "Printing", or they won't appear in the correct dropdowns during production planning.