# Comprehensive Testing Checklist

This document serves as a guide for verifying the stability and functionality of the Shreerang Trendz application.

## 1. Automated Checks & Validation

- [ ] **Array Safety**: Ensure all list renderings use `ensureArray()` utility.
- [ ] **Error Boundaries**: Verify `DataErrorBoundary` catches component crashes without breaking the app.
- [ ] **Console Logs**: Check browser console for "uncaught exception" or "unhandled rejection" logs (handled by `ErrorLogger`).
- [ ] **Loading States**: Verify loading spinners appear during data fetches.

## 2. Core Modules Testing

### A. Purchase Orders (`/admin/purchase-orders`)
- [ ] **Load**: Page loads without error.
- [ ] **Empty State**: Displays "No orders found" when empty.
- [ ] **Create**: Can create a new PO with multiple items.
- [ ] **Validation**: Cannot create PO without supplier or items.
- [ ] **Render**: Items list renders correctly in table.

### B. Job Management (`/admin/job-management`)
- [ ] **Load**: Page loads without error.
- [ ] **List**: Jobs appear in table.
- [ ] **Create**: Can create a new job.
- [ ] **Validation**: Required fields checked.

### C. Supplier & People Management (`/admin/suppliers`, `/admin/jobwork-units`)
- [ ] **Load**: Pages load.
- [ ] **CRUD**: Can Add, Edit, and Delete entities.
- [ ] **Search**: Filtering works correctly.

### D. Fabric Master (`/admin/fabric-master`)
- [ ] **Load**: Page loads.
- [ ] **Tabs**: Switching between Base/Finish/Fancy works.
- [ ] **Actions**: Edit and Delete buttons function.

## 3. Customer/Frontend Testing

### A. Shop & Product
- [ ] **Catalog**: `/shop` loads products.
- [ ] **Filters**: Category and Price filters update list.
- [ ] **Detail**: Product detail page loads images and info.
- [ ] **Cart**: "Add to Cart" updates cart count.

### B. Checkout
- [ ] **Flow**: Cart -> Checkout -> Success.
- [ ] **Validation**: Form fields require input.
- [ ] **Calculation**: Totals are correct.

## 4. Error Scenarios

- [ ] **Network Failure**: Simulate offline mode (DevTools -> Network -> Offline). App should show error boundary or toast.
- [ ] **API Error**: If API returns 500, app should handle gracefully.
- [ ] **Empty Data**: Verify UI components handle `null`/`undefined` props safely.

## 5. Performance

- [ ] **Lazy Loading**: Verify images are lazy loaded.
- [ ] **Bundle Size**: Check network tab for large chunks.
- [ ] **Response Time**: Dashboard charts load within 2 seconds.

## 6. Security

- [ ] **Protected Routes**: `/admin` redirects to login if not authenticated.
- [ ] **Role Access**: Customer cannot access admin routes.