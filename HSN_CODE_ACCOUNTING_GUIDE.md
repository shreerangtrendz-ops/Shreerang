# HSN Code Accounting Guide

## PART 1: HSN CODE OVERVIEW

### What is HSN Code?
*   **Harmonized System of Nomenclature**: An internationally accepted product coding system used to maintain uniformity in classification of goods.
*   **Structure**: In India, it is primarily an 8-digit code for goods classification under GST.
*   **Usage**: It is mandatory for GST invoices, customs declarations, and trade statistics.
*   **Mandate**: GST compliance requires the correct HSN code to be mentioned on tax invoices.

### Why HSN Code is important?
1.  **GST Compliance**: Avoid penalties and ensure legal operations.
2.  **Accurate Tax Calculation**: The HSN code determines the GST rate (5%, 12%, 18%, etc.).
3.  **Accounting Records**: Essential for categorizing sales and purchases in ledgers.
4.  **Invoice Generation**: Validates the legitimacy of the transaction.
5.  **Customs Clearance**: Required for import/export of fabrics.
6.  **Trade Statistics**: Helps in analyzing business performance by category.

## PART 2: HSN CODE HIERARCHY IN SYSTEM

### Level 1: BASE FABRIC HSN CODE
*   **Applied to**: Raw fabric (Greige/Grey or Bleached).
*   **Examples**:
    *   **5208**: Cotton fabrics
    *   **5407**: Synthetic fabrics (Polyester)
    *   **5007**: Silk fabrics
*   **GST Rate**: Typically 5% or 12%.
*   **Used for**: Fabric purchase invoices from suppliers.

### Level 2: PROCESS HSN CODE
*   **Applied to**: Finishing processes (Job Work).
*   **Examples**:
    *   **Printing (5209)**: Printed cotton fabrics.
    *   **Dyeing (5209)**: Dyed cotton fabrics.
    *   **Embroidery (5810)**: Embroidered fabrics.
    *   **Handwork (5810)**: Hand-embroidered fabrics.
*   **GST Rate**: 5% or 12% depending on the specific job work notification.
*   **Used for**: Job work invoices received from Dyers/Printers.
*   **Note**:
    *   The *Fabric* retains the Base Fabric HSN (e.g., 5208).
    *   The *Service Bill* uses the Process HSN (e.g., 9988 or relevant SAC/HSN) for tax calculation.

### Level 3: VALUE ADDITION HSN CODE
*   **Applied to**: Specialized value additions.
*   **Examples**:
    *   **Embroidery**: 5810
    *   **Handwork**: 5810
    *   **Beading/Sequins**: 5810
*   **GST Rate**: 5% or 12%.
*   **Used for**: Job work invoices for value addition services.

### Level 4: EXPENSE HSN CODE
*   **Applied to**: Operational expenses and consumables.
*   **Examples**:
    *   **Packaging**: 4819 (Cartons, boxes)
    *   **Shipping**: 4909 (Printed matter/Labels) or 9965 (Transport service)
    *   **Buttons**: 6217 (Accessories)
*   **GST Rate**: Varies (5%, 12%, 18%).
*   **Used for**: Recording expense invoices for Input Tax Credit (ITC).

### Level 5: READYMADE GARMENT HSN CODE
*   **Applied to**: Finished products sold to customers.
*   **Examples**:
    *   **Shirt**: 6205
    *   **Saree/Dress Material**: 6204
    *   **Kurta**: 6204
*   **GST Rate**: Typically 5% (for apparel < ₹1000) or 12% (for apparel > ₹1000).
*   **Used for**: Sales invoices generated for customers.

## PART 3: HSN CODE FLOW IN BUSINESS PROCESS

### Purchase Flow
1.  **Supplier** provides fabric with Base Fabric HSN Code.
2.  **System** records purchase entry using this HSN.
3.  **GST** is calculated based on the Base Fabric HSN.
4.  **Input Tax Credit (ITC)** is claimed against this HSN.

### Finishing Flow (Job Work)
1.  Fabric sent to Job Worker.
2.  Job Worker raises invoice using **Process HSN Code** (Service SAC).
3.  **GST** is calculated on the service amount.
4.  **ITC** claimed on job work charges.
5.  The resulting **Finish Fabric** in inventory inherits the *Base Fabric HSN* for its stock valuation.

### Value Addition Flow
1.  Finish fabric sent for embroidery/handwork.
2.  Job Worker raises invoice using **Value Addition HSN Code**.
3.  **GST** calculated on service amount.
4.  **ITC** claimed.
5.  Resulting **Fancy Finish Fabric** in inventory inherits the HSN of the parent fabric (unless the essential character of the fabric changes to "Embroidered Fabric" under chapter 58).

### Sales Flow (Fabric)
1.  Fabric sold to customer.
2.  Invoice generated using the **Fabric HSN Code**.
3.  **Output GST** collected from customer.

### Garment Sales Flow
1.  Readymade garment sold.
2.  Invoice generated using **Readymade Garment HSN Code**.
3.  **Output GST** collected.

## PART 4: HSN CODE EXAMPLES

### Example 1: Cotton Fabric Lifecycle
*   **Base**: Cotton (HSN 5208, 5%)
*   **Finish**: Printed Cotton (HSN 5208, 5%)
    *   *Process*: Printing Service (HSN 9988/5209, 5%)
*   **Fancy**: Embroidered Cotton (HSN 5810, 12%)
    *   *Value Addition*: Embroidery Service (HSN 9988/5810, 5% or 12%)

### Example 2: Silk Fabric Lifecycle
*   **Base**: Silk (HSN 5007, 5%)
*   **Finish**: Dyed Silk (HSN 5007, 5%)
    *   *Process*: Dyeing Service (HSN 9988, 5%)

## PART 5: GST COMPLIANCE
*   **Mandatory Fields**: Invoices must show HSN and GST Rate.
*   **Matching**: The physical product must match the HSN description to avoid classification disputes.
*   **ITC Reversal**: Ensure Input Tax Credit matches the HSN codes filed in GSTR-2B.

## PART 6: ACCOUNTING IMPLICATIONS
*   **Tax Liability**: HSN determines how much tax you owe.
*   **Profit/Loss**: Incorrect HSN can lead to overpaying or underpaying tax, affecting margins.
*   **Audit Trail**: HSN codes link the purchase -> process -> sale chain for auditors.

## PART 7: BEST PRACTICES
*   **Verification**: Verify HSN codes on incoming invoices before accepting materials.
*   **Updates**: GST rates change; update the **HSN Code Master** regularly.
*   **Consistency**: Use the same HSN code for the same product across all documents.