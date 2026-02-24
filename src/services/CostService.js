import { supabase } from '@/lib/customSupabaseClient';

export const CostService = {
  // Purchase Fabric
  async listPurchaseFabric({ startDate, endDate, search } = {}) {
    let query = supabase.from('purchase_fabric').select('*').order('created_at', { ascending: false });
    
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (search) query = query.ilike('supplier_name', `%${search}%`); // Simple search

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createPurchaseFabric(entry) {
    const { data, error } = await supabase.from('purchase_fabric').insert([entry]).select().single();
    if(error) throw error;
    return data;
  },

  async deletePurchaseFabric(id) {
    const { error } = await supabase.from('purchase_fabric').delete().eq('id', id);
    if(error) throw error;
    return true;
  },
  
  // Process Charges
  async listProcessCharges({ startDate, endDate, search } = {}) {
    let query = supabase.from('process_charges').select('*').order('created_at', { ascending: false });
    
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    // Add more filters as needed
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createProcessCharge(entry) {
    const { data, error } = await supabase.from('process_charges').insert([entry]).select().single();
    if(error) throw error;
    return data;
  },
  
  async deleteProcessCharge(id) {
    const { error } = await supabase.from('process_charges').delete().eq('id', id);
    if(error) throw error;
    return true;
  },

  // Value Addition
  async listValueAddition({ startDate, endDate, search } = {}) {
    let query = supabase.from('value_addition_charges').select('*').order('created_at', { ascending: false });
    
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createValueAddition(entry) {
    const { data, error } = await supabase.from('value_addition_charges').insert([entry]).select().single();
    if(error) throw error;
    return data;
  },

  async deleteValueAddition(id) {
    const { error } = await supabase.from('value_addition_charges').delete().eq('id', id);
    if(error) throw error;
    return true;
  }
};