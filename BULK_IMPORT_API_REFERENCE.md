# Bulk Import API Reference

This document details the internal services used by the Bulk Import system.

## BulkImportService

Location: `src/services/BulkImportService.js`

### Methods

#### `parseExcelFile(file)`
Parses a raw Excel/CSV file into a JSON array.
*   **Params**: `file` (File Object)
*   **Returns**: `Promise<Array<Object>>`
*   **Example**: `const data = await parseExcelFile(fileInput.files[0]);`

#### `validateBaseFabricData(data)`
Validates an array of base fabric objects against business rules.
*   **Params**: `data` (Array)
*   **Returns**: `{ valid: boolean, errors: [], warnings: [] }`
*   **Checks**: Required fields, Allowed Values (Base, Width, Finish).

#### `validateFinishFabricData(data)`
Validates finish fabric data, including database checks for parent SKUs.
*   **Params**: `data` (Array)
*   **Returns**: `Promise<{ valid: boolean, errors: [], warnings: [] }>`
*   **Note**: Performs a batch query to `base_fabrics` to verify SKUs.

#### `importBaseFabrics(data)`
Batch inserts base fabrics into Supabase.
*   **Params**: `data` (Array)
*   **Returns**: `Promise<{ success: number, failed: number, errors: [] }>`
*   **Logic**: Generates SKUs and Short Codes before insertion.

## BulkImportTemplateService

Location: `src/services/BulkImportTemplateService.js`

#### `downloadTemplate(type)`
Generates and triggers download of an Excel template.
*   **Params**: `type` ('base' | 'finish' | 'fancy')
*   **Returns**: `void` (Triggers browser download)

## Error Codes Reference

| Code | Message | Meaning |
| :--- | :--- | :--- |
| `ERR_REQ` | "Required field is missing" | Field is empty/null. |
| `ERR_VAL` | "Invalid Value" | Value not in allowed dropdown list. |
| `ERR_SKU` | "SKU not found" | Parent SKU does not exist in DB. |
| `ERR_DUP` | "Duplicate SKU" | Generated SKU conflicts with existing one. |
| `ERR_DB` | "Database Error" | Supabase constraint violation or connection issue. |

## Rate Limiting & Batching
*   **Client-Side**: No explicit rate limit, but browser memory limits apply.
*   **Database**: Supabase may timeout on large payloads.
*   **Recommendation**: Batch size of **500 items** per request is optimal.