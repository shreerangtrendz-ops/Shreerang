import { supabase } from '@/lib/customSupabaseClient';

export const OrderFormService = {
  async listOrderForms({ page = 1, limit = 20 } = {}) {
    // Assuming 'order_forms' table or using 'sales_orders' with status 'draft'
    let query = supabase
      .from('sales_orders') 
      .select('*', { count: 'exact' })
      .eq('order_status', 'Draft');

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  },

  async createOrderForm(formData) {
    const { data, error } = await supabase
      .from('sales_orders')
      .insert([{ ...formData, order_status: 'Draft' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};