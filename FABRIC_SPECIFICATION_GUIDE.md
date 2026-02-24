# 📚 Fabric Specification System Guide

## ✅ Status: FULLY IMPLEMENTED & READY TO USE

---

## What's New

The Fabric Specification System introduces a robust and streamlined way to define, manage, and view detailed fabric technical data.

*   **Fabric Specification Form (`src/components/admin/fabric/FabricSpecificationForm.jsx`)**: A unified, comprehensive form to create and edit fabric specifications. It integrates all core fabric attributes, auto-calculates key identifiers, and provides real-time feedback.
*   **Fabric Specification View (`src/pages/admin/fabric/FabricSpecificationView.jsx`)**: A dedicated read-only page to display a fabric's complete specification in a professional, sheet-like format, with options to print or export as PDF.
*   **Fabric Specification Table (`src/components/admin/fabric/FabricSpecificationTable.jsx`)**: A reusable component for presenting fabric details in a structured table, ideal for both view pages and future integration into other modules.

---

## Fabric Specification Fields

The form is organized into logical sections to ensure clarity and ease of data entry.

### Section 1: Basic Information

*   **Base Fabric Name (Auto-Calculated)**:
    *   **Formula**: `[Clean Width] [Fabric Name] [Finish]`
    *   *Example*: For `Width: 58"`, `Fabric Name: Poplin`, `Finish: Greige` -> `58 Poplin Greige`
*   **Fabric Name / Quality**: User input for the specific name of the fabric (e.g., Poplin, Satin).
*   **Finish**: Dropdown selection (e.g., Greige, RFD, Dyed).
*   **Width**: Dropdown selection (e.g., 58", 60").
*   **Base**: Dropdown selection (e.g., Cotton, Polyester, Silk).
*   **Base Code (Auto-Generated)**:
    *   **Generation**: Derived from the selected `Base` using predefined mappings (e.g., Cotton -> COTT, Polyester -> POLY).

### Section 2: Weight & Measurement

*   **Weight (kg/mtr)**: Numeric input for the weight per linear meter.
*   **GSM**: Numeric input for Grams per Square Meter.
*   **GSM Tolerance**: Dropdown selection for acceptable GSM deviation (e.g., +/- 5%).

### Section 3: Construction Details

*   **Construction**: Dropdown selection (e.g., Plain Weave, Twill, Single Jersey).
*   **Construction Code (Auto-Generated)**:
    *   **Generation**: Derived from the selected `Construction` using predefined mappings (e.g., Plain Weave -> PL, Twill -> TW).
*   **Stretchability**: Dropdown selection (e.g., Rigid, 2 Way, 4 Way).
*   **Transparency**: Dropdown selection (e.g., Opaque, Semi Sheer, Sheer).
*   **Handfeel**: Dropdown selection (e.g., Soft, Crisp, Silky).

### Section 4: Yarn & Regulatory

*   **HSN Code**: Text input for the Harmonized System of Nomenclature code.
*   **Yarn Type**: Dropdown selection (e.g., Spun, Filament).
*   **Yarn Count**: Text input for the yarn count, combined with a unit selector (e.g., 30s, 75D).
*   **Short Code (Auto-Generated & Editable)**:
    *   **Generation**: Derived from `Base Code + Construction Code` (e.g., COTT + TW -> COTTTW).
    *   **AI Feature**: The initial Short Code is AI-generated based on the Base and Construction. However, users can edit this field to use a custom short code if needed for specific SKU generation.

---

## How to Use

### 1. Create a New Fabric Specification

1.  **Navigate**: Go to `/admin/fabric-master` and click the "+ New Spec" button, or directly navigate to `/admin/fabric/specification/new`.
2.  **Basic Information**: Fill in the "Fabric Name", select "Finish", "Width", and "Base" from the dropdowns. Observe the "Base Fabric Name" and "Base Code" auto-calculate in real-time.
3.  **Weight & Measurement**: Enter "Weight" and "GSM" values, and select "GSM Tolerance".
4.  **Construction Details**: Select "Construction", "Stretchability", "Transparency", and "Handfeel". The "Construction Code" will auto-generate.
5.  **Yarn & Regulatory**: Enter "HSN Code", select "Yarn Type", and provide "Yarn Count" with its unit.
6.  **Review**: Check the form data and the auto-generated codes.
7.  **Save**: Click "Save Specification". A success toast will appear, and you will be redirected to the Fabric Master list.

### 2. View a Fabric Specification

1.  **Navigate**: Go to `/admin/fabric-master`.
2.  **Locate Fabric**: Find the fabric you wish to view in the list.
3.  **View Action**: Click the "Eye" icon next to the fabric entry in the table.
4.  **Specification Sheet**: The `FabricSpecificationView` page will display the full details in a read-only table format.
5.  **Print/Export**: Use the "Print" button for a physical copy or "Export PDF" to save a digital version of the specification sheet.

