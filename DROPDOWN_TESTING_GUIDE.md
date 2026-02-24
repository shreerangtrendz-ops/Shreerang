# Dropdown & Data Loading Testing Guide

This guide outlines how to verify the robust data loading mechanisms implemented for the Fabric Master forms.

## 1. Developer Tools
We have included a `DropdownDebugger` component in the forms. This component is visible in development mode and provides:
- **Loading State**: Visual indicator (YELLOW = Loading, GREEN = Idle).
- **Option Count**: Number of items successfully loaded.
- **Value State**: Current selected value ID.
- **Error State**: Any error messages returned from the API.

## 2. Verification Steps

### Base Fabric Form
1. Navigate to `Fabric Master` -> `Base Fabric` -> `Add New`.
2. Observe the **Supplier** dropdown.
   - It should briefly show a loading spinner.
   - Once loaded, click to see the list of suppliers.
   - Verify specific supplier names appear (e.g., "Supplier A (Surat)").
3. Select a supplier and ensure the value is retained.

### Finish Fabric Form
1. Navigate to `Fabric Master` -> `Finish Fabric` -> `Add New`.
2. Observe **Base Fabric**, **Supplier**, and **Job Worker** dropdowns.
3. Verify **Base Fabric** loads data from the `base_fabrics` table.
4. Select a Base Fabric and verify the "Auto-Generated Name" updates.

### Fancy Finish Form
1. Navigate to `Fabric Master` -> `Fancy Finish` -> `Add New`.
2. Check that **Finish Fabric** dropdown loads correctly.
3. Verify that selecting a parent Finish Fabric updates the name generation logic.

## 3. Error Handling Test
To simulate an error:
1. (Dev only) Temporarily corrupt the table name in `DataLoadingService.js`.
2. Reload the page.
3. You should see a red error box below the dropdown: "Failed to load...".
4. A "Retry" button should appear.
5. Fix the code and click Retry to verify recovery.

## 4. Common Issues & Fixes
| Symptom | Probable Cause | Fix |
|---------|---------------|-----|
| Dropdown spins forever | Network timeout or unhandled promise | Check console logs for "Fetch error" |
| "No options found" | Empty database table | Add dummy data to Suppliers/Fabrics tables |
| Label says "undefined" | Field mapping mismatch | Check `DataLoadingService` mapping (label vs name) |