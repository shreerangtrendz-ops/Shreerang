import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service to handle system notifications via multiple channels
 */
export const NotificationService = {
  
  /**
   * Log a notification to the database for in-app display
   */
  async createNotification(userId, title, message, type = 'info', link = null) {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        link,
        is_read: false,
        created_at: new Date()
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return false;
    }
  },

  /**
   * Send an email (via Edge Function or logging to email_logs table for background worker)
   */
  async sendEmail(recipient, subject, body, referenceId = null) {
    try {
      // Log to email_logs table which would be picked up by a background job
      const { error } = await supabase.from('email_logs').insert({
        recipient,
        subject,
        body,
        status: 'pending',
        reference_id: referenceId,
        sent_at: null
      });
      
      if (error) throw error;
      console.log(`Email queued for ${recipient}: ${subject}`);
      return true;
    } catch (error) {
      console.error('Failed to queue email:', error);
      return false;
    }
  },

  /**
   * Send WhatsApp message (Mock implementation for now)
   */
  async sendWhatsApp(phoneNumber, templateName, parameters = []) {
    console.log(`Sending WhatsApp to ${phoneNumber} using template ${templateName}`, parameters);
    // Real implementation would call Supabase Edge Function:
    // await supabase.functions.invoke('send-whatsapp', { body: { ... } })
    return true;
  }
};