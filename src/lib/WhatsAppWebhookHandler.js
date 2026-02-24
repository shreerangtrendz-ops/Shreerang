import { supabase } from './customSupabaseClient';
import { ImageCompressionService } from './ImageCompressionService';

/**
 * Validates and parses incoming WhatsApp Webhooks
 * Note: Actual webhook endpoint would be a Supabase Edge Function or external server
 * This is the logic layer.
 */
export const WhatsAppWebhookHandler = {
  
  parseMessage(payload) {
    if (!payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      return null;
    }

    const message = payload.entry[0].changes[0].value.messages[0];
    const contact = payload.entry[0].changes[0].value.contacts?.[0];
    
    return {
      id: message.id,
      from: message.from, // Phone number
      name: contact?.profile?.name,
      type: message.type,
      timestamp: message.timestamp,
      content: message[message.type], // text, image, etc.
      raw: message
    };
  },

  async handleImageMessage(parsedMessage, finishFabricId = null) {
    if (parsedMessage.type !== 'image') return null;

    // In a real implementation, you need to use the Media API to download
    // const mediaId = parsedMessage.content.id;
    // const imageUrl = await WhatsAppCloudAPI.getMediaUrl(mediaId);
    
    // Simulating the flow
    console.log("Processing WhatsApp Image:", parsedMessage.id);
    
    // Save metadata to DB to show in Admin Queue
    const { error } = await supabase.from('notifications').insert({
        title: 'New WhatsApp Image',
        message: `Received image from ${parsedMessage.name || parsedMessage.from}`,
        type: 'whatsapp_image',
        link: '/admin/whatsapp-upload',
        user_id: null // System notification
    });
    
    return true;
  },

  detectIntent(text) {
    const t = text.toLowerCase();
    if (t.includes('price') || t.includes('cost')) return 'PRICE_INQUIRY';
    if (t.includes('order') || t.includes('buy')) return 'ORDER_INTENT';
    if (t.includes('catalog') || t.includes('design')) return 'CATALOG_REQUEST';
    return 'GENERAL';
  }
};