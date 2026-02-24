import { supabase } from '@/lib/customSupabaseClient';

export const DropdownManagementService = {
  // --- READ OPERATIONS ---

  getAllCategories: async () => {
    try {
      console.log('🔄 Fetching all dropdown categories...');
      const { data, error } = await supabase
        .from('dropdown_categories')
        .select('*')
        .order('category_name');
      
      if (error) throw error;
      console.log(`✅ Fetched ${data.length} categories.`);
      return data;
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      throw new Error(`Failed to load categories: ${error.message}`);
    }
  },

  getDropdownsByCategory: async (categoryName) => {
    try {
      console.log(`🔄 Fetching options for category: ${categoryName}`);
      
      // 1. Get Category ID
      const { data: catData, error: catError } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_name', categoryName)
        .maybeSingle();

      if (catError) throw catError;
      if (!catData) {
        console.warn(`⚠️ Category '${categoryName}' not found in database.`);
        return [];
      }

      // 2. Get Options
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('id, option_name, option_code, created_at, is_active, category_id')
        .eq('category_id', catData.id)
        .eq('is_active', true)
        .order('option_name');

      if (error) throw error;
      
      console.log(`✅ Fetched ${data.length} options for ${categoryName}.`);

      return data.map(item => ({
        id: item.id,
        option_name: item.option_name,
        option_code: item.option_code,
        created_at: item.created_at,
        is_active: item.is_active,
        category_id: item.category_id
      }));
    } catch (error) {
      console.error(`❌ Error fetching dropdowns for ${categoryName}:`, error);
      throw new Error(`Failed to load options for ${categoryName}: ${error.message}`);
    }
  },

  getAllActiveDropdownsGrouped: async () => {
    try {
      console.log('🔄 DropdownManagementService: Fetching ALL grouped dropdowns...');
      
      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from('dropdown_categories')
        .select('id, category_name');
      
      if (catError) throw catError;

      // Fetch active options
      const { data: options, error: optError } = await supabase
        .from('dropdown_options')
        .select('id, category_id, option_name, option_code')
        .eq('is_active', true)
        .order('option_name');

      if (optError) throw optError;

      console.log(`📊 Stats: Found ${categories.length} categories and ${options.length} total options.`);

      const grouped = {};
      
      // Initialize all categories with empty arrays
      categories.forEach(cat => {
        grouped[cat.category_name] = [];
      });

      // Populate arrays
      options.forEach(opt => {
        const cat = categories.find(c => c.id === opt.category_id);
        if (cat) {
          grouped[cat.category_name].push(opt);
        } else {
          // Fallback: If option exists but category link is broken or missing in local fetch
          // console.warn('Orphaned option found:', opt);
        }
      });

      return grouped;
    } catch (error) {
      console.error('❌ Error fetching grouped dropdowns:', error);
      throw error;
    }
  },

  // --- WRITE OPERATIONS ---

  addDropdownOption: async (categoryName, value, code) => {
    try {
      console.log(`➕ Adding dropdown option: ${value} to ${categoryName}`);
      
      if (!categoryName || !value) throw new Error("Missing required fields");

      // 1. Get or Create Category
      let { data: catData, error: catError } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_name', categoryName)
        .maybeSingle();

      if (catError) throw catError;

      if (!catData) {
        console.log(`Creating new category: ${categoryName}`);
        const { data: newCat, error: createError } = await supabase
          .from('dropdown_categories')
          .insert([{ category_name: categoryName }])
          .select()
          .single();
        if (createError) throw createError;
        catData = newCat;
      }

      // 2. Check Duplicate
      const { data: existing } = await supabase
        .from('dropdown_options')
        .select('id')
        .eq('category_id', catData.id)
        .ilike('option_name', value) // Case insensitive check
        .maybeSingle();

      if (existing) {
        console.warn(`Duplicate found for ${value}`);
        throw new Error(`Option '${value}' already exists.`);
      }

      // 3. Insert
      const { data, error } = await supabase
        .from('dropdown_options')
        .insert([{
          category_id: catData.id,
          option_name: value,
          option_code: code || value.substring(0, 3).toUpperCase(),
          is_active: true,
          // Fallback fields for compatibility
          field_name: categoryName,
          fabric_category: 'GENERAL'
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Option added successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Add Option Error:', error);
      throw error;
    }
  },

  updateDropdownOption: async (id, value, code) => {
    try {
      console.log(`✏️ Updating option ID ${id} to Value: ${value}, Code: ${code}`);
      
      const { data, error } = await supabase
        .from('dropdown_options')
        .update({ option_name: value, option_code: code })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Update success:', data);
      return data;
    } catch (error) {
      console.error('❌ Update Option Error:', error);
      throw error;
    }
  },

  deleteDropdownOption: async (id) => {
    try {
      console.log(`🗑️ Deleting option ID ${id}`);
      
      const { error } = await supabase
        .from('dropdown_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Delete success');
      return true;
    } catch (error) {
      console.error('❌ Delete Option Error:', error);
      throw error;
    }
  }
};