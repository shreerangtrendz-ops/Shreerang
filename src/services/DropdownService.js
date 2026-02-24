import { supabase } from '@/lib/customSupabaseClient';

export const DropdownService = {
  getCategories: async () => {
    const { data, error } = await supabase
      .from('dropdown_categories')
      .select('*')
      .order('category_name');
    if (error) throw error;
    return data;
  },

  getOptionsByCategory: async (categoryName) => {
    // First get category ID
    const { data: catData, error: catError } = await supabase
      .from('dropdown_categories')
      .select('id')
      .eq('category_name', categoryName)
      .single();
      
    if (catError || !catData) return [];
    
    const { data, error } = await supabase
      .from('dropdown_options')
      .select('*')
      .eq('category_id', catData.id)
      .eq('is_active', true)
      .order('option_name');
      
    if (error) throw error;
    return data;
  },

  addOption: async (categoryName, optionName, optionCode) => {
    // Get or create category
    let { data: catData } = await supabase
      .from('dropdown_categories')
      .select('id')
      .eq('category_name', categoryName)
      .single();
      
    if (!catData) {
      const { data: newCat } = await supabase
        .from('dropdown_categories')
        .insert([{ category_name: categoryName }])
        .select()
        .single();
      catData = newCat;
    }

    const { data, error } = await supabase
      .from('dropdown_options')
      .insert([{
        category_id: catData.id,
        option_name: optionName,
        option_code: optionCode
      }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  updateOption: async (optionId, updates) => {
    const { data, error } = await supabase
      .from('dropdown_options')
      .update(updates)
      .eq('id', optionId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  deleteOption: async (optionId) => {
    const { error } = await supabase
      .from('dropdown_options')
      .delete()
      .eq('id', optionId);
    if (error) throw error;
    return true;
  }
};