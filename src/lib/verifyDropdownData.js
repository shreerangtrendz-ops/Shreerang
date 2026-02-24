import { supabase } from '@/lib/customSupabaseClient';

/**
 * Verifies the integrity of dropdown data in the database.
 * Checks for:
 * 1. Existence of categories
 * 2. Counts of options per category
 * 3. Table structure accessibility
 */
export const verifyDropdownData = async () => {
  console.log('🔍 Starting Dropdown Data Verification...');
  const results = {
    isValid: false,
    categoriesFound: 0,
    totalOptions: 0,
    categoryCounts: {},
    errors: []
  };

  try {
    // 1. Verify Categories Table
    const { data: categories, error: catError } = await supabase
      .from('dropdown_categories')
      .select('id, category_name');

    if (catError) {
      console.error('❌ Error fetching dropdown_categories:', catError);
      results.errors.push(`Category Fetch Error: ${catError.message}`);
      return results;
    }

    results.categoriesFound = categories.length;
    console.log(`✅ Found ${categories.length} categories.`);

    // 2. Verify Options Table and Count per Category
    // We'll do a raw count or grouped query if possible, or iterate
    const { data: options, error: optError } = await supabase
      .from('dropdown_options')
      .select('id, category_id, option_name, is_active');

    if (optError) {
      console.error('❌ Error fetching dropdown_options:', optError);
      results.errors.push(`Option Fetch Error: ${optError.message}`);
      return results;
    }

    results.totalOptions = options.length;
    console.log(`✅ Found ${options.length} total options.`);

    // Group counts
    const counts = {};
    categories.forEach(cat => {
      const catOptions = options.filter(o => o.category_id === cat.id);
      counts[cat.category_name] = catOptions.length;
      if (catOptions.length === 0) {
        console.warn(`⚠️ Warning: Category '${cat.category_name}' has 0 options.`);
      }
    });

    results.categoryCounts = counts;
    results.isValid = true;
    console.log('📊 Category Counts:', counts);

  } catch (error) {
    console.error('❌ Unexpected verification error:', error);
    results.errors.push(`Unexpected Error: ${error.message}`);
  }

  return results;
};