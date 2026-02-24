# 📸 FABRIC MASTER SCREENSHOTS GUIDE

This guide provides a visual overview of the Fabric Master module, highlighting key UI elements and their functions.

---

## 1. List Page (`/admin/fabric-master`)

**Description**: This is the main dashboard for managing fabrics. It displays all fabrics, grouped by their Base material.

![Fabric Master List Page](https://horizons-cdn.hostinger.com/3e6f7609-d358-45de-baf5-ac38cd562a97/69e9af601b3a7c9e3666fdb3e44a88a7.png)

*   **Header**: "Fabric Master" title with "Export All" and "Add New Fabric" buttons.
*   **Filter Panel (Top)**: Search bar for SKU/Fabric Name, dropdowns for Base, Finish, Width. Includes a "Clear" button.
*   **Bulk Actions Toolbar (Floating)**: Appears when rows are selected, showing "X selected", "Export", "Delete" buttons.
*   **Grouped Sections**: Each collapsible section represents a unique Base material (e.g., "Cotton", "Polyester").
*   **Table Layout**:
    *   **Columns**: Displays 18 detailed fabric attributes (SKU, Fabric Name, Short Code, Finish, Width, Base, Base Code, Weight, GSM, GSM Tolerance, Construction, Const Code, Stretch, Transparency, Handfeel, HSN, Yarn Type, Yarn Count, Actions).
    *   **Sticky Header/Column**: The table header and the "SKU" column remain visible while scrolling.
    *   **Row Selection**: Checkboxes for selecting individual or all visible rows.
    *   **Actions**: Edit (pencil icon) and Delete (trash icon) buttons per row.
*   **Pagination (Bottom)**: (Implicitly handled by grouped view, but future enhancement for flat list).

---

## 2. Create Fabric Form (`/admin/fabric-master/new`)

**Description**: Used to input new fabric specifications.

*   **Header**: "Add New Fabric" title.
*   **Live Preview Card (Top)**: Shows auto-generated "SKU" and "Fabric Name" as you fill the form.
*   **Form Fields**: Organized into "Core Specifications", "Technical Specs", and "Quality & Feel" sections. Includes various dropdowns, text inputs, and numeric inputs.
*   **Form Actions (Bottom)**: "Cancel" and "Save Fabric" buttons.

---

## 3. Edit Fabric Form (`/admin/fabric-master/:id/edit`)

**Description**: Used to modify details of an existing fabric.

*   **Header**: "Edit Fabric" title with a "Delete Fabric" button.
*   **SKU & Timestamps (Top)**: Displays the fabric's SKU, creation date, and last updated date.
*   **Pre-filled Fields**: All fields are pre-populated with the fabric's current data.
*   **Form Actions (Bottom)**: "Cancel" and "Update Fabric" buttons.

---

## 4. Filter Panel (Contextual - part of List Page)

**Description**: The filter section helps narrow down the list of fabrics.

*   **Search Input**: A text box to type in partial SKUs or Fabric Names.
*   **Dropdown Filters**: Select specific values for Base, Finish, and Width.
*   **Active Filter Count**: A badge indicating how many filters are currently applied.
*   **Clear All Button**: Resets all filters to their default state.

---

## 5. Bulk Actions Toolbar (Contextual - part of List Page)

**Description**: Appears when one or more fabric rows are selected.

*   **Selected Count**: Displays "X selected" badge.
*   **Action Buttons**: "Export" (for selected items) and "Delete" (for selected items).
*   **Confirmation Dialogs**: Prompt before destructive actions like deletion.