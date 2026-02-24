# Fabric Master Technical Reference

## Database Tables

### `base_fabrics`
*   `id`: UUID (PK)
*   `base_fabric_name`: Text
*   `is_starred`: Boolean
*   `status`: Text ('active', 'inactive')

### `finish_fabrics`
*   `id`: UUID (PK)
*   `base_fabric_id`: UUID (FK -> base_fabrics)
*   `process`: Text
*   `process_type`: Text

### `fancy_finish_fabrics`
*   `id`: UUID (PK)
*   `finish_fabric_id`: UUID (FK -> finish_fabrics)
*   `value_addition_type`: Text

## API Interactions
*   All data access via `@supabase/supabase-js`.
*   Custom hook `useSupabaseAuth` manages connection.
*   `StarRatingService.js` handles toggle logic.
*   `BulkDeleteService.js` handles dependency checks.