import { supabase } from '@/lib/customSupabaseClient';

export const ValueAdditionService = {
  async getAll() {
    const { data, error } = await supabase.from('value_addition_entries').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(record) {
    const { data, error } = await supabase.from('value_addition_entries').insert([record]).select();
    if (error) throw error;
    return data[0];
  }
};