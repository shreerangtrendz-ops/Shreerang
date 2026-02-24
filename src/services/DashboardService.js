import { supabase } from '@/lib/customSupabaseClient';

// Helper to safely execute a promise with fallback
const safeFetch = async (promise, fallbackValue) => {
  try {
    const { data, error, count } = await promise;
    if (error) {
      console.warn("Supabase fetch error (handled):", error.message);
      return fallbackValue;
    }
    // Return count if it exists (for count queries), otherwise data
    return count !== null && count !== undefined ? count : (data || fallbackValue);
  } catch (err) {
    console.error("DashboardService unexpected error:", err);
    return fallbackValue;
  }
};

export const DashboardService = {
  async getTotalFabrics() {
    return safeFetch(
      supabase.from('fabric_master').select('*', { count: 'exact', head: true }),
      0
    );
  },

  async getTotalDesigns() {
    return safeFetch(
      supabase.from('designs').select('*', { count: 'exact', head: true }),
      0
    );
  },

  async getTotalProducts() {
    return safeFetch(
      supabase.from('product_masters').select('*', { count: 'exact', head: true }),
      0
    );
  },

  async getTotalOrders() {
    return safeFetch(
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      0
    );
  },

  async getTotalCostSheets() {
    return safeFetch(
      supabase.from('cost_sheets').select('*', { count: 'exact', head: true }),
      0
    );
  },

  async getRecentDesigns(limit = 5) {
    return safeFetch(
      supabase
        .from('designs')
        .select('id, design_number, design_name, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      []
    );
  },

  async getRecentOrders(limit = 5) {
    return safeFetch(
      supabase
        .from('orders')
        .select('id, order_number, customer_name, final_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      []
    );
  },

  async getOrdersByStatus() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status');
      
      if (error) throw error;

      // Client-side aggregation
      const stats = (data || []).reduce((acc, curr) => {
        const status = curr.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      return stats;
    } catch (error) {
      console.error('Error fetching orders by status:', error);
      return {};
    }
  },

  async getDesignsByFabricType() {
    try {
      const { data, error } = await supabase
        .from('fabric_master')
        .select('type');
        
      if (error) throw error;

      const stats = (data || []).reduce((acc, curr) => {
        const type = curr.type || 'Other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(stats).map(([type, count]) => ({
        fabric_type: type,
        count
      }));
    } catch (error) {
      console.error('Error fetching designs by fabric type:', error);
      return [];
    }
  }
};