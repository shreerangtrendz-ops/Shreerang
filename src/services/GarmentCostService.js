import { supabase } from '@/lib/customSupabaseClient';

export const GarmentCostService = {
  async getAll() {
    const { data, error } = await supabase.from('garment_costs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('garment_costs').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
};