# Project Setup Guide

## Overview
This system is a comprehensive Fabric Management ERP featuring:
*   **WhatsApp Inbox**: Integrated two-way communication for customer orders.
*   **Design Upload System**: Drag-and-drop design management linked to Bunny.net CDN.
*   **Sales Order Management**: Complete order lifecycle tracking.
*   **External Integrations**: n8n, Appsmith, Google Drive, and KVM-1 server management.

### Technology Stack
*   **Frontend**: React, Vite, TailwindCSS, Shadcn/UI
*   **Backend**: Supabase (Auth, Database, Realtime)
*   **Storage**: Bunny.net CDN, Google Drive
*   **Automation**: n8n workflows

## WhatsApp Integration Setup

### 1. Meta Business Account
1.  Go to [Meta for Developers](https://developers.facebook.com/).
2.  Create a new app (Business type).
3.  Add the **WhatsApp** product to your app.

### 2. Credentials
1.  In the WhatsApp > API Setup menu:
    *   Copy **Phone Number ID**.
    *   Copy **WhatsApp Business Account ID**.
    *   Generate a **Permanent Access Token** in Business Settings > System Users.

### 3. Webhook Configuration
1.  In WhatsApp > Configuration:
    *   **Callback URL**: `https://your-domain.com/api/whatsapp/webhook`
    *   **Verify Token**: Create a secure random string (e.g., `my_secret_token_123`).
    *   Subscribe to `messages` field.

### 4. Environment Variables
Add these to your `.env` file: