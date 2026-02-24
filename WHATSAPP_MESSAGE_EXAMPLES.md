# WhatsApp Interaction Examples

## 1. Inquiry Flow
**Customer**: "Show me Rayon designs"
**Bot**: *[Sends 5 images of latest Rayon prints]*
**Bot**: "Here are our latest Rayon designs. Reply with 'Order [Design No]' to purchase."

## 2. Order Flow
**Customer**: "Order D-101 100 meters"
**Bot**: "Thank you! Checking stock and price for Design D-101 (100m). Please wait..."
*(Admin receives Telegram notification)*
**Admin (Telegram)**: *Clicks 'Approve'*
**Bot**: "Great news! D-101 is available at ₹550/m. Total: ₹55,000. Reply YES to confirm."

## 3. Confirmation Flow
**Customer**: "YES"
**Bot**: "✅ Order Confirmed! \nOrder ID: SO-2025-0045\nView Invoice: https://fabric-store.com/order-summary/uuid"

## 4. Status Check
**Customer**: "Status of SO-2025-0045"
**Bot**: "📦 Order SO-2025-0045 is **Shipped**. Tracking: DTDC-123456789."

## 5. Fallback/Error
**Customer**: "Do you sell shoes?"
**Bot**: "I didn't understand that. You can ask to 'Show Designs', 'Check Status', or 'Order'."