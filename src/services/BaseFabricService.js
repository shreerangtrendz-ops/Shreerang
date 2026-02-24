import { supabase } from '@/lib/customSupabaseClient';

export const BaseFabricService = {
  async getAll() {
    const { data, error } = await supabase.from('base_fabrics').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(record) {
    const { data, error } = await supabase.from('base_fabrics').insert([record]).select();
    if (error) throw error;
    return data[0];
  },
  async update(id, record) {
    const { data, error } = await supabase.from('base_fabrics').update(record).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },
  async delete(id) {
    const { error } = await supabase.from('base_fabrics').delete().eq('id', id);
    if (error) throw error;
  }
};