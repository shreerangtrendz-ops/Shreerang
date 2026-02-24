# Fabric Master System Architecture

## Components

### Frontend (React)
*   `FabricMasterDashboard`: Main container / layout.
*   `BaseFabricDashboard`: Logic for base fabrics.
*   `FinishFabricDashboard`: Logic for finish fabrics.
*   `FancyFinishFabricDashboard`: Logic for fancy fabrics.
*   `BulkActionToolbar`: Floating UI for batch ops.
*   `AdvancedFilterPanel`: Complex query builder.

### Backend (Supabase)
*   **Tables**: `base_fabrics`, `finish_fabrics`, `fancy_finish_fabrics`.
*   **Relations**: 
    *   `base` (1) -> (N) `finish`
    *   `finish` (1) -> (N) `fancy`
*   **RLS Policies**: Enforce role-based access (Admin/Manager vs View-only).

### Data Flow
1.  **Fetch**: `useEffect` calls `supabase.from('table').select()`.
2.  **Filter**: Client-side filtering for speed (small datasets) or DB filtering (large datasets).
3.  **Mutate**: Calls to `insert`/`update`/`delete` update DB.
4.  **Refresh**: Local state updates optimistically or re-fetches.