import { supabase } from '@/lib/customSupabaseClient';

const DROPDOWN_DATA = [
  // Process
  { category: 'process', value: 'Greige', code: 'GRG' },
  { category: 'process', value: 'RFD', code: 'RFD' },
  { category: 'process', value: 'PFD', code: 'PFD' },
  { category: 'process', value: 'Bleached', code: 'BLC' },
  { category: 'process', value: 'Dyed', code: 'DYE' },
  { category: 'process', value: 'Printed', code: 'PRT' },
  
  // Width
  { category: 'width', value: '36"', code: '36' },
  { category: 'width', value: '44"', code: '44' },
  { category: 'width', value: '54"', code: '54' },
  { category: 'width', value: '58"', code: '58' },
  { category: 'width', value: '60"', code: '60' },
  { category: 'width', value: '63"', code: '63' },
  { category: 'width', value: '72"', code: '72' },

  // Base
  { category: 'base', value: 'Cotton', code: 'CTN' },
  { category: 'base', value: 'Rayon', code: 'RYN' },
  { category: 'base', value: 'Viscose', code: 'VIS' },
  { category: 'base', value: 'Modal', code: 'MDL' },
  { category: 'base', value: 'Polyester', code: 'POLY' },
  { category: 'base', value: 'Silk', code: 'SLK' },
  { category: 'base', value: 'Linen', code: 'LIN' },
  { category: 'base', value: 'Georgette', code: 'GT' },
  { category: 'base', value: 'Chiffon', code: 'CFN' },
  { category: 'base', value: 'Crepe', code: 'CRP' },

  // Construction
  { category: 'construction', value: '30x30', code: '3030' },
  { category: 'construction', value: '40x40', code: '4040' },
  { category: 'construction', value: '60x60', code: '6060' },
  { category: 'construction', value: '92x88', code: '9288' },
  { category: 'construction', value: '132x72', code: '13272' },

  // Stretchability
  { category: 'stretchability', value: 'None', code: 'NONE' },
  { category: 'stretchability', value: 'Low', code: 'LOW' },
  { category: 'stretchability', value: 'Medium', code: 'MED' },
  { category: 'stretchability', value: 'High', code: 'HIGH' },
  { category: 'stretchability', value: '2-Way', code: '2WAY' },
  { category: 'stretchability', value: '4-Way', code: '4WAY' },

  // Transparency
  { category: 'transparency', value: 'Opaque', code: 'OPQ' },
  { category: 'transparency', value: 'Semi-Transparent', code: 'SEMI' },
  { category: 'transparency', value: 'Transparent', code: 'TRANS' },
  { category: 'transparency', value: 'Sheer', code: 'SHEER' },

  // Handfeel
  { category: 'handfeel', value: 'Soft', code: 'SOFT' },
  { category: 'handfeel', value: 'Rough', code: 'RGH' },
  { category: 'handfeel', value: 'Smooth', code: 'SMTH' },
  { category: 'handfeel', value: 'Silky', code: 'SLKY' },
  { category: 'handfeel', value: 'Crisp', code: 'CRSP' },
  { category: 'handfeel', value: 'Textured', code: 'TXTR' },

  // Yarn Type
  { category: 'yarn_type', value: 'Combed', code: 'CMB' },
  { category: 'yarn_type', value: 'Carded', code: 'CRD' },
  { category: 'yarn_type', value: 'Open End', code: 'OE' },
  { category: 'yarn_type', value: 'Ring Spun', code: 'RSP' },
  { category: 'yarn_type', value: 'Compact', code: 'CPT' },

  // Yarn Count
  { category: 'yarn_count', value: '30s', code: '30S' },
  { category: 'yarn_count', value: '40s', code: '40S' },
  { category: 'yarn_count', value: '50s', code: '50S' },
  { category: 'yarn_count', value: '60s', code: '60S' },
  { category: 'yarn_count', value: '80s', code: '80S' },

  // Process Type
  { category: 'process_type', value: 'Dyeing', code: 'DYE' },
  { category: 'process_type', value: 'Printing', code: 'PRT' },
  { category: 'process_type', value: 'Embroidery', code: 'EMB' },
  { category: 'process_type', value: 'Washing', code: 'WSH' },

  // Dye Used
  { category: 'dye_used', value: 'Reactive', code: 'RCT' },
  { category: 'dye_used', value: 'Disperse', code: 'DSP' },
  { category: 'dye_used', value: 'Pigment', code: 'PGM' },
  { category: 'dye_used', value: 'Vat', code: 'VAT' },

  // Class
  { category: 'class', value: 'Premium', code: 'PRM' },
  { category: 'class', value: 'Standard', code: 'STD' },
  { category: 'class', value: 'Economy', code: 'ECO' },

  // Foil Tag
  { category: 'foil_tag', value: 'Gold Foil', code: 'GLD' },
  { category: 'foil_tag', value: 'Silver Foil', code: 'SLV' },
  { category: 'foil_tag', value: 'No Foil', code: 'NOF' },

  // Finish Type
  { category: 'finish_type', value: 'Regular', code: 'REG' },
  { category: 'finish_type', value: 'Soft Finish', code: 'SFT' },
  { category: 'finish_type', value: 'Hard Finish', code: 'HRD' },
  { category: 'finish_type', value: 'Silicon', code: 'SIL' },
  { category: 'finish_type', value: 'Bio-Wash', code: 'BIO' },

  // VA Category
  { category: 'va_category', value: 'Hakoba', code: 'HAK' },
  { category: 'va_category', value: 'Embroidery', code: 'EMB' },
  { category: 'va_category', value: 'Handwork', code: 'HND' },
  { category: 'va_category', value: 'Deca', code: 'DEC' },
  { category: 'va_category', value: 'Washing', code: 'WSH' }
];

export const quickSeedAllDropdowns = async () => {
  console.log('🌱 Quick Seed: Starting...');
  
  try {
    // 1. Clear existing options
    // Using a broad delete. In production, this might be dangerous, but for fixing this issue it's necessary.
    const { error: deleteError } = await supabase
      .from('dropdown_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
    if (deleteError) {
      console.error('❌ Quick Seed: Error clearing table', deleteError);
      // Continue anyway, maybe it's empty
    } else {
      console.log('🗑️ Quick Seed: Cleared existing dropdowns.');
    }

    // 2. Insert new data
    // Map to ensure we populate legacy fields too for safety
    const payload = DROPDOWN_DATA.map(item => ({
      category: item.category,
      value: item.value,
      code: item.code,
      
      // Legacy fields mapping to ensure compatibility with older services
      field_name: item.category,
      option_name: item.value,
      option_code: item.code,
      fabric_category: 'GENERAL',
      is_active: true
    }));

    const { data, error: insertError } = await supabase
      .from('dropdown_options')
      .insert(payload)
      .select();

    if (insertError) {
      console.error('❌ Quick Seed: Insert failed', insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`✅ Quick Seed: Successfully inserted ${data?.length || 0} items.`);
    return { success: true, count: data?.length || 0 };

  } catch (err) {
    console.error('❌ Quick Seed: Unexpected error', err);
    return { success: false, error: err.message };
  }
};