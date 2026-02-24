import { supabase } from '@/lib/customSupabaseClient';

export const PriceDatabaseService = {
  async getAll() {
    const { data, error } = await supabase.from('price_database').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('price_database').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await supabase.from('price_database').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async create(payload) {
    const { data, error } = await supabase.from('price_database').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
};