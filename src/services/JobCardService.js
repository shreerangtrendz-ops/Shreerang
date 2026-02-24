import { supabase } from '@/lib/customSupabaseClient';

export const JobCardService = {
  async getAll() {
    const { data, error } = await supabase.from('job_cards').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(record) {
    const { data, error } = await supabase.from('job_cards').insert([record]).select();
    if (error) throw error;
    return data[0];
  }
};