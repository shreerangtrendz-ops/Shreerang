import { supabase } from '@/lib/customSupabaseClient';

export const AppsmithService = {
  getEmbedUrl: (dashboardType) => {
    const baseUrl = import.meta.env.VITE_APPSMITH_EMBED_URL;
    if (!baseUrl) return null;
    
    // Map types to specific Appsmith pages/IDs if needed
    const pageMap = {
      'inventory': 'pageId=Inventory',
      'pricing': 'pageId=Pricing',
      'costing': 'pageId=Costing',
      'analytics': 'pageId=Analytics'
    };
    
    return `${baseUrl}?${pageMap[dashboardType] || ''}&embed=true`;
  },

  // Helper functions to execute custom queries via Supabase RPC
  fetchAnalytics: async (functionName) => {
    const { data, error } = await supabase.rpc(functionName);
    if (error) throw error;
    return data;
  }
};