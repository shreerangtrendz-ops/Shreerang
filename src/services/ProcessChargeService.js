import { supabase } from '@/lib/customSupabaseClient';

export const ProcessChargeService = {
  async listCharges({ startDate, endDate, search, processType } = {}) {
    let query = supabase.from('process_charges').select('*').order('created_at', { ascending: false });
    
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (processType && processType !== 'All') query = query.eq('process_type', processType);
    if (search) query = query.ilike('design_number', `%${search}%`);

    const { data, error } = await query;
    if (error) {
        console.error("Error listing process charges:", error);
        throw error;
    }
    return data;
  },

  async createCharge(entry) {
    const { data, error } = await supabase.from('process_charges').insert([entry]).select().single();
    if (error) {
        console.error("Error creating process charge:", error);
        throw error;
    }
    return data;
  },

  async updateCharge(id, updates) {
    const { data, error } = await supabase.from('process_charges').update(updates).eq('id', id).select().single();
    if (error) {
        console.error("Error updating process charge:", error);
        throw error;
    }
    return data;
  },
  
  async deleteCharge(id) {
    const { error } = await supabase.from('process_charges').delete().eq('id', id);
    if (error) {
        console.error("Error deleting process charge:", error);
        throw error;
    }
    return true;
  }
};