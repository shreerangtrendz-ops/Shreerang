import { supabase } from '@/lib/customSupabaseClient';

const createHSNService = (category) => ({
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('hsn_codes')
        .select('*')
        .eq('category', category)
        .order('hsn_code', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${category} HSN codes:`, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('hsn_codes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching ${category} HSN code by id:`, error);
      return null;
    }
  },

  async create(data) {
    try {
      const payload = { ...data, category };
      const { data: result, error } = await supabase
        .from('hsn_codes')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`Error creating ${category} HSN code:`, error);
      return null;
    }
  },

  async update(id, data) {
    try {
      const { data: result, error } = await supabase
        .from('hsn_codes')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`Error updating ${category} HSN code:`, error);
      return null;
    }
  },

  async delete(id) {
    try {
      const { error } = await supabase
        .from('hsn_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting ${category} HSN code:`, error);
      return false;
    }
  },

  validateHSNCode(code) {
    if (!code || code.length !== 8 || !/^\d+$/.test(code)) {
      throw new Error("HSN Code must be exactly 8 digits");
    }
    return true;
  },

  exportToExcel(data) {
    console.log(`Exporting ${category} HSN codes to Excel:`, data);
    // Placeholder for actual excel export logic using xlsx
  }
});

export const ProcessHSNService = createHSNService('process');
export const ValueAdditionHSNService = createHSNService('value_addition');
export const ExpenseHSNService = createHSNService('expense');
export const GarmentHSNService = createHSNService('garment');