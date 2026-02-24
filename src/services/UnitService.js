import { supabase } from '@/lib/customSupabaseClient';

export const UnitService = {
  // --- JOB WORK UNITS ---
  getJobWorkUnits: async () => {
    const { data, error } = await supabase
      .from('job_work_units')
      .select('*')
      .order('unit_name');
    if (error) throw error;
    return data;
  },

  addJobWorkUnit: async (unitData) => {
    const { data, error } = await supabase
      .from('job_work_units')
      .insert([unitData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateJobWorkUnit: async (id, unitData) => {
    const { data, error } = await supabase
      .from('job_work_units')
      .update(unitData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteJobWorkUnit: async (id) => {
    const { error } = await supabase
      .from('job_work_units')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // --- VA UNITS ---
  getVAUnits: async () => {
    const { data, error } = await supabase
      .from('va_units')
      .select('*')
      .order('unit_name');
    if (error) throw error;
    return data;
  },

  addVAUnit: async (unitData) => {
    const { data, error } = await supabase
      .from('va_units')
      .insert([unitData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateVAUnit: async (id, unitData) => {
    const { data, error } = await supabase
      .from('va_units')
      .update(unitData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteVAUnit: async (id) => {
    const { error } = await supabase
      .from('va_units')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};