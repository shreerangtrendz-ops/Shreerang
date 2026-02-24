import * as FabricConstants from '@/lib/fabricMasterConstants';
import * as ProcessConstants from '@/lib/processSpecificationConstants';
import * as VAConstants from '@/lib/valueAdditionConstants';

export const getRequiredFieldsForType = (type) => {
  switch (type) {
    case 'base': return ['Fabric Name', 'Width', 'Base', 'Finish'];
    case 'finish': return ['Base Fabric SKU', 'Process'];
    case 'fancy': return ['Finish Fabric SKU', 'Value Addition'];
    default: return [];
  }
};

export const getOptionalFieldsForType = (type) => {
  switch (type) {
    case 'base': return ['Weight', 'GSM', 'GSM Tolerance', 'Construction', 'Stretchability', 'Transparency', 'Handfeel', 'HSN Code', 'Yarn Type', 'Yarn Count', 'Short Code'];
    case 'finish': return ['Process Type', 'Ink Type', 'Width', 'Class', 'Tags', 'Finish'];
    case 'fancy': return ['Thread', 'Concept'];
    default: return [];
  }
};

export const getDropdownOptionsForField = (field) => {
  switch (field) {
    case 'Width': return FabricConstants.WIDTHS;
    case 'Base': return FabricConstants.BASES;
    case 'Finish': return FabricConstants.FINISHES;
    case 'Construction': return FabricConstants.CONSTRUCTIONS;
    case 'Process': return ProcessConstants.PROCESS_OPTIONS;
    case 'Value Addition': return VAConstants.VALUE_ADDITION_TYPES;
    default: return [];
  }
};

export const validateFieldValue = (field, value) => {
  if (!value) return true; // Empty check handled by required check elsewhere usually, or implies optional
  const options = getDropdownOptionsForField(field);
  if (options.length > 0) {
    return options.includes(value);
  }
  return true;
};

export const formatErrorMessage = (field, value, error) => {
  return `${field}: ${error}`;
};

export const generateCSVFromErrors = (errors) => {
  if (!errors || errors.length === 0) return '';
  const header = 'Row,Field,Error Message\n';
  const rows = errors.map(e => `${e.row_number},${e.field_name || '-'},"${e.error_message.replace(/"/g, '""')}"`).join('\n');
  return header + rows;
};