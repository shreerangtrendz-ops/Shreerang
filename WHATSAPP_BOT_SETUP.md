# WhatsApp Bot Setup Guide

## 1. Meta for Developers Account
1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Create an App > Business type.
3. Add **WhatsApp** product to your app.

## 2. API Configuration
1. In `WhatsApp > API Setup`, get your:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Temporary Access Token (or configure System User for permanent token)
2. Add these to your `.env` file or Supabase Secrets:
   - `WHATSAPP_PHONE_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_VERIFY_TOKEN` (Create a random string)

## 3. Webhook Setup
1. In `WhatsApp > Configuration`, edit the **Callback URL**.
2. Point this to your backend/edge function URL (e.g. `https://your-project.supabase.co/functions/v1/whatsapp-webhook`).
3. Enter your `WHATSAPP_VERIFY_TOKEN`.
4. Subscribe to `messages` events.

## 4. Testing
1. Send a "Hello" message to the test number provided in the dashboard.
2. Check your n8n workflow or backend logs for the incoming payload.
3. Send an image to test the upload workflow.