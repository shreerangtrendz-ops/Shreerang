import { supabase } from '@/lib/customSupabaseClient';

/**
 * Comprehensive list of all dropdown data to be seeded.
 */
const SEED_DATA = {
  process: [
    { value: 'Greige', code: 'GRG' },
    { value: 'RFD', code: 'RFD' },
    { value: 'PFD', code: 'PFD' },
    { value: 'Bleached', code: 'BLC' },
    { value: 'Dyed', code: 'DYE' },
    { value: 'Printed', code: 'PRT' }
  ],
  width: [
    { value: '36"', code: '36' },
    { value: '44"', code: '44' },
    { value: '54"', code: '54' },
    { value: '58"', code: '58' },
    { value: '60"', code: '60' },
    { value: '63"', code: '63' },
    { value: '72"', code: '72' }
  ],
  base: [
    { value: 'Cotton', code: 'CTN' },
    { value: 'Rayon', code: 'RYN' },
    { value: 'Viscose', code: 'VIS' },
    { value: 'Modal', code: 'MDL' },
    { value: 'Polyester', code: 'POLY' },
    { value: 'Silk', code: 'SLK' },
    { value: 'Linen', code: 'LIN' },
    { value: 'Georgette', code: 'GT' },
    { value: 'Chiffon', code: 'CFN' },
    { value: 'Crepe', code: 'CRP' }
  ],
  construction: [
    { value: '30x30', code: '3030' },
    { value: '40x40', code: '4040' },
    { value: '60x60', code: '6060' },
    { value: '92x88', code: '9288' },
    { value: '132x72', code: '13272' }
  ],
  stretchability: [
    { value: 'None', code: 'NONE' },
    { value: 'Low', code: 'LOW' },
    { value: 'Medium', code: 'MED' },
    { value: 'High', code: 'HIGH' },
    { value: '2-Way', code: '2WAY' },
    { value: '4-Way', code: '4WAY' }
  ],
  transparency: [
    { value: 'Opaque', code: 'OPQ' },
    { value: 'Semi-Transparent', code: 'SEMI' },
    { value: 'Transparent', code: 'TRANS' },
    { value: 'Sheer', code: 'SHEER' }
  ],
  handfeel: [
    { value: 'Soft', code: 'SOFT' },
    { value: 'Rough', code: 'RGH' },
    { value: 'Smooth', code: 'SMTH' },
    { value: 'Silky', code: 'SLKY' },
    { value: 'Crisp', code: 'CRSP' },
    { value: 'Textured', code: 'TXTR' }
  ],
  yarn_type: [
    { value: 'Combed', code: 'CMB' },
    { value: 'Carded', code: 'CRD' },
    { value: 'Open End', code: 'OE' },
    { value: 'Ring Spun', code: 'RSP' },
    { value: 'Compact', code: 'CPT' }
  ],
  yarn_count: [
    { value: '30s', code: '30S' },
    { value: '40s', code: '40S' },
    { value: '50s', code: '50S' },
    { value: '60s', code: '60S' },
    { value: '80s', code: '80S' }
  ],
  process_type: [
    { value: 'Dyeing', code: 'DYE' },
    { value: 'Printing', code: 'PRT' },
    { value: 'Embroidery', code: 'EMB' },
    { value: 'Washing', code: 'WSH' }
  ],
  dye_used: [
    { value: 'Reactive', code: 'RCT' },
    { value: 'Disperse', code: 'DSP' },
    { value: 'Pigment', code: 'PGM' },
    { value: 'Vat', code: 'VAT' }
  ],
  class: [
    { value: 'Premium', code: 'PRM' },
    { value: 'Standard', code: 'STD' },
    { value: 'Economy', code: 'ECO' }
  ],
  foil_tag: [
    { value: 'Gold Foil', code: 'GLD' },
    { value: 'Silver Foil', code: 'SLV' },
    { value: 'No Foil', code: 'NOF' }
  ],
  finish_type: [
    { value: 'Regular', code: 'REG' },
    { value: 'Soft Finish', code: 'SFT' },
    { value: 'Hard Finish', code: 'HRD' },
    { value: 'Silicon', code: 'SIL' },
    { value: 'Bio-Wash', code: 'BIO' }
  ],
  va_category: [
    { value: 'Hakoba', code: 'HAK' },
    { value: 'Embroidery', code: 'EMB' },
    { value: 'Handwork', code: 'HND' },
    { value: 'Deca', code: 'DEC' },
    { value: 'Washing', code: 'WSH' }
  ],
  va_sub_category_hakoba: [
    { value: 'Schiffli', code: 'SCH' },
    { value: 'Eyelet', code: 'EYL' }
  ],
  va_sub_category_embroidered: [
    { value: 'Sequence', code: 'SEQ' },
    { value: 'Thread', code: 'THR' },
    { value: 'Bead', code: 'BEAD' }
  ],
  va_sub_category_handwork: [
    { value: 'Aari', code: 'AARI' },
    { value: 'Zardosi', code: 'ZAR' }
  ],
  va_sub_category_deca: [
    { value: 'Print Deca', code: 'PRD' },
    { value: 'Plain Deca', code: 'PLD' }
  ],
  va_sub_category_washing: [
    { value: 'Enzyme', code: 'ENZ' },
    { value: 'Stone', code: 'STN' }
  ],
  gsm_tolerance: [
    { value: '+/- 5%', code: '5PCT' },
    { value: '+/- 10%', code: '10PCT' }
  ]
};

