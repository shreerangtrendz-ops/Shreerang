import { 
  PROCESSES_BY_BASE_PROCESS, PROCESS_SUB_CATEGORIES, 
  THREAD_OPTIONS_BY_VA, CONCEPT_OPTIONS_BY_VA,
  PROCESS_CODES, PROCESS_SUB_CODES, VA_CODES, VA_CONCEPT_CODES,
  CLASS_CODES, TAG_CODES, FINISH_TYPE_CODES
} from '@/lib/fabricHierarchyConstants';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service to handle Fabric Hierarchy logic, naming, SKU generation, and database interactions.
 */
export const FabricHierarchyService = {
  /**
   * Fetch dropdown values from the database for a specific category
   * @param {string} category - The category to fetch (e.g., 'Handfeel', 'Construction')
   * @returns {Promise<Array>} - Array of dropdown objects { label, value, code }
   */
  async fetchDropdownOptions(category) {
    try {
      const { data, error } = await supabase
        .from('custom_dropdown_values')
        .select('value, code, usage_count')
        .eq('category', category)
        .order('usage_count', { ascending: false })
        .order('value', { ascending: true });

      if (error) {
        console.error(`Error fetching dropdown for ${category}:`, error);
        return [];
      }

      return data.map(item => ({
        label: item.value + (item.code ? ` - ${item.code}` : ''),
        value: item.value,
        code: item.code
      }));
    } catch (err) {
      console.error(`Unexpected error fetching ${category}:`, err);
      return [];
    }
  },

  /**
   * Check if a SKU is unique in the given table
   * @param {string} table - Table name to check
   * @param {string} sku - SKU to check
   * @param {string} [excludeId] - Optional ID to exclude (for edit mode)
   * @returns {Promise<boolean>} - True if unique, false otherwise
   */
  async checkSkuUniqueness(table, sku, excludeId = null) {
    if (!sku) return true;
    
    try {
      let query = supabase
        .from(table)
        .select('id')
        .eq('sku', sku);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.length === 0;
    } catch (error) {
      console.error(`Error checking SKU uniqueness for ${table}:`, error);
      return false;
    }
  },

  getProcessOptionsForBase(baseProcess) {
    return PROCESSES_BY_BASE_PROCESS[baseProcess] || [];
  },

  getProcessSubCategoryOptions(process) {
    return PROCESS_SUB_CATEGORIES[process] || [];
  },

  getThreadOptions(valueAddition) {
    return THREAD_OPTIONS_BY_VA[valueAddition] || [];
  },

  getConceptOptions(valueAddition) {
    return CONCEPT_OPTIONS_BY_VA[valueAddition] || [];
  },

  calculateBaseFabricName(width, fabricName, process) {
    if (!width || !fabricName || !process) return '';
    const cleanWidth = width.replace(/[^0-9]/g, '');
    return `${cleanWidth} ${fabricName} ${process}`;
  },

  calculateBaseFabricShortCode(fabricName) {
    if (!fabricName) return '';
    return fabricName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
  },

  calculateBaseFabricSKU(width, shortCode, process) {
    if (!width || !shortCode || !process) return '';
    const cleanWidth = width.replace(/[^0-9]/g, '');
    const pCode = PROCESS_CODES[process] || process.substring(0, 2).toUpperCase();
    return `${cleanWidth}-${shortCode}-${pCode}`;
  },

  calculateFinishFabricName(width, fabricName, processType, fabricClass, tags, finishType, process) {
    const cleanWidth = width ? width.replace(/[^0-9]/g, '') : '';
    // Format: Width + Fabric Name + Process Type + Class + Tags + Process
    const parts = [cleanWidth, fabricName, processType, fabricClass, tags, finishType, process];
    return parts.filter(Boolean).join(' ');
  },

  calculateFinishFabricSKU(width, shortCode, processType, fabricClass, tags, process) {
    if (!width || !shortCode) return '';
    const cleanWidth = width.replace(/[^0-9]/g, '');
    
    // Process Type Code
    const ptCode = PROCESS_SUB_CODES[processType] || (processType ? processType.substring(0, 3).toUpperCase() : '');
    const cCode = CLASS_CODES[fabricClass] || '';
    const tCode = TAG_CODES[tags] || '';
    const pCode = PROCESS_CODES[process] || (process ? process.substring(0, 2).toUpperCase() : '');
    
    // SKU: Width + Short Code + Process Type Code + Class Code + Tags Code + Process Code
    const suffix = [ptCode, cCode, tCode, pCode].filter(Boolean).join('');
    return `${cleanWidth}-${shortCode}-${suffix}`;
  },

  calculateFancyBaseFabricName(width, fabricName, valueAddition, concept) {
    const cleanWidth = width ? width.replace(/[^0-9]/g, '') : '';
    return [cleanWidth, fabricName, valueAddition, concept].filter(Boolean).join(' ');
  },

  calculateFancyBaseFabricSKU(width, shortCode, valueAddition, concept) {
    if (!width || !shortCode) return '';
    const cleanWidth = width.replace(/[^0-9]/g, '');
    const vaCode = VA_CODES[valueAddition] || (valueAddition ? valueAddition.substring(0, 3).toUpperCase() : '');
    const conCode = VA_CONCEPT_CODES[concept] || (concept ? concept.substring(0, 3).toUpperCase() : '');
    
    return `${cleanWidth}-${shortCode}-${vaCode}${conCode}`;
  },

  calculateFancyFinishFabricName(width, fabricName, lastProcessType, fabricClass, tags, lastProcess, valueAddition, concept) {
     const cleanWidth = width ? width.replace(/[^0-9]/g, '') : '';
     // Name: Width + Fabric Name + Last Process Type + Class + Tags + Last Process + Value Addition + Concept
     const parts = [cleanWidth, fabricName, lastProcessType, fabricClass, tags, lastProcess, valueAddition, concept];
     return parts.filter(Boolean).join(' ');
  },

  calculateFancyFinishFabricSKU(width, shortCode, lastProcessType, fabricClass, tags, lastProcess, valueAddition, concept) {
    if (!width || !shortCode) return '';
    const cleanWidth = width.replace(/[^0-9]/g, '');
    
    const ptCode = PROCESS_SUB_CODES[lastProcessType] || (lastProcessType ? lastProcessType.substring(0, 3).toUpperCase() : '');
    const cCode = CLASS_CODES[fabricClass] || '';
    const tCode = TAG_CODES[tags] || '';
    const pCode = PROCESS_CODES[lastProcess] || (lastProcess ? lastProcess.substring(0, 2).toUpperCase() : '');
    const vaCode = VA_CODES[valueAddition] || (valueAddition ? valueAddition.substring(0, 3).toUpperCase() : '');
    const conCode = VA_CONCEPT_CODES[concept] || (concept ? concept.substring(0, 3).toUpperCase() : '');

    // SKU: Width + Short Code + Last Process Type Code + Class Code + Tags Code + Last Process Code + VA Code + VA Concept Code
    const suffix = [ptCode, cCode, tCode, pCode, vaCode, conCode].filter(Boolean).join('');
    return `${cleanWidth}-${shortCode}-${suffix}`;
  },

  // Generic helper for sequential processes
  calculateLastProcessCode(process, subCategory) {
    const pCode = PROCESS_CODES[process] || process?.substring(0, 2).toUpperCase() || '';
    const subCode = PROCESS_SUB_CODES[subCategory] || subCategory?.substring(0, 2).toUpperCase() || '';
    return pCode + subCode;
  },

  // Mock AI Suggestions
  getAISuggestions(fabricName) {
    // In a real app, this would call an API
    // For now, simple keyword matching mock
    const suggestions = {};
    const name = fabricName ? fabricName.toLowerCase() : '';

    if (name.includes('cotton')) {
       suggestions.construction = 'Plain Weave';
       suggestions.handfeel = 'Soft';
       suggestions.transparency = 'Opaque';
       suggestions.hsnCode = '5208';
       suggestions.yarnType = 'Combed';
    } else if (name.includes('silk')) {
       suggestions.construction = 'Satin';
       suggestions.handfeel = 'Silky';
       suggestions.transparency = 'Semi Sheer';
       suggestions.hsnCode = '5007';
       suggestions.yarnType = 'Filament';
    } else if (name.includes('georgette')) {
       suggestions.construction = 'Crepe';
       suggestions.handfeel = 'Rough';
       suggestions.transparency = 'Sheer';
       suggestions.hsnCode = '5407';
       suggestions.yarnType = 'Twisted';
    }
    
    return suggestions;
  }
};