# 🗄️ FABRIC MASTER DATABASE SCHEMA

This document details the schema for the `base_fabrics` table, which underpins the Fabric Master module.

---

## `base_fabrics` Table Structure

This table stores the core specifications for all base (greige) fabrics.

| Column Name        | Type                 | Description                                      | Constraints          |
| :----------------- | :------------------- | :----------------------------------------------- | :------------------- |
| `id`               | `uuid`               | Unique identifier for each fabric.               | `PRIMARY KEY`        |
| `base_fabric_name` | `text`               | Auto-generated descriptive name (e.g., "58 Cotton Greige"). | `NOT NULL`           |
| `hsn_code`         | `text`               | Harmonized System of Nomenclature code.          |                      |
| `base`             | `text`               | Main material type (e.g., "Cotton", "Polyester"). |                      |
| `width`            | `text`               | Fabric width (e.g., "58\"", "60\"").             |                      |
| `gsm`              | `numeric`            | Grams per square meter.                          |                      |
| `weight`           | `numeric`            | Weight per meter in kilograms.                   |                      |
| `yarn_count`       | `text`               | Yarn count (e.g., "30s", "75D").                 |                      |
| `construction`     | `text`               | Fabric construction type (e.g., "Plain Weave").  |                      |
| `stretchability`   | `text`               | Stretch characteristic (e.g., "None", "2-Way").  |                      |
| `transparency`     | `text`               | Transparency level (e.g., "Opaque", "Sheer").    |                      |
| `description`      | `text`               | General description of the fabric.               |                      |
| `status`           | `text`               | Current status (e.g., "active", "inactive").     |                      |
| `created_at`       | `timestamp with time zone` | Timestamp when the record was created.           | `DEFAULT now()`      |
| `updated_at`       | `timestamp with time zone` | Last update timestamp. Updated by trigger.       |                      |
| `created_by`       | `uuid`               | User who created the record.                     |                      |
| `alias_names`      | `jsonb`              | JSON array of alternative names.                 |                      |
| `is_starred`       | `boolean`            | Indicates if the fabric is starred.              |                      |
| `starred_at`       | `timestamp with time zone` | Timestamp when starred.                          |                      |
| `supplier_id`      | `uuid`               | Foreign key to `suppliers` table.                | `FOREIGN KEY`        |
| `hsn_code_description` | `text`           | Description for the HSN code.                    |                      |
| `gst_rate`         | `numeric`            | GST rate applicable to the fabric.               |                      |
| `supplier_contact` | `text`               | Supplier's contact information.                  |                      |
| `supplier_cost`    | `numeric`            | Cost from the supplier.                          |                      |
| `notes`            | `text`               | Additional notes.                                |                      |
| `ready_stock`      | `boolean`            | Is this fabric available in ready stock?         |                      |
| `out_of_stock`     | `boolean`            | Is this fabric currently out of stock?           |                      |
| `gsm_tolerance`    | `text`               | Allowed GSM deviation (e.g., "+/- 5%").          |                      |
| `construction_code` | `text`              | Auto-generated short code for construction.      |                      |
| `base_code`        | `text`               | Auto-generated short code for base material.     |                      |
| `handfeel`         | `text`               | Handfeel of the fabric.                          |                      |
| `yarn_type`        | `text`               | Type of yarn.                                    |                      |
| `finish_type`      | `text`               | Finish type (e.g., "Greige", "Dyed").            |                      |
| `sku`              | `text`               | Auto-generated Stock Keeping Unit.               | `UNIQUE` (frontend enforced) |

---

## Indexes

The following indexes are crucial for query performance, especially for filtering and searching operations on large datasets:

*   `idx_base_fabrics_base` ON `base_fabrics(base)`: Speeds up queries filtering by base material.
*   `idx_base_fabrics_width` ON `base_fabrics(width)`: Optimizes queries filtering by width.
*   `idx_base_fabrics_finish_type` ON `base_fabrics(finish_type)`: Enhances queries filtering by finish type.
*   `idx_base_fabrics_sku` ON `base_fabrics(sku)`: Critical for fast SKU lookups and ensuring uniqueness.
*   `idx_base_fabrics_created_at` ON `base_fabrics(created_at)`: Improves performance for ordering by creation date.

---

## RLS Policies (Row-Level Security)

The `base_fabrics` table implements RLS to control data access based on user roles.

*   `CREATE POLICY "Enable all access for authenticated users on base_fabrics" ON base_fabrics FOR ALL USING ((auth.role() = 'authenticated'::text))`
    *   **Description**: This policy grants authenticated users full access (SELECT, INSERT, UPDATE, DELETE) to the `base_fabrics` table. This policy is set at a broad level and further granular control is expected to be managed via application-level logic based on the `user_profiles.role` or through more specific RLS policies if needed.

---

## Relationships (Foreign Keys)

*   `FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)`: Links fabrics to their primary suppliers.
    *   **Description**: Establishes a relationship with the `suppliers` table, allowing each fabric to be associated with a supplier. This enables tracking where a base fabric is sourced from.

---

## Constraints

*   `id`: `PRIMARY KEY` ensures each fabric has a unique identifier.
*   `base_fabric_name`: `NOT NULL` ensures every fabric has a name.
*   `created_at`: `DEFAULT now()` automatically sets the creation timestamp.
*   `sku`: While not explicitly a `UNIQUE` constraint in the provided SQL, the frontend logic and indexing on `sku` are designed to enforce its uniqueness to prevent duplicate entries from the UI.

---

## Migration History

The `base_fabrics` table has undergone the following schema changes:

*   **Initial Creation**: Table `base_fabrics` was created with core fields such as `id`, `base_fabric_name`, `hsn_code`, `base`, `width`, `description`, `status`, `created_at`, `updated_at`, `created_by`, `alias_names`, `is_starred`, `starred_at`, `supplier_id`, `hsn_code_description`, `gst_rate`, `supplier_contact`, `supplier_cost`, `notes`, `ready_stock`, `out_of_stock`.
*   **2026-01-21**: Added columns to support detailed fabric specifications, SKU generation, and improved categorization:
    *   `weight` (numeric)
    *   `gsm` (numeric)
    *   `gsm_tolerance` (text)
    *   `construction` (text)
    *   `construction_code` (text)
    *   `stretchability` (text)
    *   `transparency` (text)
    *   `handfeel` (text)
    *   `yarn_type` (text)
    *   `yarn_count` (text)
    *   `base_code` (text)
    *   `finish_type` (text)
    *   `sku` (text)
*   **2026-01-21**: Added indexes for performance: `idx_base_fabrics_base`, `idx_base_fabrics_width`, `idx_base_fabrics_finish_type`, `idx_base_fabrics_sku`.