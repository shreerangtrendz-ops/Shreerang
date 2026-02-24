# HSN Code Usage Guide

## PART 1: USING HSN CODE IN BASE FABRIC
1.  Navigate to **Fabric Master > Base Fabric**.
2.  Click **Add New Base Fabric** (or Edit existing).
3.  Scroll to the **Accounting & GST** section.
4.  Enter the **HSN Code** (e.g., 5208).
5.  Enter the **GST Rate** (e.g., 5).
6.  (Optional) Enter the HSN Description.
7.  **Save**.
    *   *Result*: This HSN code is now the default for this fabric and all its future finishes.

## PART 2: USING HSN CODE IN FINISH FABRIC
1.  Navigate to **Fabric Master > Finish Fabric**.
2.  Click **Add New Finish Fabric**.
3.  Select a **Base Fabric**.
    *   *Action*: The system automatically pulls the HSN Code (5208) and Rate (5%) from the base fabric. You can override this if the process changes the classification (e.g., coating).
4.  Select a **Process** (e.g., "Printed").
    *   *Action*: The system looks up the "Printed" process in the HSN Master and pulls the **Process HSN Code** (e.g., 9988) and **Process GST Rate** (e.g., 5%).
5.  **Save**.
    *   *Result*: The system now knows the tax rate for selling this fabric AND the tax rate for the job work cost estimation.

## PART 3: USING HSN CODE IN FANCY FINISH FABRIC
1.  Navigate to **Fabric Master > Fancy Finish Fabric**.
2.  Click **Add New Fancy Finish**.
3.  Select a **Finish Fabric**.
    *   *Action*: Pulls parent HSN Code (5208).
4.  Select a **Value Addition** (e.g., "Embroidery").
    *   *Action*: The system looks up "Embroidery" in the Master and pulls the **Value Addition HSN** (e.g., 5810) and Rate (12%).
5.  **Save**.
    *   *Result*: Accurate costing for the embroidery job work is now possible.

## PART 4: USING HSN CODE IN INVOICES & ORDERS
### Purchase Order (PO)
*   When creating a PO for Base Fabric, the system uses the **Base Fabric HSN Code**.

### Job Work Order (Processing)
*   When sending fabric for Printing, the system uses the **Process HSN Code** to estimate the GST amount on the Job Worker's bill.

### Job Work Order (Value Addition)
*   When sending fabric for Embroidery, the system uses the **Value Addition HSN Code** to estimate the GST on the embroidery charges.

### Sales Invoice (Fabric)
*   When selling fabric rolls, the invoice uses the **Fabric HSN Code** (inherited from Base/Finish).

### Sales Invoice (Garment)
*   When selling a Readymade Garment (e.g., Kurti), the system uses the **Readymade Garment HSN Code** defined in the Garment Master (6204).