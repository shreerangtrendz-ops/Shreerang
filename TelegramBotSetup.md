# Telegram Bot Setup Guide

## 1. Create Bot
1. Open Telegram and search for **@BotFather**.
2. Send `/newbot`.
3. Enter a name (e.g., "Fabric Admin Bot").
4. Enter a username (must end in `bot`, e.g., `FabricAdmin_bot`).
5. **Copy the Access Token** provided.

## 2. Get Chat ID
1. Start a chat with your new bot.
2. Send any message (e.g., "Hello").
3. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in your browser.
4. Look for `"chat":{"id": 123456789}` in the JSON response.
5. This is your **Chat ID**.

## 3. Configure n8n
1. In n8n, add **Telegram** credentials.
2. Paste the **Access Token**.
3. In your Telegram nodes, use the **Chat ID** to send messages to yourself.