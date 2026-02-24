# Fabric Master Test Checklist

## 1. Component Verification
- [ ] **FabricMasterForm** loads without crashing.
- [ ] **FabricImageSelector** displays 7 images.
- [ ] **SKUPreview** appears on the right (desktop) or bottom (mobile).
- [ ] No console errors on load.

## 2. Image Selection Test
- [ ] Click "60 x 60 Cotton".
- [ ] Verify **Fabric Name** becomes "60 x 60 Cotton".
- [ ] Verify **Base** becomes "Cotton".
- [ ] Verify card has blue border and checkmark.

## 3. Dynamic Updates Test
- [ ] Select Width "58".
- [ ] Verify **SKU Preview** updates to start with "58-".
- [ ] Change **Finish** to "RFD".
- [ ] Verify **SKU Preview** ends with "-RFD".

## 4. Validation Test
- [ ] Refresh page (clear form).
- [ ] Click **Submit** empty form.
- [ ] Verify error message "Fabric Name is required".
- [ ] Verify error message "Width is required".
- [ ] Verify Submit button does not trigger API.

## 5. Submission Test
- [ ] Select "Poly Crepe".
- [ ] Select Width "44".
- [ ] Click **Submit**.
- [ ] Verify "Success" toast appears.
- [ ] Verify form clears.

## 6. Responsive Test
- [ ] Resize browser to mobile width (< 768px).
- [ ] Verify Images stack in 1 column.
- [ ] Verify SKU Preview moves to bottom or stays accessible.

## 7. Edge Cases
- [ ] Enter very long fabric name. Verify SKU handles it (truncates or uses short code).
- [ ] Rapidly click different images. Verify form updates correctly without lag.

## 8. Performance
- [ ] Verify no noticeable lag when typing in input fields.