import { supabase } from '@/lib/customSupabaseClient';

export const JobWorkerService = {
  async getAllWorkers() {
    const { data, error } = await supabase
      .from('job_workers')
      .select('*')
      .order('worker_name');
    if (error) throw error;
    return data;
  },

  async createWorker(workerData) {
    const { data, error } = await supabase
      .from('job_workers')
      .insert([workerData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateWorker(id, updates) {
    const { data, error } = await supabase
      .from('job_workers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteWorker(id) {
    const { error } = await supabase.from('job_workers').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};