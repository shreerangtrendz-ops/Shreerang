/**
 * Utility functions for safe array operations and data validation
 */

/**
 * Ensures the input is an array. If not, logs a warning (in dev) and returns an empty array.
 * @param {*} data - The data to validate
 * @param {string} context - Optional context for the warning log
 * @returns {Array} - The original array or an empty array
 */
export const ensureArray = (data, context = '') => {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  
  if (import.meta.env.MODE === 'development') {
    console.warn(`[ArrayValidation] Data is not an array${context ? ` in ${context}` : ''}:`, data);
  }
  return [];
};

/**
 * Safely finds an element in an array with error handling
 * @param {Array} array - The array to search
 * @param {Function} predicate - The find predicate
 * @returns {*} - The found element or undefined
 */
export const safeFind = (array, predicate) => {
  const validArray = ensureArray(array, 'safeFind');
  try {
    return validArray.find(predicate);
  } catch (error) {
    console.error('[ArrayValidation] Error in safeFind:', error);
    return undefined;
  }
};

/**
 * Safely maps an array with error handling
 * @param {Array} array - The array to map
 * @param {Function} callback - The map callback
 * @returns {Array} - The mapped array or empty array
 */
export const safeMap = (array, callback) => {
  const validArray = ensureArray(array, 'safeMap');
  try {
    return validArray.map(callback);
  } catch (error) {
    console.error('[ArrayValidation] Error in safeMap:', error);
    return [];
  }
};

/**
 * Safely filters an array with error handling
 * @param {Array} array - The array to filter
 * @param {Function} predicate - The filter predicate
 * @returns {Array} - The filtered array or empty array
 */
export const safeFilter = (array, predicate) => {
  const validArray = ensureArray(array, 'safeFilter');
  try {
    return validArray.filter(predicate);
  } catch (error) {
    console.error('[ArrayValidation] Error in safeFilter:', error);
    return [];
  }
};