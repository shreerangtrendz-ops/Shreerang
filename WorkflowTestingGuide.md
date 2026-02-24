# Workflow Testing Guide

## Test 1: Webhook Reception
1.  Open n8n workflow.
2.  Click **Execute Workflow**.
3.  Send "Hello" from your phone to the bot number.
4.  **Expected**: The "WhatsApp Webhook" node should turn green and output JSON data containing your phone number and message text.

## Test 2: Database Query
1.  Ensure you have active designs in `finish_fabric_designs`.
2.  Send "Show Designs".
3.  **Expected**: 
    *   "Detect Intent" routes to Output 0 (Inquiry).
    *   "Get Designs" returns 5 rows.
    *   You receive 5 images on WhatsApp.

## Test 3: Telegram Notification
1.  Send "Order D101 50 meters".
2.  **Expected**:
    *   "Detect Intent" routes to Output 1 (Order).
    *   You receive a message on Telegram from your bot: "New Order Request! ... D101 ...".
    *   The message has "Approve" / "Reject" buttons.

## Test 4: Full Order Cycle
1.  (Requires advanced n8n setup with Callback Query trigger for Telegram).
2.  For basic testing, verify up to the notification step.
3.  To test DB insertion, you can temporarily bypass the Telegram Wait node and connect "Notify Admin" directly to "Create Order" node.