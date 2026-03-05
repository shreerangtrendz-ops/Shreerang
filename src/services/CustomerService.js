import { supabase } from '@/lib/customSupabaseClient';

export const CustomerService = {
  async createCustomer(customerData) {
    const { phone, name, email, company_name, business_type, location, gst_number, website, source } = customerData;

    // Auto-assign tier based on business type
    let tier = 'REGISTERED';
    if (['Manufacturer', 'Wholesaler', 'Exporter'].includes(business_type)) {
      // Could logic here to auto-set to VIP based on other factors, but default to REGISTERED for vetting
      tier = 'REGISTERED';
    }

    const payload = {
      phone,
      name,
      email,
      company_name,
      business_type,
      location,
      gst_number,
      website,
      source: source || 'website',
      tier,
      created_at: new Date().toISOString(),
      last_contact: new Date().toISOString(),
      conversation_history: []
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async listCustomers(params = {}) {
    let query = supabase
      .from('customers')
      .select('*')
      .neq('business_type', 'supplier')
      .order('created_at', { ascending: false });

    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,firm_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getCustomerByPhone(phone) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
    return data;
  },

  async updateCustomerTier(phone, tier) {
    const { data, error } = await supabase
      .from('customers')
      .update({ tier })
      .eq('phone', phone)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateLastContact(phone) {
    await supabase
      .from('customers')
      .update({ last_contact: new Date().toISOString() })
      .eq('phone', phone);
  },

  async addToConversationHistory(phone, message, direction) {
    // First get current history
    const customer = await this.getCustomerByPhone(phone);
    if (!customer) return;

    const newEntry = {
      message,
      direction,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...(customer.conversation_history || []), newEntry];

    const { error } = await supabase
      .from('customers')
      .update({ conversation_history: updatedHistory, last_contact: new Date().toISOString() })
      .eq('id', customer.id);

    if (error) throw error;

    // Also log to conversations_extended table
    await supabase.from('conversations_extended').insert({
      customer_id: customer.id,
      phone_number: phone,
      message_text: message,
      direction,
      status: 'pending'
    });
  }
};