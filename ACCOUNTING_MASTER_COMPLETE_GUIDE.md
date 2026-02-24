# Accounting Master Complete Guide

## Overview
The Accounting Master is the financial backbone of the ERP, handling everything from purchase bills to sales invoices, quotations, and commission tracking.

## Core Modules

### 1. Purchase Bills
*   **Purpose**: Log all incoming bills for raw materials (Base Fabric) or finished goods.
*   **Workflow**: Upload Image -> AI Extract -> Verify -> Save.
*   **Linkage**: Linked to Suppliers and Fabric Types.

### 2. Job Work Bills
*   **Purpose**: Track costs for dyeing, printing, and other processes.
*   **Linkage**: Linked to Job Workers and Design Numbers.

### 3. Sales Bills
*   **Purpose**: Generate invoices for customers.
*   **Linkage**: Can be auto-generated from Pending Order dispatches.

### 4. Quotations
*   **Purpose**: Manage price quotes.
*   **Feature**: "Convert to Bill" button allows seamless transition from quote to actual bill.

### 5. Pending Orders
*   **Purpose**: Track partial dispatches.
*   **Feature**: "Dispatch" button logs a dispatch event, creates a Sales Bill, and updates balance quantity automatically.

### 6. Commission/Brokerage
*   **Purpose**: Track agent commissions (on sales) and brokerages (on purchases).

## Best Practices
1.  **Always use the Dispatch button** on Pending Orders to ensure history is tracked.
2.  **Upload images** for all bills to maintain a digital audit trail.
3.  **Check HSN codes** against the master list to ensure tax compliance.