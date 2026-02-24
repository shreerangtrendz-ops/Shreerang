# Bulk Import Security Guide

## Data Validation & Sanitization
*   **Client-Side**: All inputs are sanitized. HTML tags are stripped.
*   **Type Checking**: Numeric fields enforce number types to prevent injection.
*   **Allow-Lists**: Dropdowns (Base, Finish) only accept specific pre-defined values.

## SQL Injection Prevention
*   We use **Supabase (PostgreSQL)** client libraries.
*   Data is passed as parameterized JSON/Objects, never raw SQL strings.
*   This neutralizes standard SQL injection attacks.

## Access Control
*   **RLS (Row Level Security)**:
    *   Only authenticated users with `admin` or `manager` roles can insert data.
    *   Standard users cannot access the Import API endpoints.
*   **Audit**: `created_by` field tracks the uploader identity.

## File Security
*   **Parsing**: Files are parsed in the browser sandbox.
*   **Upload**: Raw Excel files are NOT stored on the server (unless configured for debug). Only processed data is sent.
*   **Extensions**: Only `.xlsx` and `.csv` are allowed. `.exe`, `.js`, `.xlsm` (macros) are blocked.