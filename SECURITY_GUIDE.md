# Security Guide

## Authentication
*   **Supabase Auth**: Uses secure JWT tokens.
*   **Session**: Persisted in LocalStorage/Cookies securely.
*   **Policies**: Row Level Security (RLS) ensures users can only access data permitted by their role.

## Data Protection
*   **Inputs**: All form inputs are sanitized by React/Supabase to prevent SQL Injection.
*   **Storage**: Public buckets are read-only for anonymous users; write access requires auth.

## Best Practices
1.  **Role Management**: regularly audit users in `user_profiles` table.
2.  **Backups**: Enable Point-in-Time Recovery (PITR) in Supabase dashboard.
3.  **API Keys**: Never expose `SERVICE_ROLE_KEY` in frontend code.