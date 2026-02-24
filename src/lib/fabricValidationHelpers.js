import { supabase } from '@/lib/customSupabaseClient';

export const validateSKUUnique = async (sku, excludeId = null) => {
  if (!sku) return { valid: false, message: 'SKU is required' };
  
  let query = supabase
    .from('base_fabrics')
    .select('id')
    .eq('sku', sku);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Validation Error:', error);
    return { valid: false, message: 'Error validating SKU' };
  }

  return { 
    valid: data.length === 0, 
    message: data.length > 0 ? 'SKU already exists' : '' 
  };
};

export const validateFabricName = (name) => {
  if (!name || name.trim().length < 3) return 'Fabric Name must be at least 3 characters';
  return null;
};

export const validateWidth = (width) => {
  if (!width) return 'Width is required';
  return null;
};

export const validateGSM = (gsm) => {
  if (!gsm) return null; // Optional
  if (isNaN(gsm) || Number(gsm) <= 0) return 'GSM must be a positive number';
  return null;
};

export const validateWeight = (weight) => {
  if (!weight) return null; // Optional
  if (isNaN(weight) || Number(weight) <= 0) return 'Weight must be a positive number';
  return null;
};

export const validateHSN = (hsn) => {
  if (!hsn) return null; // Optional but recommended
  const hsnRegex = /^[0-9]{4,8}$/;
  if (!hsnRegex.test(hsn)) return 'HSN must be 4-8 digits';
  return null;
};