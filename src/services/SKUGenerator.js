import { supabase } from '@/lib/customSupabaseClient';

export const SKUGenerator = {
  generateSKU(width, shortCode, finish) {
    if (!width || !shortCode) return '';
    
    // Format: WIDTH-SHORTCODE-FINISH (e.g. 58-COT-60-GREIGE)
    const cleanWidth = String(width).replace(/[^0-9]/g, '');
    const cleanShortCode = String(shortCode).toUpperCase().trim();
    const cleanFinish = String(finish || 'GREIGE').toUpperCase().trim();
    
    return `${cleanWidth}-${cleanShortCode}-${cleanFinish}`;
  },

  async isDuplicate(sku) {
     if (!sku) return false;
     
     const { data, error } = await supabase
        .from('base_fabrics')
        .select('id')
        .eq('base_code', sku) // Check base_code field as per schema for base fabrics
        .maybeSingle();
        
     if (error) {
         console.error('Error checking duplicate SKU:', error);
         return false; 
     }
     
     return !!data;
  },
  
  // Bulk check
  async checkBulkDuplicates(skus) {
      if (!skus || skus.length === 0) return [];
      
      const { data, error } = await supabase
         .from('base_fabrics')
         .select('base_code')
         .in('base_code', skus);
         
      if (error) {
          console.error('Error checking bulk duplicates:', error);
          return [];
      }
      
      return data.map(d => d.base_code);
  }
};