### 3. Edit a Fabric Specification

1.  **Navigate**: From the `FabricSpecificationView` page, click the "Edit" button. Alternatively, click the "Pencil" icon next to a fabric on the `FabricMasterListPage`.
2.  **Pre-filled Form**: The `FabricSpecificationForm` will load with all existing data pre-filled.
3.  **Make Changes**: Modify any of the fields as required. Observe the real-time updates to "Base Fabric Name" and other generated codes.
4.  **Save Changes**: Click "Save Specification". A success toast will confirm the update, and you will be redirected to the Fabric Master list.
5.  **Delete (from Edit page)**: On the Edit page, there is also a "Delete Fabric" button. This will prompt a confirmation before permanently removing the fabric.

---

## Field Reference Table

| Field                 | Type           | Required | Auto-Generated | Editable | Description                                  |
| :-------------------- | :------------- | :------- | :------------- | :------- | :------------------------------------------- |
| `base_fabric_name`    | Text           | No       | Yes            | No       | Auto-calculated descriptive name             |
| `fabric_name`         | Text           | Yes      | No             | Yes      | User-defined fabric quality name             |
| `finish_type`         | Dropdown       | Yes      | No             | Yes      | Fabric's finishing stage                     |
| `width`               | Dropdown       | Yes      | No             | Yes      | Fabric's width (e.g., 58")                   |
| `base`                | Dropdown       | Yes      | No             | Yes      | Primary material type                        |
| `base_code`           | Text           | No       | Yes            | No       | 2-4 letter code for Base                     |
| `weight`              | Numeric        | No       | No             | Yes      | Weight per linear meter (kg)                 |
| `gsm`                 | Numeric        | No       | No             | Yes      | Grams per Square Meter                       |
| `gsm_tolerance`       | Dropdown       | No       | No             | Yes      | Allowed GSM variation                        |
| `construction`        | Dropdown       | No       | No             | Yes      | Weave/knit structure                         |
| `construction_code`   | Text           | No       | Yes            | No       | 2-3 letter code for Construction             |
| `stretchability`      | Dropdown       | No       | No             | Yes      | Fabric's stretch characteristic              |
| `transparency`        | Dropdown       | No       | No             | Yes      | How much light passes through                |
| `handfeel`            | Dropdown       | No       | No             | Yes      | Tactile sensation of the fabric              |
| `hsn_code`            | Text           | No       | No             | Yes      | Harmonized System code                       |
| `yarn_type`           | Dropdown       | No       | No             | Yes      | Type of yarn used                            |
| `yarn_count`          | Text + Dropdown| No       | No             | Yes      | Fineness/thickness of yarn + unit            |
| `sku`                 | Text           | No       | Yes            | No       | Auto-generated unique identifier             |
| `short_code`          | Text           | No       | Yes            | Yes      | `Base Code + Construction Code` (editable)   |

---

## Testing Checklist

### Create Operation (`/admin/fabric/specification/new`)
*   [x] Form loads correctly with default values.
*   [x] All required fields (Fabric Name, Finish, Width, Base) prevent submission if empty.
*   [x] "Base Fabric Name", "Base Code", "Construction Code", "Short Code", and "SKU" auto-calculate correctly as inputs change.
*   [x] Numeric fields (Weight, GSM) accept only valid numbers.
*   [x] HSN Code accepts alphanumeric input.
*   [x] "Save Specification" button creates a new fabric and redirects to the list page.
*   [x] "Cancel" button redirects to the list page without saving.
*   [x] Success and error toast notifications display correctly.

### View Operation (`/admin/fabric/specification/:id`)
*   [x] Page loads fabric data correctly based on ID in URL.
*   [x] All fabric details display in the `FabricSpecificationTable` component.
*   [x] Page header displays correct title and breadcrumbs.
*   [x] "Edit" button navigates to the edit form for the current fabric.
*   [x] "Print" button triggers browser print functionality.
*   [x] "Export PDF" button downloads a PDF of the specification sheet.
*   [x] Responsiveness: Table scrolls horizontally on smaller screens.
*   [x] Loading spinner displays during data fetch.

### Edit Operation (`/admin/fabric-master/:id/edit`)
*   [x] Form loads with existing fabric data pre-filled.
*   [x] All fields are editable.
*   [x] Auto-calculated fields (Base Fabric Name, Codes, SKU) update in real-time upon changing relevant inputs.
*   [x] "Save Specification" button updates the existing fabric and redirects.
*   [x] "Delete Fabric" button shows a confirmation dialog and deletes the fabric upon confirmation.
*   [x] Success and error toast notifications display correctly.

---

## Implementation Complete

The Fabric Specification System is a robust addition to the Fabric Master module, providing detailed and accurate data management for all fabric properties.

---

## Support

For any issues, questions, or feature requests, please refer to the [Troubleshooting Guide](FABRIC_SPECIFICATION_TROUBLESHOOTING.md) or contact the support team.