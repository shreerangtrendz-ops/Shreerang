import { PROCESS_CODES, CLASS_CODES, TAG_CODES, VA_CODES, CONCEPT_CODES } from './fabricMasterReferences';

/**
 * Helper to get code from a map safely
 */
export const buildSKUComponent = (value, codeMap) => {
  if (!value) return '';
  return codeMap[value] || value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
};

export const shouldOmitClass = (fabricClass) => !fabricClass || fabricClass.toLowerCase() === 'regular';
export const shouldOmitTag = (tag) => !tag || tag.toLowerCase() === 'without foil';

/**
 * Base Fabric
 */
export const generateBaseFabricName = (width, fabricName, process) => {
  return [width, fabricName, process].filter(Boolean).join(' ');
};

export const generateBaseFabricSKU = (width, shortCode, process) => {
  const w = width ? width.replace(/[^0-9]/g, '') : '';
  const sc = shortCode || '';
  const pc = buildSKUComponent(process, PROCESS_CODES);
  return [w, sc, pc].filter(Boolean).join('-');
};

/**
 * Finish Fabric
 */
export const generateFinishFabricName = (width, fabricName, fabricClass, tags, process) => {
  const parts = [width, fabricName];
  if (!shouldOmitClass(fabricClass)) parts.push(fabricClass);
  if (!shouldOmitTag(tags)) parts.push(tags);
  parts.push(process);
  return parts.filter(Boolean).join(' ');
};

export const generateFinishFabricSKU = (width, shortCode, fabricClass, tags, process) => {
  const w = width ? width.replace(/[^0-9]/g, '') : '';
  const parts = [w, shortCode];
  
  if (!shouldOmitClass(fabricClass)) parts.push(buildSKUComponent(fabricClass, CLASS_CODES));
  if (!shouldOmitTag(tags)) parts.push(buildSKUComponent(tags, TAG_CODES));
  
  parts.push(buildSKUComponent(process, PROCESS_CODES));
  return parts.filter(Boolean).join('-');
};

/**
 * Fancy Finish Fabric
 */
export const generateFancyFinishName = (width, fabricName, fabricClass, tags, process, va, concept) => {
  const baseName = generateFinishFabricName(width, fabricName, fabricClass, tags, process);
  return [baseName, va, concept].filter(Boolean).join(' ');
};

export const generateFancyFinishSKU = (width, shortCode, fabricClass, tags, process, va, concept) => {
  const baseSku = generateFinishFabricSKU(width, shortCode, fabricClass, tags, process);
  const vaCode = buildSKUComponent(va, VA_CODES);
  const conCode = buildSKUComponent(concept, CONCEPT_CODES);
  return [baseSku, vaCode, conCode].filter(Boolean).join('-');
};

/**
 * Fancy Base Fabric
 */
export const generateFancyBaseName = (width, fabricName, va, concept) => {
  return [width, fabricName, va, concept].filter(Boolean).join(' ');
};

export const generateFancyBaseSKU = (width, shortCode, va, concept) => {
  const w = width ? width.replace(/[^0-9]/g, '') : '';
  const vaCode = buildSKUComponent(va, VA_CODES);
  const conCode = buildSKUComponent(concept, CONCEPT_CODES);
  return [w, shortCode, vaCode, conCode].filter(Boolean).join('-');
};