export const clearAllDropdowns = async () => {
  console.log('🗑️ Starting cleanup of all dropdown data...');
  try {
    // 1. Delete all options first (child table)
    const { error: optError } = await supabase
      .from('dropdown_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (optError) throw optError;
    console.log('✅ Cleared dropdown_options table');

    // 2. Delete all categories (parent table)
    const { error: catError } = await supabase
      .from('dropdown_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (catError) throw catError;
    console.log('✅ Cleared dropdown_categories table');

    return { success: true, message: 'All dropdown data cleared successfully.' };
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    return { success: false, error: error.message };
  }
};

export const verifyDropdownData = async () => {
  console.log('🔍 Verifying dropdown data...');
  try {
    const { data: categories, error: catError } = await supabase
      .from('dropdown_categories')
      .select('id, category_name');
    
    if (catError) throw catError;

    const { data: options, error: optError } = await supabase
      .from('dropdown_options')
      .select('id, category_id, option_name');

    if (optError) throw optError;

    const stats = {
      totalCategories: categories.length,
      totalOptions: options.length,
      categoryCounts: {},
      isValid: categories.length > 0 && options.length > 0
    };

    categories.forEach(cat => {
      const count = options.filter(opt => opt.category_id === cat.id).length;
      stats.categoryCounts[cat.category_name] = count;
    });

    console.log('✅ Verification stats:', stats);
    return { success: true, stats };
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return { success: false, error: error.message };
  }
};

export const seedDropdownsDirectly = async () => {
  console.log('🌱 Starting direct seed process...');
  const results = {
    addedCategories: 0,
    addedOptions: 0,
    errors: []
  };

  try {
    for (const [categoryName, options] of Object.entries(SEED_DATA)) {
      console.log(`Processing category: ${categoryName}`);
      
      // 1. Ensure category exists (Upsert logic simulation)
      let { data: catData, error: catError } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_name', categoryName)
        .maybeSingle();

      if (catError) {
        console.error(`❌ Error finding category ${categoryName}:`, catError);
        results.errors.push(`Category lookup failed for ${categoryName}`);
        continue;
      }

      if (!catData) {
        const { data: newCat, error: createError } = await supabase
          .from('dropdown_categories')
          .insert([{ category_name: categoryName }])
          .select()
          .single();
        
        if (createError) {
          console.error(`❌ Error creating category ${categoryName}:`, createError);
          results.errors.push(`Failed to create category ${categoryName}`);
          continue;
        }
        catData = newCat;
        results.addedCategories++;
        console.log(`✅ Created new category: ${categoryName}`);
      }

      // 2. Insert Options
      for (const option of options) {
        // Check existence to prevent duplicates if running on partial data
        const { data: existing } = await supabase
          .from('dropdown_options')
          .select('id')
          .eq('category_id', catData.id)
          .ilike('option_name', option.value)
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase
            .from('dropdown_options')
            .insert([{
              category_id: catData.id,
              option_name: option.value,
              option_code: option.code,
              is_active: true,
              field_name: categoryName, // Legacy/Fallback
              fabric_category: 'GENERAL' // Legacy/Fallback
            }]);

          if (insertError) {
            console.error(`❌ Failed to insert option ${option.value}:`, insertError);
            results.errors.push(`Failed option: ${categoryName} -> ${option.value}`);
          } else {
            results.addedOptions++;
          }
        }
      }
    }

    console.log('✅ Seeding complete.', results);
    return { success: true, results };
  } catch (error) {
    console.error('❌ Critical seeding error:', error);
    return { success: false, error: error.message };
  }
};