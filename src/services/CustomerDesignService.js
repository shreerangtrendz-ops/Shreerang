import { supabase } from '@/lib/customSupabaseClient';

export const CustomerDesignService = {
  async getFeaturedDesigns(limit = 6) {
    // Fetching from 'designs' or 'design_uploads' depending on schema
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .limit(limit)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },
  
  async getDesigns({ category, search, page = 1, limit = 20 } = {}) {
    let query = supabase.from('designs').select('*', { count: 'exact' });
    
    if (category) query = query.eq('category_id', category);
    if (search) query = query.ilike('design_number', `%${search}%`);
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  }
};