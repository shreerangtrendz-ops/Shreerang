# WhatsApp Cloud API Setup

## 1. Meta For Developers
1. Go to [developers.facebook.com](https://developers.facebook.com/).
2. Create a new App (Type: **Business**).
3. Scroll down to **WhatsApp** and click "Set up".

## 2. API Credentials
1. In the **API Setup** panel, find:
   - **Phone Number ID**: Used in n8n HTTP Request URL.
   - **Temporary Access Token**: Good for 24h. For production, create a System User.

## 3. Webhook Configuration
1. Go to **WhatsApp > Configuration**.
2. Click **Edit** under Callback URL.
3. Enter your n8n Production Webhook URL (e.g., `https://n8n.yourdomain.com/webhook/whatsapp-webhook`).
4. Enter a **Verify Token** (random string, e.g., `fabric_secret_123`).
5. Click **Verify and Save**.
6. Click **Manage** under Webhook fields and subscribe to `messages`.

## 4. Testing
1. Add your personal phone number as a test number in the API Setup page.
2. Click "Send Message" to verify outbound.
3. Reply to that message from your phone to verify inbound webhook trigger in n8n.