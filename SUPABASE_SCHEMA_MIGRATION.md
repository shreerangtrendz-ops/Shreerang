# Supabase Schema Migration Documentation

This document details the database schema changes, RLS policies, and seed data implemented for the Fabric Master system.

## 1. New Tables

### `custom_dropdown_values`
Stores all dynamic dropdown options managed by admins.
- **Fields:** `id`, `category`, `value`, `code`, `usage_count`, `created_at`, `updated_at`, `created_by`
- **Constraints:** Unique on `(category, value)`
- **RLS:** Public read, Authenticated manage (insert/update/delete)

### `fancy_base_fabrics`
Stores Fancy Base Fabrics (Base + Value Addition).
- **Fields:** `id`, `fabric_name`, `short_code`, `base_fabric_id` (FK), `width`, `base`, `process`, `value_addition`, `thread`, `concept`, `name`, `sku`
- **RLS:** Authenticated full access

### `fancy_finish_fabrics`
Stores Fancy Finish Fabrics (Finish + Value Addition + Process).
- **Fields:** `id`, `fabric_name`, `short_code`, `base_fabric_id` (FK), `width`, `base`, `process`, `value_addition`, `thread`, `concept`, `last_process`, `process_type`, `class`, `tags`, `finish_type`, `ink_type`, `name`, `sku`
- **RLS:** Authenticated full access

### `fancy_finish_fabric_processes`
Stores process history for Fancy Finish Fabrics.
- **Fields:** `id`, `fancy_finish_fabric_id` (FK), `process_order`, `process`, `process_type`, `class`, `tags`, `finish_type`, `ink_type`
- **RLS:** Authenticated full access

## 2. Updated Tables

### `base_fabrics`
Updated to include comprehensive fabric details.
- **Added/Verified Fields:** `fabric_name`, `short_code`, `process`, `gsm_tolerance`, `handfeel`, `yarn_type`, `name`, `sku`
- **RLS:** Authenticated full access

### `finish_fabrics`
Updated to link correctly with Base Fabrics.
- **Added/Verified Fields:** `base_fabric_id` (FK), `process_type`, `class`, `ink_type`, `sku`
- **RLS:** Authenticated full access

## 3. Row Level Security (RLS)

All tables have RLS enabled with the following standard policies:
- **SELECT:** Allowed for all users (public) or authenticated users depending on sensitivity.
  - `custom_dropdown_values`: Public Read
  - Fabric tables: Authenticated Read (implied by Authenticated Manage or explicit policy)
- **INSERT/UPDATE/DELETE:** Strictly limited to users with `authenticated` role.

## 4. Indexes

Performance indexes added for:
- `sku` (Unique where applicable)
- Foreign keys (`base_fabric_id`, `fancy_finish_fabric_id`)
- Filtering columns (`process`, `category`, `value_addition`, `short_code`)
- Sorting columns (`created_at`)

## 5. Seed Data

The `custom_dropdown_values` table has been populated with standard industry values for:
- Handfeel
- Construction
- Transparency
- Stretchability
- Yarn Type
- Yarn Count
- Class
- Tags
- Finish Type
- Ink Type
- Value Addition
- Thread
- Concept

## 6. Verification

A Supabase Edge Function `init-db-check` is available to verify the schema status.
- **Endpoint:** `/functions/v1/init-db-check`
- **Method:** POST or GET
- **Response:** JSON object detailing table existence status.

## 7. Troubleshooting

If you encounter "Relation does not exist" errors:
1. Ensure the migration SQL has been executed.
2. Check the `init-db-check` function response.
3. Verify RLS policies if you get "Permission denied" errors (ensure you are logged in).