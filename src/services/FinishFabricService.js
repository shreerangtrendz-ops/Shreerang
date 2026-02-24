import { supabase } from '@/lib/customSupabaseClient';

export const FinishFabricService = {
  async getAll() {
    const { data, error } = await supabase.from('finish_fabrics').select(`*, base_fabrics(fabric_name)`).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(record) {
    const { data, error } = await supabase.from('finish_fabrics').insert([record]).select();
    if (error) throw error;
    return data[0];
  }
};