import { supabase } from '@/lib/customSupabaseClient';

export const OrderService = {
  // Sales Orders
  async listSalesOrders({ startDate, endDate, search, status } = {}) {
    let query = supabase
      .from('sales_orders')
      .select('*, customer:customers(name)')
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (search) query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`); // Assuming denormalized customer_name or join search
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getSalesOrderById(id) {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*, items:sales_order_items(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async createSalesOrder(orderData) {
    const { data, error } = await supabase
      .from('sales_orders')
      .insert([orderData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Pending Orders
  async listPendingOrders({ daysPending } = {}) {
    let query = supabase
      .from('pending_orders')
      .select('*')
      .order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    // Filter by days pending in memory or use complex DB query
    // Simplified in-memory filtering for daysPending range
    if (daysPending) {
        const now = new Date();
        return data.filter(order => {
            const orderDate = new Date(order.created_at);
            const diffTime = Math.abs(now - orderDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (daysPending === '0-7') return diffDays <= 7;
            if (daysPending === '7-14') return diffDays > 7 && diffDays <= 14;
            if (daysPending === '14+') return diffDays > 14;
            return true;
        });
    }

    return data;
  },

  async updatePendingOrderStatus(id, status) {
     const { data, error } = await supabase
      .from('pending_orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};