# Database Schema Documentation

## Core Tables

### `base_fabrics`
Stores raw material specifications.
- `id` (uuid, pk)
- `base_fabric_name` (text)
- `width`, `gsm`, `weight` (text/numeric)
- `alias_names` (jsonb array)
- `created_at` (timestamp)

### `finish_fabrics`
Processed versions of base fabrics.
- `id` (uuid, pk)
- `base_fabric_id` (fk -> base_fabrics)
- `finish_fabric_name` (text)
- `process` (text: 'Printed', 'Dyed')
- `design_numbers` (jsonb array)

### `finish_fabric_designs`
Individual design items/SKUs.
- `id` (uuid, pk)
- `finish_fabric_id` (fk -> finish_fabrics)
- `design_number` (text, unique per fabric)
- `design_photo_url` (text)
- `status` (text: 'active', 'inactive')

### `suppliers`
External vendors.
- `id` (uuid, pk)
- `supplier_name` (text)
- `contact_person`, `phone`, `gst_number` (text)
- `bank_details` (jsonb/text)

### `base_fabric_suppliers`
Junction table for Many-to-Many relationship.
- `id` (uuid, pk)
- `base_fabric_id` (fk)
- `supplier_id` (fk)

## Relationships
- **One Base Fabric** has **Many Finish Fabrics**.
- **One Finish Fabric** has **Many Designs**.
- **One Supplier** supplies **Many Fabrics**.
- **One Fabric** can have **Many Suppliers** (via junction table).