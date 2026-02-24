# Fabric Master Bulk Import System - Complete Guide

## 1. System Overview
The Fabric Master Bulk Import System is a powerful tool designed to streamline the creation of fabric records in the database. It supports the three-level fabric hierarchy used in our system:

1.  **Base Fabric**: The raw material (e.g., Cotton 60x60 Greige).
2.  **Finish Fabric**: The processed version of a Base Fabric (e.g., Cotton 60x60 Mill Print Procion).
3.  **Fancy Finish Fabric**: Value-added versions of a Finish Fabric (e.g., Cotton 60x60 Mill Print with Embroidery).

This hierarchical approach ensures data integrity and reduces redundancy. You cannot create a Finish Fabric without a parent Base Fabric, nor a Fancy Finish Fabric without a parent Finish Fabric.

## 2. Fabric Hierarchy & SKU Structure

### Level 1: Base Fabric
*   **Definition**: The fundamental raw material defined by its construction, weight, and material.
*   **SKU Logic**: `[Width]-[ShortCode]-[Finish]`
    *   *Example*: `58-COTTPL-GRG` (58" Width, Cotton Poplin Short Code, Greige Finish)

### Level 2: Finish Fabric
*   **Definition**: A Base Fabric that has undergone a specific dyeing or printing process.
*   **SKU Logic**: `[BaseSKU]-[ProcessCode][ProcessTypeCode]`
    *   *Example*: `58-COTTPL-GRG-MPPRC` (Base SKU + Mill Print + Procion)

### Level 3: Fancy Finish Fabric
*   **Definition**: A Finish Fabric with additional embellishments like embroidery, foil, or washing.
*   **SKU Logic**: `[FinishSKU]-[VACode][ConceptCode]`
    *   *Example*: `58-COTTPL-GRG-MPPRC-EMBSQN` (Finish SKU + Embroidery + Sequins)

## 3. How to Use Bulk Import (Step-by-Step)

1.  **Navigate**: Go to `Admin` > `Fabric Master` > `Bulk Import`.
2.  **Select Type**: Choose the import type (Base, Finish, or Fancy) based on what you want to create.
3.  **Download Template**: Click "Download Template" to get the correctly formatted Excel file.
4.  **Prepare Data**: Fill the Excel file with your data. **Do not change column headers.**
5.  **Upload**: Drag and drop your file into the upload zone or click to select.
6.  **Map Columns**: The system tries to auto-map columns. Verify that Excel columns match System fields. Correct any mismatches.
7.  **Validate**: The system checks every row for errors (missing fields, invalid values, duplicate SKUs).
    *   *Red Rows*: Critical errors. Must be fixed in Excel and re-uploaded.
    *   *Yellow Rows*: Warnings (usually auto-generated values). Safe to proceed.
8.  **Import**: Click "Start Import". Watch the progress bar as items are created.
9.  **Review**: Once complete, review the summary. You can see how many items succeeded and failed.

## 4. Excel Template Reference

### Base Fabric Template
| Column | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| Fabric Name | Text | Yes | Commercial name (e.g., Poplin) |
| Width | Dropdown | Yes | Allowed: 28", 36", 44", ..., 78" |
| Base | Dropdown | Yes | Material (Cotton, Silk, etc.) |
| Finish | Dropdown | Yes | Finish State (Greige, RFD, etc.) |
| Weight | Number | No | Weight in kg/mtr |
| GSM | Number | No | Grams per Square Meter |
| Construction | Dropdown | No | Weave type (Plain, Twill, etc.) |
| Yarn Type | Dropdown | No | Spun, Filament, etc. |
| Yarn Count | Text | No | e.g., 40s, 60s |
| Short Code | Text | Auto | If empty, AI generates it. |

### Finish Fabric Template
| Column | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| Base Fabric SKU | Text | Yes | **Must exist in system.** |
| Process | Dropdown | Yes | Mill Print, Digital Print, etc. |
| Process Type | Dropdown | No | Specific technique (Procion, Sublimation) |
| Ink Type | Dropdown | No | Reactive Dye, Pigment, etc. |
| Class | Dropdown | No | Regular, Premium |
| Tags | Dropdown | No | Foil, Without Foil |
| Finish | Dropdown | No | Final finish (Bio Wash, Silicon) |

### Fancy Finish Fabric Template
| Column | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| Finish Fabric SKU | Text | Yes | **Must exist in system.** |
| Value Addition | Dropdown | Yes | Hakoba, Embroidery, Foil, etc. |
| Thread | Dropdown | No | Thread material used |
| Concept | Dropdown | No | Specific style (Sequins, Eyelet) |

## 5. Master Data Options

### Base Options
*   **Synthetic**: Polyester, Nylon, Blend Base, PV, NV, PC, Rayon x Poly
*   **Semi-Synthetic**: Viscose, Rayon, Modal
*   **Natural**: Cotton, Linen, Silk, Wool, Hemp

### Construction Options
*   **Woven**: Plain Weave, Twill, Satin, Dobby, Jacquard, Canvas, Voile, Georgette, Crepe, Organza, Chiffon, Velvet
*   **Knitted**: Single Jersey, Interlock, Rib, Pique, French Terry, Fleece
*   **Other**: Non Woven

### Process Codes
| Process | Code | Types |
| :--- | :--- | :--- |
| Mill Print | MP | Procion, Discharge, Khadi, Pigment, Table, Block, ODP |
| Digital Print | DP | Sublimation, Direct |
| Dyed | DYD | - |
| RFD | RFD | - |

### Value Addition Codes
| VA Type | Code | Concepts (examples) |
| :--- | :--- | :--- |
| Hakoba | SCH | Eyelet, Sequins, GPO |
| Embroidered | EMB | Multi Thread, Cording, Applique |
| Handwork | HW | Khatli, Zardosi, Mirror |
| Foil | FOIL | - |
| Washing | WSH | Silicon, Enzyme, Stone |

## 6. Validation Rules
The system enforces the following rules before allowing import:
- [x] **Required Fields**: All fields marked "Yes" in templates must have values.
- [x] **Dropdown Validity**: Values in dropdown columns must match the Allowed Options exactly (case-sensitive).
- [x] **Parent Existence**: Base SKU (for Finish) and Finish SKU (for Fancy) must exist in the database.
- [x] **Duplicate Check**: The system checks if the resulting SKU already exists to prevent duplicates.
- [x] **Data Type**: Numeric fields (Weight, GSM) must contain valid numbers.

## 7. Column Mapping
If your Excel headers don't match our standard template, the **Column Mapping Interface** allows you to link them manually.
*   **Left Side**: Your Excel Columns.
*   **Right Side**: System Fields.
*   **Validation**: You cannot proceed until all Required Fields are mapped.

## 8. Import Progress
During import, you will see:
*   **Counter**: X of Y items processed.
*   **Status Bar**: Visual percentage completion.
*   **Live Log**: Real-time list of any errors encountered (e.g., "Row 5: SKU duplicate").

## 9. Retry Failed Items
If some items fail:
1.  Don't panic! Successful items are already saved.
2.  Click "Download Error Report" to get a CSV of just the failed rows with error messages.
3.  Open the CSV, fix the errors (e.g., correct a typo in "Cotton").
4.  Start a **new import** with this fixed file.

## 10. Import History
View past imports at `Admin` > `Fabric Master` > `Import History`.
*   See who imported what and when.
*   View success/failure rates.
*   Download logs for audit purposes.

## 11. Tips & Best Practices
1.  **Start Small**: Test with 5-10 rows first to ensure you understand the format.
2.  **Use ID-Reference**: When creating Finish Fabrics, copy-paste the Base Fabric SKUs directly from the system to avoid typos.
3.  **Clean Data**: Ensure no hidden spaces in your Excel cells (e.g., "Cotton " vs "Cotton").
4.  **Batching**: For massive datasets (10,000+), break files into chunks of 500-1000 rows for better browser performance.
5.  **Standardize**: Use the downloadable templates. Don't create your own from scratch.
6.  **Verify**: After import, randomly check 2-3 items in the Fabric Master list to ensure data looks correct.

## 12. Common Issues
| Issue | Cause | Solution |
| :--- | :--- | :--- |
| "Invalid Base" error | Typo in Excel (e.g., "Coton") | Check spelling against Base Options list. |
| "SKU not found" | Parent fabric doesn't exist yet | Import Base Fabrics first, then Finish Fabrics. |
| "Duplicate SKU" | Item already in DB | Check if you already imported this file. |
| Import stuck at 0% | Internet connection lost | Refresh page and try again. |
| "File too large" | File > 5MB | Remove images/formatting or split file. |

## 13. Implementation Checklist
- [x] Bulk Import Wizard UI
- [x] Excel Parsing Engine
- [x] Validation Logic (Base, Finish, Fancy)
- [x] Database Insertion Services
- [x] History Tracking
- [x] Error Reporting & CSV Export

## 14. Support
If you encounter persistent issues:
1.  Check the **Troubleshooting Guide**.
2.  Download the **Error Report**.
3.  Contact the technical team with the error report attached.