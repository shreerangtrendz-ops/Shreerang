import { supabase } from '@/lib/customSupabaseClient';

export const SchiffliCostingService = {
  calculatePieceBasedSchiffli: (pieceSizeMeters, completePcs, incompletePcs, wastageMeters) => {
    // Basic logic
    const totalPcs = Number(completePcs) + Number(incompletePcs);
    const totalMeters = (totalPcs * Number(pieceSizeMeters)) + Number(wastageMeters);
    return { totalPcs, totalMeters };
  },

  calculateFinalCostPerMeter: (totalCost, finalOutputMeters) => {
    if (!finalOutputMeters || finalOutputMeters <= 0) return 0;
    return (Number(totalCost) / Number(finalOutputMeters)).toFixed(2);
  },

  saveSchiffliCosting: async (data) => {
    const { error, data: result } = await supabase
      .from('schiffli_costing')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  listCostings: async (fabricId) => {
    const { data, error } = await supabase
      .from('schiffli_costing')
      .select('*')
      .eq('fabric_id', fabricId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};