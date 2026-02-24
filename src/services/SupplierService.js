import { supabase } from '@/lib/customSupabaseClient';

export const SupplierService = {
  async getSuppliers(filters = {}) {
    let query = supabase.from('suppliers').select('*').order('supplier_name', { ascending: true });
    if (filters.search) {
      query = query.ilike('supplier_name', `%${filters.search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getSupplierById(id) {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createSupplier(payload) {
    const { data, error } = await supabase.from('suppliers').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  async updateSupplier(id, payload) {
    const { data, error } = await supabase.from('suppliers').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteSupplier(id) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  exportToExcel(suppliers) {
    // Placeholder for excel export logic using xlsx
    console.log("Exporting suppliers", suppliers);
  }
};