import { supabase } from '@/lib/customSupabaseClient';

export const PricingService = {
  // --- FABRIC PRICES ---
  getFabricPrices: async (filters = {}) => {
    let query = supabase
      .from('fabric_prices')
      .select(`
        *,
        fabric_master:fabric_master_id (name, type, sku)
      `)
      .order('effective_date', { ascending: false });

    if (filters.fabricType) {
      // filtering on joined table requires a bit more complex query or post-filtering
      // Supabase supports filtering on foreign tables:
      query = query.not('fabric_master_id', 'is', null); // ensure joined
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Client side filter for nested prop if needed
    if (filters.fabricType && data) {
      return data.filter(item => item.fabric_master?.type === filters.fabricType);
    }
    return data;
  },

  addFabricPrice: async (priceData) => {
    const { data, error } = await supabase
      .from('fabric_prices')
      .insert([priceData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- JOB PRICES ---
  getJobPrices: async () => {
    const { data, error } = await supabase
      .from('job_prices')
      .select(`
        *,
        fabric_master:fabric_master_id (name, type, sku),
        job_work_unit:job_work_unit_id (unit_name, unit_code)
      `)
      .order('effective_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  addJobPrice: async (priceData) => {
    const { data, error } = await supabase
      .from('job_prices')
      .insert([priceData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- VA PRICES ---
  getVAPrices: async () => {
    const { data, error } = await supabase
      .from('va_prices')
      .select(`
        *,
        fabric_master:fabric_master_id (name, type, sku),
        va_unit:va_unit_id (unit_name, unit_code)
      `)
      .order('effective_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  addVAPrice: async (priceData) => {
    const { data, error } = await supabase
      .from('va_prices')
      .insert([priceData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  
  // Helpers
  getFabrics: async (types) => {
    let query = supabase.from('fabric_master').select('id, name, type, sku').eq('is_active', true);
    if (types && types.length > 0) {
      query = query.in('type', types);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};