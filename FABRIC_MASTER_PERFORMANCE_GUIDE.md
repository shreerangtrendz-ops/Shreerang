# ⚡ Fabric Master Performance Guide

## 1. Database Optimization
*   **Indexing**: The `base_fabrics` table has indexes on `sku`, `base`, `finish_type`, and `width`. These cover the most common filter queries.
*   **Selectivity**: The API only selects necessary columns. Avoid `SELECT *` in custom queries if the table grows very wide.

## 2. Frontend Optimization
*   **Virtualization**: The list view uses grouped rendering. For lists >1000 items, consider implementing `react-window` for row virtualization.
*   **Debouncing**: The search bar has a 300ms debounce to prevent API spamming while typing.
*   **Memoization**: Filter components are memoized to prevent re-renders when the main table updates.

## 3. Caching Strategy
*   **React Query / State**: The `FabricMasterListPage` currently fetches on mount.
*   **Improvement**: Implementing `TanStack Query` (React Query) would allow caching the fabric list for 5-10 minutes, making navigation back to the list instant.

## 4. Monitoring
*   **Console Timing**: Check the Network tab. The `/rest/v1/base_fabrics` request should complete in <200ms.
*   **Bundle Size**: Ensure `xlsx` library is lazy-loaded if possible (currently imported directly, which is acceptable for an Admin panel).