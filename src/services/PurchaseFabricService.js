import { supabase } from '@/lib/customSupabaseClient';

export const PurchaseFabricService = {
  async listPurchases({ fabricType, search } = {}) {
    let query = supabase
      .from('purchase_fabric')
      .select('*, fabric_master(sku, name)')
      .order('date', { ascending: false });

    if (fabricType && fabricType !== 'All') {
      query = query.eq('fabric_type', fabricType);
    }
    
    if (search) {
      query = query.ilike('supplier_name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createPurchase(purchaseData) {
    const { data, error } = await supabase
      .from('purchase_fabric')
      .insert([purchaseData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updatePurchase(id, updates) {
    const { data, error } = await supabase
      .from('purchase_fabric')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePurchase(id) {
    const { error } = await supabase
      .from('purchase_fabric')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};