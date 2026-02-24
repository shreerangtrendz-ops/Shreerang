import { supabase } from '@/lib/customSupabaseClient';

export const WhatsAppIntegrationService = {
    
    // 1. Configuration
    async saveConfig(config) {
        const { error } = await supabase.from('whatsapp_config').upsert({
            ...config,
            is_verified: true // Assuming verification passes
        });
        if (error) throw error;
    },

    async getConfig() {
        const { data } = await supabase.from('whatsapp_config').select('*').single();
        return data;
    },

    // 2. Messaging
    async sendMessage(phoneNumber, text) {
        // In production: Call Meta Graph API
        // await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, ...)
        
        // Log to DB
        const { error } = await supabase.from('whatsapp_messages').insert({
            phone_number: phoneNumber,
            direction: 'outbound',
            message_text: text,
            status: 'sent'
        });
        
        if (error) throw error;
        return true;
    },

    async sendTemplate(phoneNumber, templateName, params) {
        // In production: Call Meta Graph API with template payload
        
        const { error } = await supabase.from('whatsapp_messages').insert({
            phone_number: phoneNumber,
            direction: 'outbound',
            message_text: `Template: ${templateName}`,
            message_type: 'template',
            status: 'sent'
        });
        
        if (error) throw error;
        return true;
    },

    // 3. Templates
    async getTemplates() {
        // Mock templates
        return [
            { id: '1', name: 'order_confirmation', text: 'Your order #{{1}} is confirmed.' },
            { id: '2', name: 'shipping_update', text: 'Your order #{{1}} has been shipped.' },
            { id: '3', name: 'payment_reminder', text: 'Payment of {{1}} is pending for order #{{2}}.' }
        ];
    }
};