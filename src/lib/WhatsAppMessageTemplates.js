export const WhatsAppMessageTemplates = {
    inquiryResponse: (category) => 
        `Hi! Here are the ${category || 'latest'} designs available in our collection. Let us know if you like any!`,

    orderAcknowledgment: () => 
        `Thank you for your order request! Please wait a moment while we check stock and confirm the price for you.`,

    priceQuote: (design, quantity, price, total) => 
        `The price for Design ${design} (${quantity}m) is ₹${price}/m.\nTotal Amount: ₹${total}.\n\nReply *YES* to confirm this order.`,

    orderConfirmation: (orderId, link) => 
        `✅ Your order has been confirmed!\nOrder ID: ${orderId}\nView details here: ${link}`,

    orderStatusUpdate: (orderId, status) => 
        `📢 Update for Order ${orderId}: Your order is now *${status}*.`,
        
    catalogLink: (link) =>
        `Browse our full catalog here: ${link}`
};