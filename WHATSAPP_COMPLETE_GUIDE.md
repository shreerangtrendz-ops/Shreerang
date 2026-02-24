# Complete WhatsApp Bot Integration Guide

This guide covers the entire setup for your WhatsApp Bot with n8n workflow, Telegram notification, and Admin Dashboard integration.

## 1. System Overview
*   **Webhook Listener**: n8n listens for incoming WhatsApp messages via `whatsapp-webhook` node.
*   **Intent Detection**: Messages are parsed for keywords ("show", "order", "status").
*   **Database**: Supabase PostgreSQL is queried for designs, orders, and logs.
*   **Admin Notifications**: Order requests are sent to a private Telegram channel.
*   **Customer Response**: WhatsApp messages are sent back via Meta Cloud API.

## 2. Setup Prerequisites
*   Supabase Project (Database URL, Credentials).
*   Meta for Developers Account (WhatsApp Cloud API).
*   Telegram Account (Bot Token).
*   n8n Instance (Self-hosted or Cloud).

## 3. Deployment Steps
1.  **Configure WhatsApp**: Set up your app in Meta Dashboard and get the Phone Number ID & Access Token.
2.  **Configure Telegram**: Create a bot with @BotFather and get the Token. Get your Chat ID.
3.  **Setup n8n**:
    *   Install n8n (see `N8nInstallationGuide.md`).
    *   Import `n8n-whatsapp-bot-workflow.json`.
    *   Set up Credentials for "Supabase DB", "Telegram", and "Meta API".
4.  **Admin Panel**:
    *   Go to **Settings > WhatsApp** in your admin panel.
    *   Enter your Phone ID, Business Account ID, and Access Token (for local reference/future API use).
    *   Set your Webhook Verify Token to match the one in n8n/Meta Dashboard.

## 4. Testing the Bot
1.  **Inquiry**: Send "Show Rayon designs" to your bot number. You should receive images.
2.  **Order**: Send "Order D101 100 meters".
    *   Check your Telegram: You should get a notification with "Approve" button.
    *   Click "Approve".
    *   Check WhatsApp: You should get a price quote.
    *   Reply "Yes".
    *   Check WhatsApp: Order Confirmation received.
    *   Check Admin Dashboard > Sales Orders: New order should appear with "WhatsApp" source.

## 5. Troubleshooting
*   **No response on WhatsApp**: Check n8n Executions log. Ensure Webhook is Active in Meta Dashboard.
*   **Database Error**: Ensure Supabase IP is allowing connections or "Allow all IPs" is enabled in Supabase settings.
*   **Telegram Error**: Verify Chat ID is correct (it's a number, sometimes negative for groups).

## 6. Next Steps
*   Enable **System User** token in Meta to avoid token expiration every 24 hours.
*   Set up SSL for your n8n instance for secure webhook delivery.