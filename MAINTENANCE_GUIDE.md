# Maintenance Guide

## 1. Common Maintenance Tasks
*   **Adding New Images**: 
    1.  Add entry to `src/data/fabricImages.js`.
    2.  Add SVG/JPG to `public/images/fabrics/`.
*   **Updating Validation**:
    *   Edit `src/lib/validationHelpers.js` or the validation logic inside `FabricMasterForm.jsx`.
*   **Changing SKU Format**:
    *   Modify the `useEffect` logic in `FabricMasterForm.jsx`.

## 2. Troubleshooting Guide
*   **Images Broken**: Check `public/images/fabrics/` path and ensure filenames match `fabricImages.js`.
*   **Submission Fails**: Check Network tab in DevTools. If 400 error, check payload against Supabase schema.
*   **SKU Wrong**: Check `AIShortCodeGenerator` logic or the concatenation string in `FabricMasterForm`.

## 3. Performance Optimization
*   **Images**: Ensure new images added are optimized (< 50KB).
*   **Code**: Keep the SKU generation logic simple.

## 4. Security Updates
*   **Dependencies**: Regularly run `npm audit` to check for vulnerabilities in libraries like `lucide-react` or `radix-ui`.

## 5. Backup & Recovery
*   **Data**: Supabase handles database backups.
*   **Code**: Git repository is the source of truth. Ensure main branch is protected.

## 6. Documentation
*   **Updates**: Whenever the SKU format changes, update `USER_WORKFLOW_GUIDE.md` to avoid confusing staff.