# Supabase Database Configuration for n8n

Since this project uses Supabase (PostgreSQL), configure n8n to connect directly to the database.

## Node Settings
*   **Node Type**: PostgreSQL
*   **Host**: `db.projectref.supabase.co` (Found in Supabase Settings > Database > Connection info)
*   **Database**: `postgres`
*   **User**: `postgres`
*   **Password**: [Your Database Password]
*   **Port**: `5432`
*   **SSL**: On (Allow Unauthorized Certificates if needed for testing, usually strict is fine)

## Sample Queries

**Fetch Active Designs:**