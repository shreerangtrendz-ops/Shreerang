import { supabase } from '@/lib/customSupabaseClient';

export const RateCardService = {
  async getAll() {
    const { data, error } = await supabase.from('rate_card').select('*').order('item_name', { ascending: true });
    if (error) throw error;
    return data;
  },
  async update(id, record) {
    const { data, error } = await supabase.from('rate_card').update(record).eq('id', id).select();
    if (error) throw error;
    return data[0];
  }
};