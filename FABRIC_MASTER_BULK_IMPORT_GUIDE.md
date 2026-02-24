# Fabric Master Bulk Import Guide

## 1. Overview
The Bulk Import feature in Fabric Master allows textile businesses to efficiently upload large volumes of fabric data using Excel (`.xlsx`) or CSV (`.csv`) files. Instead of manually entering each fabric one by one, you can prepare a spreadsheet and import hundreds of records in minutes.

### Benefits
- **Time Saving**: Import hundreds of items in the time it takes to enter one manually.
- **Accuracy**: Reduce typo errors by preparing data in a spreadsheet.
- **Efficiency**: Quickly migrate legacy data or add new seasonal collections.

### When to Use
- Initial system setup and data migration.
- Adding a new seasonal collection (e.g., "Summer 2026 Collection").
- Updating specifications for a large batch of existing fabrics.

### Specifications
- **Supported Formats**: Excel (`.xlsx`) and CSV (`.csv`).
- **Maximum File Size**: 5MB.
- **Recommended Limit**: Up to 1000 items per import for optimal performance.

---

## 2. Getting Started

### Step-by-Step Navigation
1.  Log in to the application.
2.  Navigate to **Admin Dashboard**.
3.  Click on the **Fabric & Design** section.
4.  Select **Fabric Master** from the menu.
5.  Locate the toolbar at the top of the fabric list.

### Downloading the Template
1.  Click the **"Import from Excel/CSV"** button (Upload Icon) in the toolbar.
2.  In the modal window that appears, look for the **"Download Template"** button.
3.  Click it to download `Fabric_Import_Template.xlsx`.
4.  Open the file in Microsoft Excel, Google Sheets, or any compatible spreadsheet software.

---

## 3. Template Structure

The template contains specific columns that map to the system's database. **Do not rename or delete these columns.**

### Required Fields
These fields must be filled for every row.

| Column Header | Description | Allowed Values | Example |
| :--- | :--- | :--- | :--- |
| **Fabric Name** | The primary name of the fabric. | Text (Unique recommended) | `60 x 60 Cotton` |
| **Width** | The usable width of the fabric roll. | `28"`, `30"`, `36"`, `40"`, `44"`, `48"`, `50"`, `54"`, `56"`, `58"`, `62"`, `66"`, `72"`, `78"` | `58"` |
| **Base** | The material composition. | `Cotton`, `Polyester`, `Viscose`, `Rayon`, `PV`, `PC`, `Nylon`, `Silk`, `Linen`, `Wool`, `Blend` | `Cotton` |
| **Finish** | The processing stage/finish. | `Greige`, `RFD`, `PPF`, `Dyed`, `Printed`, `Bleached` | `Greige` |

### Optional Fields
These fields provide additional detail but can be left blank.

| Column Header | Description | Format | Example |
| :--- | :--- | :--- | :--- |
| **Weight (kg)** | Weight of the fabric per unit. | Number (Decimal) | `0.12` |
| **GSM** | Grams per Square Meter. | Number | `110` |
| **GSM Tolerance** | Allowable variance in GSM. | Text | `+/- 5%` |
| **Construction** | Weave type or structure. | Text | `Plain Weave` |
| **Yarn Type** | Type of yarn used. | Text | `Spun` |
| **Yarn Count** | Count of the yarn. | Text | `60s` |
| **Handfeel** | Tactile feel of the fabric. | Text | `Soft` |
| **Stretch** | Elasticity properties. | Text | `None`, `2-Way`, `4-Way` |
| **Transparency** | How see-through the fabric is. | Text | `Opaque` |
| **HSN Code** | Tax classification code. | Text/Number | `5208` |
| **Cost Code** | Internal code for costing. | Text | `CC-01` |

---

## 4. Adding Data

### General Rules
- **One Row = One Fabric**: Each row in your spreadsheet represents a unique fabric entry.
- **No Formulas**: Ensure values are plain text or numbers, not Excel formulas.
- **Trim Whitespace**: Avoid extra spaces at the beginning or end of text.

### Step-by-Step
1.  Open the downloaded template.
2.  Leave the header row (Row 1) exactly as is.
3.  Start entering data from **Row 2**.
4.  **Fill Required Fields**: Enter Name, Width, Base, and Finish for every row.
5.  **Fill Optional Fields**: Enter any known specifications like GSM or Weight.
6.  **Skip Auto-Generated Fields**: Leave `SKU` and `Short Code` columns blank. The system will generate these automatically based on your data (e.g., `Width` + `Name` + `Finish`).
7.  **Save File**: Save your changes. Ensure the format remains `.xlsx` or `.csv`.

---

## 5. Importing Data

