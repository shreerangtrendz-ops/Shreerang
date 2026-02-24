# Troubleshooting Guide

## Webhook Issues
**Symptom**: n8n doesn't trigger when message is sent.
*   **Check**: Is the Webhook URL reachable from the internet? (Not localhost).
*   **Check**: Did you click "Verify and Save" in Meta Dashboard?
*   **Check**: Is the `Verify Token` matching in both n8n and Meta?

## Database Errors
**Symptom**: "Get Designs" node fails.
*   **Check**: Supabase connection credentials in n8n.
*   **Check**: Does the table `finish_fabric_designs` exist?
*   **Check**: Is RLS policy blocking the `postgres` user? (Unlikely, but check).

## Sending Fails
**Symptom**: Customer doesn't receive reply.
*   **Check**: Is the 24-hour support window active? (Business cannot initiate conversation after 24h of last user message without a template).
*   **Check**: Is the Access Token valid? (Temporary tokens expire in 24h).
*   **Check**: n8n HTTP Request node logs for error codes (e.g., 400 Bad Request).

## Telegram Silence
**Symptom**: Admin doesn't get notification.
*   **Check**: Is the Chat ID correct? (Group IDs start with `-`).
*   **Check**: Did you start the bot first?