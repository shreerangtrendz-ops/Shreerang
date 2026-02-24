import { supabase } from '@/lib/customSupabaseClient';
import { ConfigService } from './ConfigService';

export const WhatsAppService = {
  sendMessage: async (recipientPhone, templateName, components, relatedId, type) => {
    if (!ConfigService.validateWhatsAppConfig()) {
      throw new Error("WhatsApp configuration missing");
    }

    const API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY;
    const PHONE_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
    const API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';

    try {
      // 1. Send via API
      const response = await fetch(`${API_URL}/${PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en" },
            components
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "WhatsApp API Error");
      }

      // 2. Log to DB
      await supabase.from('whatsapp_messages').insert([{
        recipient_phone: recipientPhone,
        message_type: type,
        related_id: relatedId,
        status: 'sent',
        sent_at: new Date().toISOString(),
        message_content: JSON.stringify(components)
      }]);

      return result;
    } catch (error) {
      console.error("WhatsApp Send Failed:", error);
      
      // Log failure
      await supabase.from('whatsapp_messages').insert([{
        recipient_phone: recipientPhone,
        message_type: type,
        related_id: relatedId,
        status: 'failed',
        message_content: error.message
      }]);
      
      throw error;
    }
  },

  sendFabricDetails: async (fabric, phone) => {
    return WhatsAppService.sendMessage(
      phone,
      'fabric_details_v1',
      [{
        type: "body",
        parameters: [
          { type: "text", text: fabric.name },
          { type: "text", text: fabric.sku || 'N/A' },
          { type: "text", text: fabric.type }
        ]
      }],
      fabric.id,
      'fabric_details'
    );
  }
};