Follow this process to import your prepared file:

1.  **Open Import Modal**: On the Fabric Master page, click **"Import from Excel/CSV"**.
2.  **Select File**: Click the "Select File" button or drag and drop your file into the dashed zone.
3.  **Wait for Parsing**: The system will read your file. A loading spinner will appear.
4.  **Review Preview**: A table will appear showing your data.
5.  **Check Status**:
    - **Green Check**: Valid row.
    - **Red X**: Error in row.
    - **Yellow Warning**: Auto-generated fields or minor warnings.
6.  **Verify Data**: Ensure the "Fabric Name", "Width", etc., look correct.
7.  **Check Auto-Gen Fields**: Look for the "Auto" badge on SKU/Short Code columns to see what the system generated.
8.  **Initiate Import**: Click the **"Import Valid Rows"** button (bottom right).
9.  **Monitor Progress**: A progress bar will show the percentage complete.
10. **Completion**: A success summary will appear (e.g., "Success: 50, Failed: 0").
11. **Close & Refresh**: Click "Close". The Fabric Master list will automatically refresh to show your new fabrics.

---

## 6. Handling Errors

If your file has issues, the Preview screen will highlight them.

### Common Validation Errors
| Error Message | Cause | Solution |
| :--- | :--- | :--- |
| **"Fabric Name is required"** | The cell is empty. | Enter a name for the fabric. |
| **"Invalid Width"** | Value is not in the allowed list (e.g., "59"). | Change to a standard width (e.g., "58" or "60"). |
| **"Invalid Base"** | Typo or unknown base type (e.g., "Coton"). | Correct spelling to match allowed list (e.g., "Cotton"). |
| **"Duplicate SKU"** | The generated SKU matches an existing one. | Change the Fabric Name or Short Code to make it unique. |

### Fixing Errors
1.  **In Preview**: You can't edit directly in the preview (read-only).
2.  **Action**: Note the row numbers with errors.
3.  **Fix**: Open your Excel file, correct the data in those rows, save, and re-upload.
4.  **Partial Import**: You can choose to "Import Valid Rows" anyway. Only the green rows will be added; red rows will be skipped.

---

## 7. Bulk Delete

To clean up data or remove mistakes:

1.  **Selection**: On the Fabric Master list, check the box next to each fabric you want to delete.
    - Use the checkbox in the header row to **Select All** visible items.
2.  **Delete Button**: Once items are selected, a red **"Delete Selected (x)"** button appears in the toolbar. Click it.
3.  **Confirmation**: A modal will list the items to be deleted.
4.  **Dependencies**: The system checks if fabrics are used elsewhere (e.g., in Designs).
    - If a fabric is in use, it **cannot** be deleted.
    - The modal will show a warning for these specific items.
5.  **Confirm**: Click the final **"Delete"** button.
6.  **Progress**: A progress bar will show the deletion status.

---

## 8. Tips & Tricks
- **Descriptive Names**: Use names like "60x60 Cotton" instead of just "Cotton" to help the system generate better Short Codes (e.g., "COT-60").
- **Batching**: If importing >1000 items, split them into multiple files (e.g., "Fabrics_Part1.xlsx", "Fabrics_Part2.xlsx").
- **Defaults**: If you leave "Finish" blank, the system often defaults to "Greige" (Raw).
- **Validation**: Always check the preview screen before clicking Import. It’s easier to fix errors in Excel than to delete incorrect data later.

---

## 9. Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **File not uploading** | Check if file is >5MB. Ensure it is not password protected. |
| **Validation errors persist** | Ensure no hidden spaces are in your cells. Copy-paste values as "Text" in Excel. |
| **Data not showing** | Check if you have active filters (e.g., searching for "Cotton" while importing "Rayon"). Clear filters. |
| **Progress bar stuck** | If stuck for >1 minute, check internet. You can safely refresh; data is inserted in batches. |

---

## 10. FAQ

**Q: Can I undo an import?**
A: There is no "Undo" button. However, you can select the newly imported items and use the Bulk Delete feature.

**Q: Can I update existing fabrics via import?**
A: Currently, the import feature is for **Creating** new records. It checks for duplicates and skips them; it does not update existing rows.

**Q: What if I don't have a value for GSM?**
A: Leave the cell blank. It is an optional field.

**Q: Why did my SKU change?**
A: If you left the SKU column blank, the system auto-generated it to ensure uniqueness and standard formatting.

---

## 11. Appendix

### Support
For technical issues, contact the IT Support Team or raise a ticket in the Admin Dashboard.

### Sample Data Row
`Fabric Name: Poly Crepe | Width: 44" | Base: Polyester | Finish: RFD | Weight: 0.08 | GSM: 80`