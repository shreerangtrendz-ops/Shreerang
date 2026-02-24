import { DropdownManagementService } from '@/services/DropdownManagementService';
import { supabase } from '@/lib/customSupabaseClient';

// Full list of data as requested
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
    { value: '60"', code: '60' }
  ],
  base: [
    { value: 'Cotton', code: 'CTN' },
    { value: 'Rayon', code: 'RYN' },
    { value: 'Viscose', code: 'VIS' },
    { value: 'Modal', code: 'MDL' },
    { value: 'Polyester', code: 'POLY' },
    { value: 'Silk', code: 'SLK' },
    { value: 'Linen', code: 'LIN' }
  ],
  construction: [
    { value: '30x30', code: '3030' },
    { value: '40x40', code: '4040' },
    { value: '60x60', code: '6060' },
    { value: '92x88', code: '9288' }
  ],
  stretchability: [
    { value: 'None', code: 'NONE' },
    { value: 'Low', code: 'LOW' },
    { value: 'Medium', code: 'MED' },
    { value: 'High', code: 'HIGH' }
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
    { value: 'Silky', code: 'SLKY' }
  ],
  yarn_type: [
    { value: 'Combed', code: 'CMB' },
    { value: 'Carded', code: 'CRD' },
    { value: 'Open End', code: 'OE' }
  ],
  yarn_count: [
    { value: '30s', code: '30S' },
    { value: '40s', code: '40S' },
    { value: '50s', code: '50S' },
    { value: '60s', code: '60S' }
  ],
  process_type: [
    { value: 'Dyeing', code: 'DYE' },
    { value: 'Printing', code: 'PRT' },
    { value: 'Embroidery', code: 'EMB' }
  ],
  gsm_tolerance: [
     { value: '+/- 5%', code: '5PCT' },
     { value: '+/- 10%', code: '10PCT' }
  ]
};

/**
 * Reseeds the dropdown data.
 * Checks for existence before inserting to avoid duplicates.
 */
export const reseedDropdownData = async () => {
  try {
    console.log('🌱 Starting database reseed...');
    let insertedCount = 0;
    
    for (const [categoryName, options] of Object.entries(SEED_DATA)) {
      // 1. Ensure category exists
      let { data: catData, error: catError } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_name', categoryName)
        .maybeSingle();

      if (catError) {
          console.error(`Error checking category ${categoryName}:`, catError);
          continue;
      }

      if (!catData) {
        console.log(`Creating category: ${categoryName}`);
        const { data: newCat, error: createError } = await supabase
          .from('dropdown_categories')
          .insert([{ category_name: categoryName }])
          .select()
          .single();
        if (createError) {
          console.error(`Error creating category ${categoryName}:`, createError);
          continue;
        }
        catData = newCat;
      }

      // 2. Insert options
      for (const option of options) {
        // Check if exists in this category
        const { data: existing } = await supabase
          .from('dropdown_options')
          .select('id')
          .eq('category_id', catData.id)
          .ilike('option_name', option.value) // Case insensitive check
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase
            .from('dropdown_options')
            .insert([{
              category_id: catData.id,
              option_name: option.value,
              option_code: option.code,
              is_active: true,
              field_name: categoryName, // Backward compatibility
              fabric_category: 'GENERAL'
            }]);
          
          if (insertError) {
            console.error(`Failed to insert ${categoryName}/${option.value}:`, insertError);
          } else {
            console.log(`Inserted: ${categoryName} -> ${option.value}`);
            insertedCount++;
          }
        }
      }
    }
    
    console.log(`✅ Reseed complete. Added ${insertedCount} new options.`);
    return { success: true, insertedCount };
  } catch (error) {
    console.error("Critical seeding error:", error);
    return { success: false, error };
  }
};

/**
 * Initializes dropdowns only if table is completely empty.
 */
export const initializeDropdowns = async () => {
  try {
    const { count, error } = await supabase
      .from('dropdown_options')
      .select('*', { count: 'exact', head: true });
      
    if (error) throw error;
    
    if (count === 0) {
      console.log("Dropdowns empty, seeding defaults...");
      return await reseedDropdownData();
    }
    return { success: true, message: 'Dropdowns already initialized' };
  } catch (error) {
    console.error("Initialization check failed:", error);
    return { success: false, error };
  }
};