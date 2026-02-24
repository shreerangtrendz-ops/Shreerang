import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service to interact with Meta WhatsApp Business API
 */
export const MetaWhatsAppService = {
  
  /**
   * Send a text message to a phone number
   * @param {string} phoneNumber - The recipient's phone number (with country code)
   * @param {string} message - The text message content
   */
  async sendMessage(phoneNumber, message) {
    try {
      // We invoke a Supabase Edge Function to keep tokens secure
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          type: 'text',
          to: phoneNumber,
          text: { body: message }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('MetaWhatsAppService.sendMessage Error:', error);
      throw error;
    }
  },

  /**
   * Send a media message (image, document)
   * @param {string} phoneNumber 
   * @param {string} mediaUrl 
   * @param {string} mediaType - 'image' or 'document'
   * @param {string} caption - Optional caption
   */
  async sendMedia(phoneNumber, mediaUrl, mediaType = 'image', caption = '') {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          type: mediaType,
          to: phoneNumber,
          [mediaType]: { 
            link: mediaUrl,
            caption: caption 
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('MetaWhatsAppService.sendMedia Error:', error);
      throw error;
    }
  },

  /**
   * Send a template message
   * @param {string} phoneNumber 
   * @param {string} templateName 
   * @param {string} languageCode 
   * @param {Array} components - Template components/variables
   */
  async sendTemplate(phoneNumber, templateName, languageCode = 'en_US', components = []) {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          type: 'template',
          to: phoneNumber,
          template: {
            name: templateName,
            language: { code: languageCode },
            components
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('MetaWhatsAppService.sendTemplate Error:', error);
      throw error;
    }
  },

  /**
   * Mark a message as read in WhatsApp
   * @param {string} messageId 
   */
  async markAsRead(messageId) {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-status', {
        body: {
          status: 'read',
          message_id: messageId
        }
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('MetaWhatsAppService.markAsRead Error:', error);
      // Non-blocking error
      return null;
    }
  },

  /**
   * Store a message in the database (local copy)
   */
  async storeMessage({ customerId, phoneNumber, direction, text, type = 'text', mediaUrl, status = 'sent', metaId }) {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert([{
        customer_id: customerId,
        phone_number: phoneNumber,
        direction,
        message_text: text,
        message_type: type,
        media_url: mediaUrl,
        status,
        meta_message_id: metaId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};