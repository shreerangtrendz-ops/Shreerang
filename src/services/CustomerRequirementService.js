import { supabase } from '@/lib/customSupabaseClient';

export const CustomerRequirementService = {
  async listRequirements() {
    // Using bulk_enquiries as a proxy for customer requirements if specific table missing
    const { data, error } = await supabase
      .from('bulk_enquiries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async updateRequirementStatus(id, status) {
    const { data, error } = await supabase
      .from('bulk_enquiries')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};