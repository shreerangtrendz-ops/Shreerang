import { supabase } from '@/lib/customSupabaseClient';

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePhone = (phone) => {
  const re = /^[0-9]{10}$/;
  return re.test(String(phone));
};

export const validatePercentage = (value) => {
  const num = Number(value);
  return !isNaN(num) && num >= 0 && num <= 100;
};

export const validatePositiveNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

export const validateRequired = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== '';
};

export const validateUniqueDesignNumber = (designNumber, existingDesigns = []) => {
  return !existingDesigns.some(d => d.design_number.toLowerCase() === designNumber.toLowerCase());
};

export const validateFabricName = (name) => {
  return validateRequired(name) && name.length >= 3;
};

export const validateWidth = (width) => {
  return validateRequired(width); // Usually a dropdown string or number, just needs to exist
};

export const validateGSM = (gsm) => {
  return !gsm || validatePositiveNumber(gsm); // Optional but if present must be positive
};

/**
 * Checks if a SKU is unique in the given table.
 * @param {string} sku - The SKU to check.
 * @param {string} tableName - The table to check against.
 * @param {string} excludeId - ID to exclude (for update operations).
 * @param {string} columnName - The column name for SKU (defaults to generated_sku).
 * @returns {Promise<string|null>} - Returns error message if duplicate, null if unique.
 */
export const validateSKUUnique = async (sku, tableName, excludeId = null, columnName = 'generated_sku') => {
  if (!sku) return null;

  // Map common table names to their SKU columns if not provided
  let actualColumn = columnName;
  if (columnName === 'generated_sku') {
     if (tableName === 'fancy_base_fabrics') actualColumn = 'sku';
     else if (tableName === 'fancy_finish_fabrics') actualColumn = 'fancy_finish_fabric_sku';
     else if (tableName === 'finish_fabrics') actualColumn = 'finish_fabric_sku';
     // base_fabrics uses generated_sku
  }

  try {
    let query = supabase.from(tableName).select('id').eq(actualColumn, sku);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('SKU validation error:', error);
      return null; // Skip validation on system error to avoid blocking, or throw
    }
    
    if (data && data.length > 0) {
      return `SKU "${sku}" already exists.`;
    }
    
    return null; // Unique
  } catch (err) {
    console.error('SKU check failed:', err);
    return null;
  }
};