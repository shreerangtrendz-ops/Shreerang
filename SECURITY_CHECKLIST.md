# Security Checklist

- [ ] **Row Level Security (RLS)**: Verify RLS is enabled on all sensitive tables (`users`, `orders`, `financials`).
- [ ] **API Keys**: Ensure Service Role Key is NEVER used in the frontend code.
- [ ] **OAuth**: Verify Google OAuth scopes are limited to `drive.readonly` (or specific folder access).
- [ ] **Inputs**: Verify all form inputs have validation to prevent injection.
- [ ] **Access Control**: Test that a 'Viewer' role cannot access 'Settings' pages.