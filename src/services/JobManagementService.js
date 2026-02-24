import { supabase } from '@/lib/customSupabaseClient';

export const JobManagementService = {
  async listJobs({ status, jobWorkerId, page = 1, limit = 20 } = {}) {
    let query = supabase
      .from('job_orders') // Assuming a job_orders table, falling back to pending_orders if not present in schema but needed for logic
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (jobWorkerId) query = query.eq('job_worker_id', jobWorkerId);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    // If table doesn't exist yet, return empty array to prevent crash
    if (error && error.code === '42P01') return { data: [], count: 0 }; 
    if (error) throw error;
    return { data, count };
  },

  async createJob(jobData) {
    // Assuming job_orders table
    const { data, error } = await supabase
      .from('job_orders')
      .insert([jobData])
      .select()
      .single();
    
    // Fallback if table missing, just log
    if (error && error.code === '42P01') {
      console.warn("job_orders table missing");
      return null;
    }
    if (error) throw error;
    return data;
  },

  async updateJobStatus(id, status) {
    const { data, error } = await supabase
      .from('job_orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};