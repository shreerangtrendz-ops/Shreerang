# System Restructure Verification Checklist

## Fabric Master Verification
- [ ] **Navigation:** "Fabric Master" menu exists with Base, Finish, and Fancy sub-items.
- [ ] **Base Fabric Form:** Verified NO "Supplier" dropdown exists.
- [ ] **Finish Fabric Form:** Verified NO "Supplier" or "Job Worker" dropdowns exist.
- [ ] **Fancy Finish Form:** Verified NO "Supplier" or "Job Worker" dropdowns exist.
- [ ] **AI Generation:** Verified "AI Generate" button populates description field.
- [ ] **Data Saving:** Created a test fabric in each category successfully.

## Supplier Management Verification
- [ ] **Navigation:** "People > Suppliers" menu item exists.
- [ ] **Dashboard:** Supplier list loads correctly.
- [ ] **Creation:** Successfully added a new Supplier with banking details.
- [ ] **Editing:** Successfully edited a Supplier's phone number.
- [ ] **Deletion:** Successfully deleted a test Supplier.
- [ ] **Export:** Verified "Export Suppliers" downloads a valid Excel file.

## Job Worker Management Verification
- [ ] **Navigation:** "People > Job Workers" menu item exists.
- [ ] **Dashboard:** Job Worker list loads correctly.
- [ ] **Creation:** Successfully added a new Worker with "Stitching" specialization.
- [ ] **Rates:** Verified Rate and Unit fields are saved correctly.
- [ ] **Export:** Verified "Export Job Workers" downloads a valid Excel file.

## Import/Export Verification
- [ ] **Navigation:** "Import/Export" menu section exists.
- [ ] **Import Page:** `/admin/import` loads the Excel Upload Page.
- [ ] **Export Page:** `/admin/export` loads the Data Export Page.
- [ ] **Functionality:** Uploaded a sample Base Fabric Excel sheet and verified data entry.

## General System Verification
- [ ] **Admin Layout:** Sidebar is collapsible and organized as per new structure.
- [ ] **Responsiveness:** Checked pages on mobile view (via browser dev tools).
- [ ] **Loading States:** Spinners appear during data fetching.
- [ ] **Error Handling:** Network disconnect test shows error toasts.

**Status:** [ ] READY FOR PRODUCTION