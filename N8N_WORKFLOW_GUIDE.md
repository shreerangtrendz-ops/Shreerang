# n8n Workflow Guide

## Installation
1. Install n8n via Docker or npm.
2. Ensure it's publicly accessible (or use n8n cloud).

## Workflow Setup
1. Create a new workflow.
2. **Webhook Node**: Method `POST`, Path `whatsapp`.
3. **Switch Node**: Check `body.entry[0].changes[0].value.messages[0].type`.
   - If `text`: Route to NLP/Keyword logic.
   - If `image`: Route to Image Handler.
4. **Supabase Node**: Insert data into `notifications` or `finish_fabric_designs`.
5. **HTTP Request Node**: Call WhatsApp API to send reply (e.g., "Image received").

## Telegram Integration
1. Add Telegram Trigger node.
2. Connect to your admin group chat.
3. Use it to receive notifications about new orders/images.