import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service for robust fetching of dropdown data with error handling and retries.
 */
export const DataLoadingService = {
  
  async fetchBaseFabrics() {
    return this._fetchWithRetry(async () => {
      const { data, error } = await supabase
        .from('base_fabrics')
        .select('id, base_fabric_name')
        .eq('status', 'active')
        .order('base_fabric_name');
      
      if (error) throw error;
      return data.map(item => ({ 
        id: item.id, 
        label: item.base_fabric_name,
        original: item 
      }));
    }, 'Base Fabrics');
  },

  async fetchFinishFabrics() {
    return this._fetchWithRetry(async () => {
      const { data, error } = await supabase
        .from('finish_fabrics')
        .select('id, finish_fabric_name')
        .eq('status', 'active')
        .order('finish_fabric_name');

      if (error) throw error;
      return data.map(item => ({ 
        id: item.id, 
        label: item.finish_fabric_name,
        original: item 
      }));
    }, 'Finish Fabrics');
  },

  async fetchFancyFinishFabrics() {
    return this._fetchWithRetry(async () => {
      const { data, error } = await supabase
        .from('fancy_finish_fabrics')
        .select('id, fancy_finish_name')
        .eq('status', 'active')
        .order('fancy_finish_name');

      if (error) throw error;
      return data.map(item => ({ 
        id: item.id, 
        label: item.fancy_finish_name,
        original: item 
      }));
    }, 'Fancy Finish Fabrics');
  },

  async fetchSuppliers() {
    return this._fetchWithRetry(async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, supplier_name, city')
        .eq('status', 'active')
        .order('supplier_name');

      if (error) throw error;
      return data.map(item => ({ 
        id: item.id, 
        label: `${item.supplier_name} ${item.city ? `(${item.city})` : ''}`,
        original: item 
      }));
    }, 'Suppliers');
  },

  async fetchJobWorkers(specialization = null) {
    return this._fetchWithRetry(async () => {
      let query = supabase
        .from('job_workers')
        .select('id, worker_name, specialization')
        .eq('status', 'active')
        .order('worker_name');

      if (specialization) {
        query = query.ilike('specialization', `%${specialization}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data.map(item => ({ 
        id: item.id, 
        label: `${item.worker_name} ${item.specialization ? `(${item.specialization})` : ''}`,
        original: item 
      }));
    }, 'Job Workers');
  },

  // Helper for consistent error handling and retries
  async _fetchWithRetry(operation, resourceName, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`[DataLoadingService] Fetching ${resourceName}... (Attempt ${i + 1})`);
        const result = await operation();
        console.log(`[DataLoadingService] Success: Loaded ${result.length} ${resourceName}`);
        return result;
      } catch (error) {
        console.error(`[DataLoadingService] Error fetching ${resourceName} (Attempt ${i + 1}):`, error);
        if (i === retries) {
          throw new Error(`Failed to load ${resourceName}. Please check your connection.`);
        }
        // Simple backoff
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }
};