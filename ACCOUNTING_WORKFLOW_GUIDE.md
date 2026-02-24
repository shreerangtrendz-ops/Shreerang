# Accounting Workflow Guide

## PART 1: PURCHASE WORKFLOW
1.  **Order**: Purchase Order issued to Supplier for "60x60 Cotton".
2.  **Receipt**: Fabric received at warehouse.
3.  **Entry**: Goods Receipt Note (GRN) created.
4.  **System Action**:
    *   Looks up Base Fabric HSN (5208).
    *   Calculates GST Input: (Quantity * Rate * 5%).
5.  **Accounting**:
    *   Debit: Inventory Account.
    *   Debit: Input GST Account (CGST/SGST or IGST).
    *   Credit: Supplier Payable.

## PART 2: FINISHING WORKFLOW
1.  **Issue**: Grey fabric issued to "Star Printers" (Job Worker).
2.  **Process**: Printing job completed.
3.  **Receipt**: Printed fabric received back.
4.  **Invoice Entry**: Job work invoice entered.
5.  **System Action**:
    *   Looks up Process HSN (9988/5209).
    *   Calculates GST Input on Service: (Job Charges * 5%).
6.  **Accounting**:
    *   Debit: Job Work Expense (added to product cost).
    *   Debit: Input GST Account.
    *   Credit: Job Worker Payable.
7.  **Inventory Update**: Stock moves from "Base Fabric" to "Finish Fabric".

## PART 3: VALUE ADDITION WORKFLOW
1.  **Issue**: Printed fabric issued to "Royal Embroiderers".
2.  **Process**: Embroidery completed.
3.  **Receipt**: Embroidered fabric received.
4.  **Invoice Entry**: Job work invoice entered.
5.  **System Action**:
    *   Looks up Value Addition HSN (5810).
    *   Calculates GST Input on Service: (Job Charges * 12%).
6.  **Accounting**:
    *   Debit: Value Addition Expense (added to product cost).
    *   Debit: Input GST Account.
    *   Credit: Job Worker Payable.
7.  **Inventory Update**: Stock moves from "Finish Fabric" to "Fancy Finish Fabric".

## PART 4: SALES WORKFLOW (FABRIC)
1.  **Order**: Sales Order received from Customer.
2.  **Dispatch**: Fabric packed and shipped.
3.  **Invoice**: Sales Invoice generated.
4.  **System Action**:
    *   Looks up Fabric HSN (5208 or 5810 depending on final product).
    *   Calculates Output GST: (Sales Value * 5% or 12%).
5.  **Accounting**:
    *   Debit: Customer Receivable.
    *   Credit: Sales Income.
    *   Credit: Output GST Liability.

## PART 5: GARMENT SALES WORKFLOW
1.  **Order**: Customer buys a "Cotton Kurti".
2.  **Invoice**: Sales Invoice generated.
3.  **System Action**:
    *   Looks up Garment HSN (6204).
    *   Checks Price Slab (if < ₹1000 or > ₹1000).
    *   Calculates Output GST.
4.  **Accounting**:
    *   Debit: Customer Receivable.
    *   Credit: Sales Income.
    *   Credit: Output GST Liability.