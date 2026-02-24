import { PROCESS_CODES, PROCESS_TYPE_CODES } from './processSpecificationConstants';
import { VALUE_ADDITION_CODES, CONCEPT_CODES } from './valueAdditionConstants';

export const getProcessTypeCode = (process, processType) => {
  return PROCESS_TYPE_CODES[processType] || '';
};

export const getValueAdditionCode = (valueAddition) => {
  return VALUE_ADDITION_CODES[valueAddition] || '';
};

export const getConceptCode = (valueAddition, concept) => {
  // Special handling for Washing if needed, otherwise standard mapping
  return CONCEPT_CODES[concept] || '';
};

export const generateFinishFabricName = (baseFabricName, process, processType, width, fabricClass, tags, finish) => {
  // Formula: Base Fabric Name + Process + Process Type + Finish Details
  // Example: "58 Cotton Poplin Greige Mill Print Procion Regular Foil Bio Wash"
  // Adjust based on specific naming convention requirements
  const parts = [
    baseFabricName,
    process,
    processType,
    width !== baseFabricName?.split(' ')[0] ? width : null, // Only add width if different or not in base
    fabricClass,
    tags,
    finish
  ].filter(Boolean);
  
  return parts.join(' ');
};

export const generateFinishFabricSKU = (baseFabricSKU, process, processType) => {
  if (!baseFabricSKU) return '';
  const pCode = PROCESS_CODES[process] || 'XX';
  const ptCode = PROCESS_TYPE_CODES[processType] || 'XX';
  return `${baseFabricSKU}-${pCode}${ptCode}`;
};

export const generateFancyFinishFabricName = (finishFabricName, valueAddition, thread, concept) => {
  const parts = [
    finishFabricName,
    valueAddition,
    thread,
    concept
  ].filter(Boolean);
  return parts.join(' ');
};

export const generateFancyFinishFabricSKU = (finishFabricSKU, valueAddition, concept) => {
  if (!finishFabricSKU) return '';
  const vaCode = VALUE_ADDITION_CODES[valueAddition] || 'XX';
  const cCode = CONCEPT_CODES[concept] || 'XX';
  return `${finishFabricSKU}-${vaCode}${cCode}`;
};

export const validateSKUUniqueness = async (sku, tableName, excludeId = null) => {
  // This would typically involve a DB call.
  // For helper utility, we might just return the logic or require supabase client injection
  return true; // Placeholder
};