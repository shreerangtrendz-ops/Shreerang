# README: Fabric Master Module

This document provides an in-depth overview of the Fabric Master module, including its architecture, components, data flow, and development guidelines.

---

## 1. Overview

The Fabric Master module is the cornerstone for managing all base fabric specifications within the system. It enables users to:
*   Define and track detailed technical attributes of fabrics.
*   Automatically generate consistent SKUs and descriptive names.
*   Efficiently search, filter, and manage large inventories of fabrics.
*   Perform bulk operations like deletion and data export.

This module is critical for maintaining data consistency across Product Master, Sales Orders, Cost Sheets, and Inventory.

---

## 2. Features

*   **CRUD Operations**: Create, Read, Update, Delete fabrics.
*   **Auto-Generation**: Real-time SKU, Base Fabric Name, Short Code, Base Code, and Construction Code generation.
*   **Comprehensive Fields**: Support for 18+ fabric attributes (GSM, Weight, Handfeel, etc.).
*   **List View**: Grouped by Base, filterable, searchable, sortable, paginated table.
*   **Bulk Actions**: Delete and Export to Excel for selected or all fabrics.
*   **Validation**: Client-side validation for data integrity.
*   **Responsive UI**: Optimized for various screen sizes.

---

## 3. File Structure