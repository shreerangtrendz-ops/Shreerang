# Security Best Practices

## 1. Token Management
*   **Never** hardcode tokens in the codebase. Use Environment Variables or Supabase Secrets.
*   Use a **System User** in Meta Business Manager for long-lived tokens, not your personal user token.
*   Rotate Telegram Bot tokens periodically.

## 2. Webhook Security
*   Validate the `X-Hub-Signature` header in n8n to ensure requests come from Meta.
*   Use a complex `Verify Token` string.

## 3. Data Privacy
*   Do not log sensitive customer PII in n8n execution logs (disable "Save Execution Data" for production workflows).
*   Ensure Supabase RLS policies are strict; the bot should use a specific service role, not `anon`.

## 4. Access Control
*   Restrict n8n access with Basic Auth or behind a VPN.
*   Restrict Supabase database access to specific IPs (your VPS IP).