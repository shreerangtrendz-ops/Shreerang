# Bulk Import Quick Start Guide

## 🚀 Quick Navigation
*   [Start New Import](/admin/fabric/bulk-import)
*   [View Import History](/admin/fabric/import-history)
*   [Download Templates](/admin/fabric/bulk-import) (Step 2 of Wizard)

## ⏱️ 5-Minute Quick Start

### For Base Fabrics
1.  Go to **Bulk Import**. Select **Base Fabrics**.
2.  **Download Template**.
3.  Add row: `Poplin`, `58"`, `Cotton`, `Greige`. Leave others blank/optional.
4.  **Upload** file.
5.  **Map Columns** (if needed) -> **Validate** -> **Import**.
6.  Done!

### For Finish Fabrics
1.  Ensure Base Fabric (e.g., `58-COTTPL-GRG`) exists.
2.  Select **Finish Fabrics**. Download Template.
3.  Add row: `58-COTTPL-GRG`, `Mill Print`, `Procion`, `Pigment Dye`.
4.  **Upload** -> **Validate** -> **Import**.

### For Fancy Finish Fabrics
1.  Ensure Finish Fabric (e.g., `58-COTTPL-GRG-MPPRC`) exists.
2.  Select **Fancy Finish Fabrics**. Download Template.
3.  Add row: `58-COTTPL-GRG-MPPRC`, `Embroidered`, `Poly`, `Sequins (Sitara)`.
4.  **Upload** -> **Validate** -> **Import**.

## 🔄 Common Workflows

**Scenario: Setting up a new collection**
1.  **Batch 1**: Import all **Base Fabrics** (Raw materials).
2.  **Batch 2**: Export the new Base Fabric SKUs. Use them to prepare the **Finish Fabric** import file.
3.  **Batch 3**: Import Finish Fabrics.
4.  **Batch 4**: (Optional) Import Fancy versions.

## ⌨️ Shortcuts & Tips
*   **Tab**: Move between fields in the Mapping screen.
*   **Enter**: Confirm dialogs.
*   **Tip**: You can drag-and-drop files anywhere in the upload zone.
*   **Tip**: Red validation errors block import. Yellow warnings allow import.

## ❓ FAQ Quick Reference
| Question | Answer |
| :--- | :--- |
| **Can I update existing items?** | No, this tool is for **Creation** only. |
| **Can I upload images?** | No, images must be added manually or via specific Media Import tool. |
| **Limit on rows?** | Recommended max 1000 per file for best performance. |
| **Undo import?** | No "Undo" button. Use Bulk Delete in Fabric Master list. |

## 🛠️ Troubleshooting Table
| Error | Fix |
| :--- | :--- |
| **"Invalid Width"** | Use `"`, not `inch` or blank. Must match dropdown list. |
| **"SKU Duplicate"** | Check if item already exists. Rename or skip. |
| **"Missing Header"** | Don't delete/rename row 1 in Excel. |