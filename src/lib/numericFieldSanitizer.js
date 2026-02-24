/**
 * Utility to sanitize and validate numeric fields in form data.
 * Converts empty strings to null.
 * Validates that required numeric fields are numbers > 0.
 * 
 * @param {Object} formData - The form data object
 * @param {Array<string>} numericFields - List of field keys that should be treated as numeric
 * @param {Array<string>} requiredFields - List of field keys that are strictly required and must be > 0
 * @returns {Object} Sanitized data object
 * @throws {Error} If validation fails
 */
export const sanitizeNumericFields = (formData, numericFields = [], requiredFields = []) => {
  const sanitized = { ...formData };
  
  for (const field of numericFields) {
    const value = sanitized[field];
    
    // Convert empty values to null
    if (value === '' || value === undefined || value === null) {
      sanitized[field] = null;
    } else {
      // Attempt conversion to number
      sanitized[field] = Number(value);
    }

    // Validate required fields
    if (requiredFields.includes(field)) {
      if (sanitized[field] === null || isNaN(sanitized[field]) || sanitized[field] <= 0) {
        throw new Error(`Invalid input: "${field}" is required and must be greater than 0.`);
      }
    } else if (sanitized[field] !== null && isNaN(sanitized[field])) {
      throw new Error(`Invalid input: "${field}" must be a valid number.`);
    }
  }

  return sanitized;
};