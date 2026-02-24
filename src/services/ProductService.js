import { supabase } from '@/lib/customSupabaseClient';

export const ProductService = {
  async listProducts({ processType, search } = {}) {
    let query = supabase.from('product_masters').select('*, fabric_master(sku, name)').order('created_at', { ascending: false });

    if (processType && processType !== 'All') {
      query = query.eq('product_type', processType);
    }

    if (search) {
      query = query.ilike('product_name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createProduct(productData) {
    const { data, error } = await supabase
      .from('product_masters')
      .insert([productData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id, updates) {
    const { data, error } = await supabase
      .from('product_masters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProduct(id) {
    const { error } = await supabase
      .from('product_masters')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Ready' ? 'Out of Stock' : 'Ready';
    const { data, error } = await supabase
      .from('product_masters')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};