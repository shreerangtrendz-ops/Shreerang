# 🧵 Fabric Master User Guide

## 1. Overview
The **Fabric Master** module is the central repository for all fabric specifications in the system. It allows you to create, manage, and track detailed technical specifications for fabrics, including their physical properties, construction details, and quality metrics.

The system automatically generates standardized **SKUs** and **Short Codes** based on the parameters you select, ensuring consistency across your inventory.

---

## 2. Quick Start
1.  Navigate to **Admin Dashboard** > **Fabric Master**.
2.  Click **+ Add New Fabric** to create a single entry.
3.  Select **Base**, **Construction**, and **Width**.
4.  Watch the **SKU** auto-generate in the preview panel.
5.  Click **Save Fabric**.

---

## 3. Fabric Master List Page
The main dashboard provides a comprehensive view of your fabric library.

### Key Features
*   **Grouped View**: Fabrics are automatically organized by their Base material (e.g., Cotton, Polyester) for easy navigation.
*   **Search**: Use the top search bar to find fabrics by **SKU** or **Fabric Name**.
*   **Filters**: Drill down by Base, Finish, or Width using the dropdowns.
*   **Bulk Actions**: Select multiple rows to Export or Delete them in one go.

---

## 4. Create Fabric Form
Located at `/admin/fabric-master/new`.

### Fields & Auto-Generation
| Field | Description | Impact on SKU |
| :--- | :--- | :--- |
| **Base** | Material type (e.g., Cotton) | Generates Base Code (e.g., CT) |
| **Construction** | Weave type (e.g., Twill) | Generates Construction Code (e.g., TW) |
| **Width** | Fabric width (e.g., 58") | Prefixes SKU (e.g., 58) |
| **Finish** | Finish type (e.g., Greige) | Suffixes SKU (e.g., -Greige) |
| **GSM** | Grams per Square Meter | Informational |
| **Weight** | Weight in kg/mtr | Informational |

**Real-time Preview**: As you fill out the form, the "Live Preview" card at the top will show you exactly what the SKU and Fabric Name will look like.

---

## 5. Bulk Operations
Manage large datasets efficiently.

### Deleting Fabrics
1.  Check the box next to the fabrics you want to remove.
2.  Click the **Delete** (Trash Icon) button in the floating toolbar.
3.  Confirm the action in the dialog.
    *   *Note: You cannot delete fabrics that are currently used in Sales Orders.*

### Exporting Data
1.  Select specific fabrics or click "Select All".
2.  Click **Export**.
3.  An Excel file (`.xlsx`) will download automatically containing all 18 technical columns.

---

## 6. Tips & Tricks
1.  **Keyboard Navigation**: Use `Tab` to move quickly between form fields.
2.  **Search Shortcuts**: Searching "58 Cotton" will find all 58-inch Cotton fabrics.
3.  **Cloning**: To create a similar fabric, open an existing one and look for the "Duplicate" option (coming soon) or simply open a new form in a new tab to copy-paste.
4.  **GSM Tolerance**: Always set a tolerance (e.g., +/- 5%) to avoid quality control disputes later.
5.  **Standardization**: Stick to the dropdown options whenever possible to ensure your Analytics reports are accurate.

---

## 7. Support
If you encounter issues not covered here, please contact the IT Support Team or refer to the [Troubleshooting Guide](FABRIC_MASTER_TROUBLESHOOTING.md).