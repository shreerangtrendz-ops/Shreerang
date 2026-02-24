# 🧪 FABRIC MASTER TESTING GUIDE

This comprehensive guide outlines the testing strategy for the Fabric Master module, covering various testing levels, specific test cases, and a pre-deployment checklist.

---

## 1. Unit Tests

*   **Purpose**: To verify individual functions and utility helpers in isolation.
*   **Target Files**: `src/lib/fabricMasterConstants.js`, `src/lib/fabricValidationHelpers.js`, `src/services/FabricService.js` (for non-Supabase logic).

### `fabricMasterConstants.js`
*   **Test Cases**:
    *   Verify `generateSKU()` with valid inputs returns correct SKU (e.g., `58CTPO-Greige`).
    *   Verify `generateBaseFabricName()` with valid inputs returns correct name (e.g., `58 Cotton Greige`).
    *   Verify `generateShortCode()` returns `BaseCode + ConstructionCode`.
    *   Verify `BASE_CODES` and `CONSTRUCTION_CODES` mappings are correct.

### `fabricValidationHelpers.js`
*   **Test Cases**:
    *   `validateSKUUnique()`:
        *   Returns `valid: true` for a truly unique SKU.
        *   Returns `valid: false` for an existing SKU (mock Supabase response).
        *   Returns `valid: true` for an existing SKU when `excludeId` matches.
    *   `validateFabricName()`: Returns `null` for valid names, error message for too short names.
    *   `validateWidth()`: Returns `null` for non-empty, error for empty.
    *   `validateGSM()`: Returns `null` for valid numbers/empty, error for zero/negative/non-numeric.
    *   `validateHSN()`: Returns `null` for valid HSN, error for invalid format.

---

## 2. Component Tests

*   **Purpose**: To verify individual React components render correctly and respond to interactions.
*   **Target Components**: `FabricMasterTable.jsx`, `FabricMasterFilter.jsx`, `FabricMasterBulkActions.jsx`.

### `FabricMasterTable.jsx`
*   **Test Cases**:
    *   Renders with no fabrics (empty state).
    *   Renders with a list of fabrics, all columns displayed.
    *   Clicking checkbox selects/deselects a row.
    *   "Select All" checkbox correctly selects/deselects all.
    *   `Edit` and `Delete` buttons trigger their respective handlers.
    *   Table scrolls horizontally, and sticky header/first column remain visible.

### `FabricMasterFilter.jsx`
*   **Test Cases**:
    *   Dropdowns are populated with correct options.
    *   Changing a dropdown value triggers `onFilterChange`.
    *   Typing in search input triggers `onFilterChange` (with debounce).
    *   "Clear Filters" button resets all filter inputs and triggers `onClearFilters`.
    *   Active filter count badge updates correctly.

### `FabricMasterBulkActions.jsx`
*   **Test Cases**:
    *   Renders only when `selectedIds.length > 0`.
    *   Displays correct count of selected items.
    *   "Delete" button shows confirmation dialog, then calls `FabricService.bulkDeleteFabrics` (mocked).
    *   "Export" button calls `FabricService.exportFabricsToExcel` (mocked).
    *   Progress indicator shown during bulk operations.

---

## 3. Integration Tests

*   **Purpose**: To verify how different components and services interact with each other.
*   **Scenario**: Test the full flow of `FabricMasterListPage` with mocked `FabricService`.

### `FabricMasterListPage.jsx` (with mocked FabricService)
*   **Test Cases**:
    *   Page loads, `FabricService.getAllFabrics()` is called.
    *   Filtering updates the displayed list correctly.
    *   Selecting rows enables `FabricMasterBulkActions`.
    *   Clicking "Add New Fabric" navigates to `/admin/fabric-master/new`.
    *   `handleDelete` on a row successfully calls `FabricService.deleteFabric()`.
    *   Loading, empty, and error states are rendered correctly based on `FabricService` responses.

