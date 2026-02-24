import { supabase } from '@/lib/customSupabaseClient';

export const PurchaseOrderService = {
  async getAllOrders({ page = 1, limit = 20, status, supplierId, search } = {}) {
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (supplier_name)
      `, { count: 'exact' });

    if (status && status !== 'All') query = query.eq('status', status);
    if (supplierId && supplierId !== 'all') query = query.eq('supplier_id', supplierId);
    if (search) query = query.ilike('po_number', `%${search}%`);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;
    
    return { data, count };
  },

  async getOrderById(id) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async createOrder(orderData) {
    // Generate PO Number if not provided
    if (!orderData.po_number) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(1000 + Math.random() * 9000);
      orderData.po_number = `PO-${dateStr}-${random}`;
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([orderData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateOrder(id, updates) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteOrder(id) {
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};