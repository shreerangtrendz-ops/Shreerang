# Quick Start Guide: HSN & Fabric Management

## Step 1: Setup HSN Master (One-Time Setup)
*Role: Admin/Accountant*
1.  Go to **HSN Master** in the sidebar.
2.  **Add Base Fabric HSNs**: e.g., 5208 (Cotton), 5407 (Synthetic).
3.  **Add Process HSNs**: e.g., 9988 (Job Work), 5209 (Bleaching/Dyeing).
4.  **Add Value Addition HSNs**: e.g., 5810 (Embroidery).

## Step 2: Create a Base Fabric
*Role: Store Manager*
1.  Go to **Fabric Master > Base**.
2.  Click **Add New**.
3.  Select **Name** (e.g., "60x60 Cotton").
4.  **Important**: Select the **HSN Code** (5208). This will set the tax rule for all derived fabrics.
5.  Save.

## Step 3: Create a Finish Fabric
*Role: Store Manager*
1.  Go to **Fabric Master > Finish**.
2.  Click **Add New**.
3.  Select the **Base Fabric** you just created.
    *   *Notice*: The "Fabric HSN" auto-fills (5208).
4.  Select the **Process** (e.g., "Digital Print").
    *   *Notice*: The "Process HSN" auto-fills (9988) for the job work bill.
5.  Save.

## Step 4: Create a Fancy Finish Fabric
*Role: Store Manager*
1.  Go to **Fabric Master > Fancy**.
2.  Click **Add New**.
3.  Select the **Finish Fabric**.
4.  Select **Value Addition** (e.g., "Embroidery").
    *   *Notice*: "Value Addition HSN" auto-fills (5810).
5.  Save.

## Step 5: Daily Usage
*   **Purchasing**: When buying fabric, check the PO uses the **Base Fabric HSN**.
*   **Job Work**: When sending for printing, the Job Card will use the **Process HSN**.
*   **Selling**: The Sales Invoice will automatically pick the correct HSN from the fabric record.