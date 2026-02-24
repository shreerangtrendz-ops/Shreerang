# Supplier Management Guide

## PART 1: SUPPLIER OVERVIEW
**What is a Supplier?**
A Supplier is any vendor who sells raw materials (Base Fabrics, Grey Cloth) or accessories (Buttons, Zippers, Threads) to the company. They are now managed independently from the Fabric Master to ensure that one fabric definition (e.g., "60x60 Cotton") can be purchased from multiple suppliers without duplicating data.

## PART 2: ADD SUPPLIER
1.  Navigate to **People > Suppliers**.
2.  Click the **Add New Supplier** button.
3.  Fill in the form fields:
    *   **Supplier Name:** (Compulsory) The business name of the vendor.
    *   **Phone:** (Compulsory) Primary contact number.
    *   **Supplier Type:** (Compulsory) Select "Fabric Supplier", "Accessory Supplier", or "Both".
    *   **Status:** Default is "Active".
    *   **Banking Details:** Add Bank Name, Account No, IFSC for future payment processing.
4.  Click **Save**. A success message will appear.

## PART 3: EDIT SUPPLIER
1.  Navigate to **People > Suppliers**.
2.  Locate the supplier in the list.
3.  Click the **Edit** (Pencil) icon.
4.  Update necessary fields.
5.  Click **Save**.

## PART 4: DELETE SUPPLIER
1.  Navigate to **People > Suppliers**.
2.  Click the **Delete** (Trash) icon next to a supplier.
3.  Confirm the action in the popup dialog.
    *   *Note:* Deletion may be blocked if the supplier is linked to active Purchase Orders.

## PART 5: FILTER SUPPLIERS
1.  Use the search bar at the top to find suppliers by Name or Phone.
2.  (Coming Soon) Advanced filters for City or Supplier Type will be available in the filter panel.

## PART 7: EXPORT SUPPLIERS
1.  Navigate to **Import/Export > Export to Excel**.
2.  Click **Export Data** button or select from the menu.
3.  Choose **Suppliers**.
4.  An Excel file containing all supplier details (including banking info) will download.

## PART 8: IMPORT SUPPLIERS
1.  Navigate to **Import/Export > Import from Excel**.
2.  Download the **Standard Data Template** if you haven't already.
3.  Fill in the Supplier sheet.
4.  Click **Start Import Wizard**.
5.  Select Category: **Supplier Master**.
6.  Upload your file and follow the mapping steps.

## PART 9: SUPPLIER TYPES
*   **Fabric Supplier:** Vendors providing Base Fabrics, Grey Cloth, or Finished Fabrics.
*   **Accessory Supplier:** Vendors providing buttons, laces, threads, packing materials.
*   **Both:** General vendors providing multiple categories.

## PART 10: BEST PRACTICES
*   **GST Compliance:** Always enter valid GST numbers to ensure tax calculations on Purchase Orders are accurate.
*   **Unique Names:** If two suppliers have the same name, append their city (e.g., "Rahul Textiles - Surat").
*   **Active Maintenance:** Set suppliers to "Inactive" instead of deleting them if you stop trading, to preserve historical data.