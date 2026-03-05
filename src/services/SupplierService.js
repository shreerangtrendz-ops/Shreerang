import { supabase } from '@/lib/customSupabaseClient';

export const SupplierService = {
  async getSuppliers(filters = {}) {
    let query = supabase.from('customers').select('*').eq('business_type', 'supplier').order('name', { ascending: true });
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getSupplierById(id) {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).eq('business_type', 'supplier').single();
    if (error) throw error;
    return data;
  },

  async createSupplier(payload) {
    const { data, error } = await supabase.from('customers').insert([{ ...payload, business_type: 'supplier' }]).select().single();
    if (error) throw error;
    return data;
  },

  async updateSupplier(id, payload) {
    const { data, error } = await supabase.from('customers').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteSupplier(id) {
    const { error } = await supabase.from('customers').delete().eq('id', id).eq('business_type', 'supplier');
    if (error) throw error;
    return true;
  },

  exportToExcel(suppliers) {
    // Placeholder for excel export logic using xlsx
    console.log("Exporting suppliers", suppliers);
  }
};