# Pending Orders Module Guide

## Purpose
Manages your order book. Tracks what customers have ordered vs. what has been shipped.

## Key Concepts
*   **Party-wise View**: Orders are grouped by Customer for easy logistics planning.
*   **Balance Quantity**: `Order Qty - Dispatched Qty`.
*   **Status**:
    *   **Pending**: Nothing shipped.
    *   **Partial**: Some shipped, balance remains.
    *   **Completed**: Fully shipped.

## Dispatching
1.  Find the order.
2.  Click the **Truck Icon**.
3.  Enter the **Bill Number** and **Dispatch Qty**.
4.  Confirm.
    *   The system updates the Balance.
    *   A Sales Bill is created.
    *   Dispatch history is logged.