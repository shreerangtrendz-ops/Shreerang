# Bulk Import Test Cases

## TC-01: Successful Base Fabric Import
*   **Input**: Excel file with 5 valid Base Fabric rows.
*   **Action**: Upload -> Import.
*   **Expected**: 5 items created. 0 Failed. Success toast appears.

## TC-02: Successful Finish Fabric Import
*   **Pre-req**: Base fabrics from TC-01 exist.
*   **Input**: Excel file with 5 rows referencing SKUs from TC-01.
*   **Action**: Upload -> Import.
*   **Expected**: 5 items created. Hierarchy linked correctly.

## TC-03: Validation Error (Missing Field)
*   **Input**: Row with empty "Width".
*   **Action**: Upload -> Validate.
*   **Expected**: Error shown "Width is required". Import button disabled.

## TC-04: Duplicate SKU Detection
*   **Input**: File containing a row that is identical to TC-01 data.
*   **Action**: Upload -> Validate.
*   **Expected**: Error "Duplicate SKU". System prevents duplicate creation.

## TC-05: Invalid Dropdown Value
*   **Input**: Row with Base="Plastic" (Invalid).
*   **Action**: Upload -> Validate.
*   **Expected**: Error "Invalid Base". Tooltip shows allowed values.

## TC-06: Column Mapping
*   **Input**: Excel file with header "Material Name" instead of "Fabric Name".
*   **Action**: Upload -> Map "Material Name" to "Fabric Name".
*   **Expected**: Validation passes. Data maps correctly.

## TC-07: Retry Failed Items
*   **Input**: File with 3 valid, 2 invalid rows.
*   **Action**: Import.
*   **Expected**: 3 Success, 2 Failed. "Download Error Report" button appears.

## TC-08: Large Batch (1000 items)
*   **Input**: File with 1000 valid rows.
*   **Action**: Import.
*   **Expected**: Progress bar updates smoothly. Completion < 1 minute.