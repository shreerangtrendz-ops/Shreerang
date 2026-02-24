# Performance Checklist

- [ ] **Lazy Loading**: Verify that heavy admin pages (Dashboards, Reports) are lazy-loaded.
- [ ] **Image Optimization**: Ensure images displayed in lists are using the thumbnail/compressed version.
- [ ] **Pagination**: Check that lists with >100 items (Fabric List, Order List) implement pagination.
- [ ] **Query Optimization**: Verify Supabase queries select only specific fields (`.select('id, name')`) instead of `*` where possible.