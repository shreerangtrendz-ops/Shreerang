# 🤝 FABRIC MASTER INTEGRATION GUIDE

The Fabric Master module serves as a foundational data source, integrating with various other parts of the system to ensure consistency and efficiency.

---

## 1. Integration with Product Master

*   **Purpose**: To link manufactured products to the specific fabrics they are made from.
*   **How it Works**:
    *   When creating or editing a product in the Product Master, users select a `base_fabric_id` (or derived `finish_fabric_id`) from the Fabric Master.
    *   This selection populates product specifications such as `base`, `width`, `gsm`, and `construction` directly from the Fabric Master record.
*   **Impact**: Ensures that product definitions accurately reflect the underlying fabric specifications. Enables detailed costing and inventory tracking at the product level.

---

## 2. Integration with Design Uploads

*   **Purpose**: To associate design patterns with specific fabric types.
*   **How it Works**:
    *   When uploading a new design, users can select a `fabric_master_id` to link the design to a base fabric (e.g., "This design is for Cotton Poplin").
    *   Design attributes can then inherit or be validated against the selected fabric's properties.
*   **Impact**: Creates a structured library of designs tied to physical fabrics, streamlining the design-to-production workflow.

---

## 3. Integration with Cost Sheets

*   **Purpose**: To use accurate fabric cost and specification data in calculating total product costs.
*   **How it Works**:
    *   In the Cost Sheet Generator, when a fabric is selected for a particular product or process, its `gsm`, `weight`, `width`, and `supplier_cost` (if applicable) are pulled directly from the Fabric Master.
    *   These values are used to calculate raw material costs.
*   **Impact**: Ensures precise cost estimations by leveraging standardized and up-to-date fabric data, reducing errors in pricing.

---

## 4. Integration with Sales Orders

*   **Purpose**: To allow sales teams to specify exactly which fabric (by SKU) is being used in a customer order.
*   **How it Works**:
    *   When creating a Sales Order, items can be added by selecting a fabric SKU directly from the Fabric Master.
    *   The selected fabric's details (name, width, GSM, etc.) are automatically associated with the order item.
*   **Impact**: Provides clear communication between sales, production, and inventory regarding exact fabric requirements for each order.

---

## 5. Integration with Inventory

*   **Purpose**: To track physical stock levels of raw fabrics based on their specifications.
*   **How it Works**:
    *   Each roll of fabric received into inventory is logged against a specific `base_fabric_id` (or `finish_fabric_id`).
    *   Inventory reports and stock alerts can then be generated based on these unique fabric identifiers.
*   **Impact**: Enables accurate real-time inventory management, reduces stock discrepancies, and supports efficient procurement.

---

## 6. Integration with Reports

*   **Purpose**: To generate insightful reports using comprehensive fabric data.
*   **How it Works**:
    *   Fabric Master data is used in various reports, such as:
        *   **Fabric Usage Reports**: Which fabrics are most commonly used in products/orders.
        *   **Cost Analysis Reports**: Comparing fabric costs across different suppliers or over time.
        *   **Quality Control Reports**: Tracking GSM consistency, etc.
        *   **Stock Valuation Reports**: Assessing the value of raw material inventory.
*   **Impact**: Provides business intelligence to optimize purchasing, production, and sales strategies.