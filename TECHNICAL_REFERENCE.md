# Technical Reference

## Database Schema (Key Tables)

### `base_fabrics`
*   `id` (UUID, PK)
*   `name` (Text)
*   `hsn_code` (Text)
*   `gsm` (Numeric)
*   *Note: No `finish` column.*

### `finish_fabrics`
*   `id` (UUID, PK)
*   `base_fabric_id` (FK)
*   `process` (Text)
*   `finish` (Text) -- *New field location*

### `whatsapp_logs`
*   `id` (UUID, PK)
*   `recipient` (Text)
*   `template_name` (Text)
*   `status` (Enum: sent, delivered, read, failed)

## API Endpoints (Supabase)
*   All data access is via the Supabase JS Client (`@supabase/supabase-js`).
*   **Auth**: Managed via `supabase.auth`.
*   **Storage**: Managed via `supabase.storage`.