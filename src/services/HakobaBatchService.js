import { supabase } from '@/lib/customSupabaseClient';

export const HakobaBatchService = {
  async getCalculations() {
    const { data, error } = await supabase.from('batch_costing').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  
  async getCalculationById(id) {
    const { data, error } = await supabase.from('batch_costing').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async saveCalculation(payload) {
    const { data, error } = await supabase.from('batch_costing').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCalculation(id) {
    const { error } = await supabase.from('batch_costing').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};