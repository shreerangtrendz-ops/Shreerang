import { supabase } from '@/lib/customSupabaseClient';

export const BillMappingService = {
  // Find potential fabric matches based on extracted data
  findPotentialMatches: async (extractedData, type) => {
    try {
      let table = 'base_fabrics';
      let nameField = 'base_fabric_name';
      
      // Determine target table based on HSN or Type
      if (type === 'JobWork') {
        table = 'finish_fabrics'; // Or fancy
        nameField = 'finish_fabric_name';
      }

      // Simple keyword search in DB
      const searchTerms = extractedData.description.split(' ').filter(w => w.length > 3);
      if (searchTerms.length === 0) return [];

      const query = supabase
        .from(table)
        .select('*');
        
      // Construct OR filter for keywords
      const orString = searchTerms.map(term => `${nameField}.ilike.%${term}%`).join(',');
      if (orString) query.or(orString);

      const { data, error } = await query.limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Mapping error:", error);
      return [];
    }
  },

  // Confirm and save the mapping
  confirmMapping: async (billId, mappingDetails) => {
    // 1. Update Bill Record
    const { error: billError } = await supabase
      .from('bulk_bills') // Ensure this table exists or use generic bills table
      .update({
        mapped_fabric_id: mappingDetails.fabric_id,
        fabric_type: mappingDetails.fabric_type,
        supplier_id: mappingDetails.supplier_id,
        status: 'Confirmed'
      })
      .eq('id', billId);

    if (billError) throw billError;

    // 2. Optionally update fabric cost if selected
    if (mappingDetails.update_cost && mappingDetails.new_cost) {
       const table = mappingDetails.fabric_type === 'Base' ? 'base_fabrics' : 'finish_fabrics';
       const costField = mappingDetails.fabric_type === 'Base' ? 'supplier_cost' : 'job_worker_cost';
       
       await supabase.from(table)
         .update({ [costField]: mappingDetails.new_cost })
         .eq('id', mappingDetails.fabric_id);
    }

    return true;
  }
};