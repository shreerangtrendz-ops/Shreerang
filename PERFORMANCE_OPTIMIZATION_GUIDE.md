# Performance Optimization Guide

## Frontend
1.  **Lazy Loading**: Route-based code splitting is implemented in `App.jsx`.
2.  **Image Optimization**: Use Supabase Image Transformations (Resizing) in `ImageUpload.jsx`.
3.  **Debouncing**: Search inputs in Dashboards are debounced to reduce DB hits.

## Database
1.  **Indexing**: `design_number` and `order_number` columns are indexed for fast lookups.
2.  **Query Selection**: Only select required columns (`.select('id, name')`) instead of `select('*')` where possible.
3.  **Pagination**: implemented in all list views (default 20 items).