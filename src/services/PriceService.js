import { supabase } from '@/lib/customSupabaseClient';

export const PriceService = {
  async listPrices({ fabricType, search } = {}) {
    let query = supabase
      .from('fabric_prices')
      .select('*, fabric_master(name, sku, type)')
      .order('created_at', { ascending: false });

    // Note: filtering by joined table column (fabric_master.type) directly in Supabase simple client requires 
    // inner join filter syntax: !inner
    if (fabricType && fabricType !== 'All') {
       query = supabase
        .from('fabric_prices')
        .select('*, fabric_master!inner(name, sku, type)')
        .eq('fabric_master.type', fabricType);
    }
    
    // For search, we might need to filter on client side or use RPC if deep search is needed
    // Simplification: fetch all and filter in JS if search is present for joined fields
    const { data, error } = await query;
    if (error) throw error;
    
    let result = data;
    if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(item => 
            item.fabric_master?.sku?.toLowerCase().includes(searchLower) || 
            item.fabric_master?.name?.toLowerCase().includes(searchLower)
        );
    }
    
    return result;
  },

  async createPrice(priceData) {
    const { data, error } = await supabase
      .from('fabric_prices')
      .insert([priceData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updatePrice(id, updates) {
    const { data, error } = await supabase
      .from('fabric_prices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePrice(id) {
    const { error } = await supabase.from('fabric_prices').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};