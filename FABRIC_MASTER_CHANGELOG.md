# 📜 FABRIC MASTER CHANGELOG

This document tracks all significant changes, new features, and bug fixes for the Fabric Master module.

---

## Version 1.0 (Initial Release)

**Date**: 2026-01-21

### Features Implemented:
*   **Comprehensive Fabric Listing**:
    *   `FabricMasterListPage.jsx`: Displays all base fabrics.
    *   Grouped view by Base material with collapsible sections (`FabricMasterGroupedView.jsx`).
    *   Responsive table (`FabricMasterTable.jsx`) with 18 columns, sticky header/first column, pagination, and row selection.
*   **Fabric Creation & Editing**:
    *   `BaseFabricForm.jsx`: Form for creating new fabrics with auto-generated SKU, Base Fabric Name, Short Code, Base Code, and Construction Code.
    *   `EditFabricForm.jsx`: Form for modifying existing fabrics, pre-filled with data, includes update and delete actions.
    *   Real-time preview of generated SKU and Fabric Name during form entry.
*   **Filtering & Searching**:
    *   `FabricMasterFilter.jsx`: Filters by Base, Finish, Width, and a search input for SKU/Fabric Name.
    *   Clear filters button and active filter count badge.
*   **Bulk Actions**:
    *   `FabricMasterBulkActions.jsx`: Floating toolbar for selected fabrics.
    *   Bulk Delete functionality with confirmation dialog.
    *   Bulk Export to Excel (`.xlsx`) for all or selected fabrics.
*   **Data Validation**:
    *   Client-side validation for required fields, numeric inputs, HSN format, and unique SKU.
*   **Core Logic & Services**:
    *   `src/lib/fabricMasterConstants.js`: Centralized constants and generation rules.
    *   `src/lib/fabricValidationHelpers.js`: Validation functions.
    *   `src/services/FabricService.js`: CRUD, search, bulk, and export logic using Supabase.
*   **Database Schema**:
    *   `base_fabrics` table extended with all new specification columns (`weight`, `gsm`, `construction`, `stretchability`, `transparency`, `handfeel`, `yarn_type`, `yarn_count`, `hsn_code`, `gsm_tolerance`, `base_code`, `construction_code`, `finish_type`, `sku`).
    *   Indexes added on `base`, `width`, `finish_type`, `sku`, `created_at`.
*   **Routing & Navigation**:
    *   Added `/admin/fabric-master`, `/admin/fabric-master/new`, `/admin/fabric-master/:id/edit` routes in `App.jsx`.
    *   "Fabric Master" section added to `AdminLayout` sidebar with fabric count badge.
*   **User Interface & Experience**:
    *   Consistent styling with TailwindCSS and `shadcn/ui`.
    *   Loading skeletons, empty state messages, and error handling.
    *   Toast notifications for user feedback.

### Bug Fixes:
*   Addressed `BaseFabricForm` error by using `FormErrorBoundary` and safe constant access.
*   Ensured Sales Order form is visible and routable.
*   Implemented `Design Image Upload` and `Design Description Selector`.
*   Integrated `WhatsApp Inbox` and `External Integrations` (service level).

### Known Issues:
*   Bulk Import functionality is planned for a future release.
*   Advanced bulk update options (e.g., change finish for selected) are planned.
*   Dependency tracking (showing where a fabric is used) is not yet fully implemented for blocking deletions (current logic checks `finish_fabrics` only).