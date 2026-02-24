# Database Schema Documentation

## Core Tables

### `base_fabrics`
Defines raw materials.
*   `id`: UUID (PK)
*   `base_fabric_name`: Text (Unique)
*   `width`: Text (e.g., 44")
*   `gsm`: Numeric
*   `alias_names`: JSONB (Array of strings)

### `finish_fabrics`
Processed fabrics derived from base.
*   `id`: UUID (PK)
*   `base_fabric_id`: UUID (FK -> base_fabrics)
*   `process`: Text (Printed, Dyed)
*   `finish_fabric_name`: Text (Auto-generated)
*   `design_numbers`: JSONB (Legacy array)

### `finish_fabric_designs`
Individual SKU-level designs.
*   `id`: UUID (PK)
*   `finish_fabric_id`: UUID (FK)
*   `design_number`: Text (Indexed)
*   `design_photo_url`: Text
*   `status`: Text (active/inactive)

### `design_sets` (Combo Packs)
*   `id`: UUID (PK)
*   `master_design_number`: Text (e.g., 5001-5002)
*   `type`: Text (2-Pc Set, etc.)
*   `set_photo_url`: Text

### `sales_orders`
*   `id`: UUID (PK)
*   `order_no`: Text (Unique)
*   `customer_id`: UUID (FK)
*   `items`: JSONB (Snapshot of ordered items)
*   `status`: Text (Draft, Confirmed, etc.)

## RLS Policies
*   **Public Read**: `finish_fabric_designs` (for catalog browsing).
*   **Admin Write**: All Master tables.
*   **Authenticated Read**: All Master tables.