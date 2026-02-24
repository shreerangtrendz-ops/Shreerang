import { supabase } from '@/lib/customSupabaseClient';

export const JobWorkUnitService = {
  async getAll() {
    const { data, error } = await supabase.from('job_work_units').select('*');
    if (error) throw error;
    return data;
  }
};