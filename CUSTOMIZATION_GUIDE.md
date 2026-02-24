# Customization Guide

## Branding
*   **Colors**: Edit `tailwind.config.js` > `theme.extend.colors`.
*   **Logo**: Replace `/public/logo.png`.

## Form Fields
*   **Dropdowns**: Edit `src/pages/admin/fabric/BaseFabricForm.jsx` `PREDEFINED_BASE_FABRICS` array.
*   **Validation**: Modify `handleSubmit` functions in respective form files.

## Reports
*   **Exports**: Modify `src/lib/ExportService.js` to change Excel column structures.