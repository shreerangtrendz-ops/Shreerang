import { supabase } from '@/lib/customSupabaseClient';

export const FancyFinishFabricService = {
  async getAll() {
    const { data, error } = await supabase.from('fancy_finish_fabrics').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(record) {
    const { data, error } = await supabase.from('fancy_finish_fabrics').insert([record]).select();
    if (error) throw error;
    return data[0];
  }
};