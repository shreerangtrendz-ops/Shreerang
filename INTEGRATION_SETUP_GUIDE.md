# 🔌 Integration Setup Guide

## 1. Bunny.net CDN (Images)
**Prerequisites**: Account at [bunny.net](https://bunny.net).
1.  **Storage Zone**: Create a zone named `fabric-designs`.
2.  **API Key**: Go to FTP & API Access > Copy Password.
3.  **Config**: Set `VITE_BUNNY_NET_API_KEY` to this password.
4.  **Pull Zone**: Create a linked Pull Zone and get the hostname (e.g., `my-fabric.b-cdn.net`).
5.  **Env**: Set `VITE_BUNNY_NET_CDN_URL`.

## 2. WhatsApp Business API
**Prerequisites**: Meta Business Account.
1.  **App Setup**: Create "Business" app in Meta Developers.
2.  **Product**: Add "WhatsApp".
3.  **Token**: Generate Permanent Token in Business Settings > System Users.
4.  **Env**: Fill `VITE_WHATSAPP_ACCESS_TOKEN`, `PHONE_NUMBER_ID`, `BUSINESS_ACCOUNT_ID`.
5.  **Webhook**: Configure callback URL to your deployed backend.

## 3. Google Drive (Backup)
**Prerequisites**: Google Cloud Console Project.
1.  **API**: Enable "Google Drive API".
2.  **Credentials**: Create OAuth 2.0 Client ID.
3.  **Origins**: Add `http://localhost:5173`.
4.  **Env**: Set `VITE_GOOGLE_CLIENT_ID`.

## 4. n8n (Automation)
**Prerequisites**: n8n instance.
1.  **Webhook**: Create a workflow starting with "Webhook" node.
2.  **Method**: POST.
3.  **Env**: Set `VITE_N8N_API_URL` to your n8n webhook URL.

## 5. KVM-1 (Server)
**Prerequisites**: Hosting provider API access.
1.  **Env**: Set `VITE_KVM1_API_URL` and Key.