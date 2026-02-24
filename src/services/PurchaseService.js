import { supabase } from '@/lib/customSupabaseClient';

export const PurchaseService = {
  async getPurchases({ supplier, fabric_type, startDate, endDate } = {}) {
    let query = supabase.from('purchase_fabric').select('*').order('date', { ascending: false });

    if (supplier) query = query.ilike('supplier_name', `%${supplier}%`);
    if (fabric_type) query = query.eq('fabric_type', fabric_type);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createPurchase(purchaseData) {
    const { data, error } = await supabase.from('purchase_fabric').insert([purchaseData]).select();
    if (error) throw error;
    return data[0];
  },

  async updatePurchase(id, updates) {
    const { data, error } = await supabase.from('purchase_fabric').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  async deletePurchase(id) {
    const { error } = await supabase.from('purchase_fabric').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  
  // Helper to fetch price for costing
  async getLatestPriceForSKU(sku) {
    const { data, error } = await supabase
      .from('purchase_fabric')
      .select('price, discount_pct')
      .eq('sku_id', sku)
      .order('date', { ascending: false })
      .limit(1)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    return data || { price: 0, discount_pct: 0 };
  }
};