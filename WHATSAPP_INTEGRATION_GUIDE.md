# WhatsApp Integration Guide

## Prerequisites
- Meta Business Account
- WhatsApp Business Phone Number (not linked to a mobile app)
- Permanent Access Token

## Setup Steps
1. Go to **Admin > Marketing > WhatsApp**.
2. Click **Setup Integration**.
3. **Credentials**: Enter your Business ID, Phone ID, and Access Token from the Meta App Dashboard.
4. **Webhook**: Copy the provided Webhook URL and paste it into Meta App Dashboard > WhatsApp > Configuration.
5. **Verify**: Click "Verify" to ensure the token matches.
6. **Test**: Send a test message to your personal number.

## Sending Messages
- **Broadcast**: Go to Marketing > Broadcast to send messages to groups.
- **Templates**: WhatsApp requires template approval for initiating conversations. Create templates in the dashboard and wait for Meta approval (usually 1-2 mins).
- **Session Messages**: You can send free-text messages only if the user has messaged you within the last 24 hours.

## Troubleshooting
- **"Message Failed"**: Check if the template name matches exactly. Check if you have enough credit in your Meta account.
- **"Webhook Error"**: Ensure the Verify Token matches exactly what you entered in Meta.