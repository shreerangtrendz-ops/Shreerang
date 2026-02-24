# Complete Workflow Guide

## 1. Quotation to Bill Workflow
1.  **Receive**: Supplier or Job Worker sends a rate quotation.
2.  **Entry**: Admin enters this into the `Quotations` module.
3.  **Review**: Management reviews the rates against historical data.
4.  **Action**: Admin clicks **"Convert to Bill"** on the quotation.
5.  **Result**:
    *   Quotation status updates to "Converted".
    *   A new record is created in `Purchase Bills` or `Job Work Bills`.
    *   Inventory costs are updated (if configured).

## 2. Purchase to Dispatch Workflow
1.  **Order**: Sales team receives an order from a customer.
2.  **Entry**: Order is entered into `Pending Orders`.
3.  **Fulfillment**: Warehouse checks stock.
4.  **Dispatch**:
    *   Click **"Dispatch"** on the pending order.
    *   Enter quantity being sent and the Bill/Invoice Number.
5.  **Result**:
    *   `Sales Bill` is auto-generated.
    *   Pending Order balance decreases.
    *   If Balance = 0, Order status becomes "Completed".

## 3. Job Work Workflow
1.  **Issue**: Grey fabric is sent to a Job Worker (e.g., for printing).
2.  **Invoice**: Job Worker sends a bill for the work done.
3.  **Entry**: Admin enters bill into `Job Work Bills`.
    *   Link to specific **Job Worker**.
    *   Link to specific **Design Number**.
4.  **Result**:
    *   Cost is tracked per design.
    *   Job Worker's account ledger is updated.

## 4. Costing Workflow
1.  **Data Gathering**: System aggregates costs from:
    *   `Purchase Bills` (Raw Material)
    *   `Job Work Bills` (Processing)
2.  **Analysis**:
    *   View costs by Supplier to negotiate rates.
    *   View costs by Design to price products accurately.
3.  **Outcome**: Generate Cost Sheet for final product pricing.