# 📚 Fabric Master API Reference

All methods are available via `FabricService` in `@/services/FabricService`.

## Methods

### `getAllFabrics()`
Fetches all active fabrics sorted by creation date (newest first).
*   **Returns**: `Promise<Fabric[]>`
*   **Error**: Throws Supabase error if fetch fails.

### `getFabricsByBase(base: string)`
Fetches fabrics filtered by a specific base material.
*   **Params**: `base` (e.g., 'Cotton')
*   **Returns**: `Promise<Fabric[]>`

### `searchFabrics(query: string)`
Performs a case-insensitive partial match on `sku` or `base_fabric_name`.
*   **Params**: `query` (e.g., '58 cotton')
*   **Returns**: `Promise<Fabric[]>`

### `createFabric(data: object)`
Inserts a new fabric record.
*   **Params**: Object containing valid fabric fields.
*   **Returns**: `Promise<Fabric>` (The created record)

### `updateFabric(id: string, data: object)`
Updates specific fields of an existing fabric.
*   **Params**: `id` (UUID), `data` (Partial object)
*   **Returns**: `Promise<Fabric>`

### `deleteFabric(id: string)`
Soft deletes or hard deletes a fabric depending on configuration (currently Hard Delete).
*   **Params**: `id` (UUID)
*   **Returns**: `Promise<boolean>`

### `exportFabricsToExcel(fabrics: Fabric[], filename?: string)`
Generates and downloads an .xlsx file in the browser.
*   **Params**: 
    *   `fabrics`: Array of fabric objects
    *   `filename`: Optional (default: 'Fabrics_Export.xlsx')
*   **Returns**: `void`

## Data Models

### Fabric Object