### `BaseFabricForm.jsx` / `EditFabricForm.jsx` (with mocked Supabase)
*   **Test Cases**:
    *   Form renders all fields.
    *   Changing `Base`, `Construction`, `Width`, `Finish` updates the live SKU/Name preview.
    *   Submitting `BaseFabricForm` calls `supabase.insert()` with correct data.
    *   Submitting `EditFabricForm` calls `supabase.update()` with correct data.
    *   Validation messages appear for invalid inputs.

---

## 4. End-to-End (E2E) Tests (Manual / Automated)

*   **Purpose**: To simulate real user workflows through the UI, interacting with a live (or staging) backend.
*   **Tools**: Manual testing, or automated with Cypress/Playwright (if set up).

### Critical User Journeys
*   **Create Fabric**:
    1.  Navigate to `/admin/fabric-master/new`.
    2.  Fill in all required fields (Base, Width, Construction, Finish).
    3.  Verify live SKU/Name preview.
    4.  Submit form.
    5.  Verify success toast and redirection to list page.
    6.  Verify new fabric appears in the list.
*   **Edit Fabric**:
    1.  Navigate to `/admin/fabric-master`.
    2.  Find an existing fabric and click `Edit`.
    3.  Modify one field (e.g., GSM).
    4.  Submit form.
    5.  Verify success toast and redirection.
    6.  Verify updated value in the list.
*   **Delete Fabric**:
    1.  Navigate to `/admin/fabric-master`.
    2.  Select a fabric and click `Delete`.
    3.  Confirm deletion.
    4.  Verify success toast and fabric removal from list.
*   **Filter & Search**:
    1.  Navigate to `/admin/fabric-master`.
    2.  Apply a Base filter. Verify list changes.
    3.  Apply a Width filter. Verify list changes further.
    4.  Type a search query. Verify list updates.
    5.  Clear all filters. Verify list returns to original state.
*   **Bulk Export**:
    1.  Navigate to `/admin/fabric-master`.
    2.  Select 2-3 fabrics.
    3.  Click `Export`.
    4.  Verify an Excel file downloads and contains only the selected fabrics with correct data.
*   **Bulk Delete**:
    1.  Navigate to `/admin/fabric-master`.
    2.  Select 2-3 fabrics (ensure they are not linked to any other entities like `finish_fabrics`).
    3.  Click `Delete` from bulk actions.
    4.  Confirm.
    5.  Verify fabrics are removed and success toast shown.

---

## 5. Test Data

*   **Minimum**: 5-10 distinct fabric records covering various `Base`, `Construction`, `Width`, `Finish` combinations.
*   **Edge Cases**:
    *   Fabric with only required fields.
    *   Fabric with all optional fields filled.
    *   Fabric with numeric values at boundaries (e.g., GSM = 1).
    *   HSN codes of varying lengths (4, 6, 8 digits).
    *   Fabric linked to a `finish_fabric` (to test deletion block).

---

## 6. Test Checklist (Pre-Deployment)

*   **[ ] Create**: Successfully added new fabrics with various valid inputs.
*   **[ ] Edit**: Successfully updated fabrics, including auto-generated fields.
*   **[ ] Delete**: Single and bulk deletion works with confirmation.
*   **[ ] Filter**: All filters and search work as expected, singly and combined.
*   **[ ] Export**: Excel export downloads correct data for all/selected.
*   **[ ] Validation**: All form validations (required, numeric, HSN, unique SKU) trigger correctly.
*   **[ ] UI**: All components render without visual glitches.
*   **[ ] Responsiveness**: Module looks good on mobile, tablet, and desktop.
*   **[ ] Performance**: List page loads quickly, filtering is responsive.
*   **[ ] Errors**: User-friendly messages displayed for API errors.
*   **[ ] Permissions**: Appropriate roles can/cannot perform actions (admin can, sales cannot delete).