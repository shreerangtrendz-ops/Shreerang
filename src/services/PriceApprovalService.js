import { supabase } from '@/lib/customSupabaseClient';

export const PriceApprovalService = {
  async listApprovals({ status } = {}) {
    let query = supabase
      .from('price_requests')
      .select('*, products(name, sku), user_profiles!requested_by(full_name)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async approvePrice(id, approvedPrice, adminId) {
    const { data, error } = await supabase
      .from('price_requests')
      .update({ 
        status: 'approved', 
        approved_price: approvedPrice, // Assuming column exists or mapping to requested_price
        approved_by: adminId,
        approved_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async rejectPrice(id, adminId) {
    const { data, error } = await supabase
      .from('price_requests')
      .update({ 
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};