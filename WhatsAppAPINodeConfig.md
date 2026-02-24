# WhatsApp API Node Configuration (n8n)

Use the **HTTP Request** node in n8n to send messages.

## General Settings
*   **Method**: `POST`
*   **URL**: `https://graph.facebook.com/v17.0/<PHONE_NUMBER_ID>/messages`
*   **Authentication**: Generic Credential Type -> Header Auth
    *   **Name**: `Authorization`
    *   **Value**: `Bearer <YOUR_ACCESS_TOKEN>`

## JSON Body Examples

### 1. Send Text