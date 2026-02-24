export const ConfigService = {
  get: (key) => {
    return import.meta.env[key];
  },

  validateWhatsAppConfig: () => {
    const required = [
      'VITE_WHATSAPP_API_KEY',
      'VITE_WHATSAPP_PHONE_NUMBER_ID',
      'VITE_WHATSAPP_BUSINESS_ACCOUNT_ID'
    ];
    
    const missing = required.filter(key => !import.meta.env[key]);
    if (missing.length > 0) {
      console.warn(`Missing WhatsApp Config: ${missing.join(', ')}`);
      return false;
    }
    return true;
  },

  validateAppsmithConfig: () => {
    if (!import.meta.env.VITE_APPSMITH_EMBED_URL) {
      console.warn('Missing VITE_APPSMITH_EMBED_URL');
      return false;
    }
    return true;
  }
};