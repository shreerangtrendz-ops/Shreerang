# API Documentation

## Authentication
All API requests are handled via Supabase Client in the frontend. RLS (Row Level Security) policies enforce permissions.
-   **Auth Header**: Handled automatically by `supabase-js`.
-   **Role**: `admin` role required for write operations.

## Endpoints

### Fabric Master
*Managed via `fabric_master` table*

-   **GET /fabrics**
    -   Fetch all fabrics.
    -   Filter: `type` (base, fancy_base, finish, fancy_finish)
-   **POST /fabrics**
    -   Create new fabric.
    -   Body: `{ name, sku, type, base_fabric_details, ... }`

### Pricing
*Managed via `fabric_prices`, `job_prices`, `va_prices`*

-   **GET /prices/fabric**
    -   Get history.
    -   Query: `?fabric_id=UUID`
-   **POST /prices/fabric**
    -   Add new price.
    -   Body: `{ fabric_master_id, price, effective_date }`

### Design Upload (Bunny.net Integration)
*Client-side direct upload via Service*

-   **PUT https://storage.bunnycdn.com/{Zone}/{Path}/{File}**
    -   Headers: `AccessKey: [KEY]`
    -   Body: Binary File Data

### WhatsApp
*Meta Cloud API*

-   **POST /v17.0/{PhoneID}/messages**
    -   Send template message.
    -   Body: `{ to, template: { name: "fabric_update", ... } }`

## Error Codes
| Code | Description |
| :--- | :--- |
| `23505` | Unique constraint violation (e.g., duplicate SKU) |
| `23503` | Foreign key violation (e.g., invalid Fabric ID) |
| `42501` | RLS Policy Violation (Insufficient permissions) |

## Rate Limiting
-   **WhatsApp**: 1000 conversations/month (free tier limits apply based on Meta account).
-   **Bunny.net**: Based on bandwidth quota.