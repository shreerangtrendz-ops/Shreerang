import { supabase } from '@/lib/customSupabaseClient';

export const DesignImageService = {
  async getAll() {
    const { data, error } = await supabase.from('design_images').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(record) {
    const { data, error } = await supabase.from('design_images').insert([record]).select();
    if (error) throw error;
    return data[0];
  },
  async delete(id) {
    const { error } = await supabase.from('design_images').delete().eq('id', id);
    if (error) throw error;
  }
};