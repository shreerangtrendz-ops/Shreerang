import * as XLSX from 'xlsx';
import { supabase } from '@/lib/customSupabaseClient';
import { FabricService } from '@/services/FabricService';
import { getRequiredFieldsForType, validateFieldValue } from '@/lib/bulkImportHelpers';
import * as FabricConstants from '@/lib/fabricMasterConstants';
import * as ProcessConstants from '@/lib/processSpecificationConstants';
import * as VAConstants from '@/lib/valueAdditionConstants';
import * as HierarchyHelpers from '@/lib/fabricHierarchyHelpers';

export const BulkImportService = {
  async parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames.find(name => name !== 'Instructions') || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },

  mapColumns(data, mapping) {
    return data.map(row => {
      const mappedRow = {};
      Object.keys(mapping).forEach(field => {
        const excelColumn = mapping[field];
        if (excelColumn && row[excelColumn] !== undefined) {
          mappedRow[field] = row[excelColumn];
        }
      });
      return mappedRow;
    });
  },

  validateBaseFabricData(data) {
    const errors = [];
    const required = getRequiredFieldsForType('base');
    
    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      required.forEach(field => {
        if (!row[field]) {
          errors.push({ row_number: rowNum, field_name: field, error_message: 'Required field is missing' });
        }
      });

      if (row['Width'] && !FabricConstants.WIDTHS.includes(row['Width'])) {
        errors.push({ row_number: rowNum, field_name: 'Width', error_message: `Invalid Width. Allowed: ${FabricConstants.WIDTHS.join(', ')}` });
      }
      if (row['Base'] && !FabricConstants.BASES.includes(row['Base'])) {
        errors.push({ row_number: rowNum, field_name: 'Base', error_message: 'Invalid Base' });
      }
      if (row['Finish'] && !FabricConstants.FINISHES.includes(row['Finish'])) {
        errors.push({ row_number: rowNum, field_name: 'Finish', error_message: 'Invalid Finish' });
      }
    });

    return { valid: errors.length === 0, errors, warnings: [] };
  },

  async validateFinishFabricData(data) {
    const errors = [];
    const required = getRequiredFieldsForType('finish');
    const skuCache = new Set();

    // Batch check SKUs could be optimized, for now checking individually or cache if possible.
    // Ideally fetch all SKUs in one query if list is small, or check one by one.
    // Let's optimize by fetching all Base SKUs once.
    const { data: allBaseFabrics } = await supabase.from('base_fabrics').select('sku');
    const validSKUs = new Set(allBaseFabrics?.map(f => f.sku) || []);

    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      required.forEach(field => {
        if (!row[field]) {
          errors.push({ row_number: rowNum, field_name: field, error_message: 'Required field is missing' });
        }
      });

      if (row['Base Fabric SKU'] && !validSKUs.has(row['Base Fabric SKU'])) {
         errors.push({ row_number: rowNum, field_name: 'Base Fabric SKU', error_message: `SKU '${row['Base Fabric SKU']}' not found in Base Fabrics` });
      }
      
      if (row['Process'] && !ProcessConstants.PROCESS_OPTIONS.includes(row['Process'])) {
        errors.push({ row_number: rowNum, field_name: 'Process', error_message: 'Invalid Process' });
      }

      if (row['Process'] && row['Process Type']) {
        const allowedTypes = ProcessConstants.PROCESS_TYPES[row['Process']];
        if (allowedTypes && !allowedTypes.includes(row['Process Type'])) {
           errors.push({ row_number: rowNum, field_name: 'Process Type', error_message: `Invalid Process Type for ${row['Process']}` });
        }
      }
    });

    return { valid: errors.length === 0, errors, warnings: [] };
  },

  async validateFancyFinishFabricData(data) {
    const errors = [];
    const required = getRequiredFieldsForType('fancy');
    
    const { data: allFinishFabrics } = await supabase.from('finish_fabrics').select('finish_fabric_sku');
    const validSKUs = new Set(allFinishFabrics?.map(f => f.finish_fabric_sku) || []);

    data.forEach((row, index) => {
      const rowNum = index + 1;
      required.forEach(field => {
        if (!row[field]) {
          errors.push({ row_number: rowNum, field_name: field, error_message: 'Required field is missing' });
        }
      });

      if (row['Finish Fabric SKU'] && !validSKUs.has(row['Finish Fabric SKU'])) {
        errors.push({ row_number: rowNum, field_name: 'Finish Fabric SKU', error_message: `SKU '${row['Finish Fabric SKU']}' not found in Finish Fabrics` });
      }

      if (row['Value Addition'] && !VAConstants.VALUE_ADDITION_TYPES.includes(row['Value Addition'])) {
        errors.push({ row_number: rowNum, field_name: 'Value Addition', error_message: 'Invalid Value Addition' });
      }
    });

    return { valid: errors.length === 0, errors, warnings: [] };
  },

  async createImportRecord(type, total) {
    const { data, error } = await supabase.from('imports').insert({
      import_type: type,
      total_items: total,
      status: 'processing'
    }).select().single();
    if (error) throw error;
    return data;
  },

  async updateImportRecord(id, updates) {
    await supabase.from('imports').update(updates).eq('id', id);
  },

  async logErrors(importId, errors) {
    if (!errors || errors.length === 0) return;
    const errorRecords = errors.map(e => ({
      import_id: importId,
      row_number: e.row_number,
      field_name: e.field_name,
      error_message: e.error_message
    }));
    await supabase.from('import_errors').insert(errorRecords);
  },

  async importBaseFabrics(data) {
    const importRecord = await this.createImportRecord('base_fabric', data.length);
    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    // Prepare data
    const batchData = data.map((row, idx) => {
       try {
         // Generate fields
         const baseCode = FabricConstants.BASE_CODES[row['Base']] || '';
         const constCode = FabricConstants.CONSTRUCTION_CODES[row['Construction']] || '';
         let shortCode = row['Short Code'];
         if (!shortCode) {
            shortCode = FabricConstants.generateShortCode(row['Base'], row['Construction']);
         }
         const sku = FabricConstants.generateSKU(row['Width'], shortCode, row['Finish']);
         const baseFabricName = FabricConstants.generateBaseFabricName(row['Width'], row['Fabric Name'], row['Finish']);

         return {
           fabric_name: row['Fabric Name'],
           base_fabric_name: baseFabricName,
           finish_type: row['Finish'],
           width: row['Width'],
           base: row['Base'],
           base_code: baseCode,
           weight: row['Weight'],
           gsm: row['GSM'],
           gsm_tolerance: row['GSM Tolerance'],
           construction: row['Construction'],
           construction_code: constCode,
           stretchability: row['Stretchability'],
           transparency: row['Transparency'],
           handfeel: row['Handfeel'],
           hsn_code: row['HSN Code'],
           yarn_type: row['Yarn Type'],
           yarn_count: row['Yarn Count'],
           short_code: shortCode,
           sku: sku,
           status: 'active'
         };
       } catch (e) {
         failedCount++;
         errors.push({ row_number: idx + 1, field_name: 'Generation', error_message: e.message });
         return null;
       }
    }).filter(item => item !== null);

    // Insert to DB
    try {
      if (batchData.length > 0) {
        const { error } = await supabase.from('base_fabrics').insert(batchData);
        if (error) throw error;
        successCount = batchData.length;
      }
    } catch (e) {
      // If batch insert fails, we mark all as failed for simplicity or handle individually if needed
      // For now, assuming standard bulk fail
      successCount = 0;
      failedCount = data.length;
      errors.push({ row_number: 0, field_name: 'Database', error_message: e.message });
    }

    await this.updateImportRecord(importRecord.id, {
       successful_items: successCount,
       failed_items: failedCount,
       status: failedCount === 0 ? 'completed' : 'completed_with_errors'
    });
    await this.logErrors(importRecord.id, errors);

    return { success: successCount, failed: failedCount, errors };
  },

  async importFinishFabrics(data) {
    const importRecord = await this.createImportRecord('finish_fabric', data.length);
    const errors = [];
    const validRows = [];

    // Need Base Fabric IDs map
    const { data: bases } = await supabase.from('base_fabrics').select('id, sku, base_fabric_name');
    const baseMap = {};
    bases?.forEach(b => baseMap[b.sku] = b);

    data.forEach((row, idx) => {
      const baseFabric = baseMap[row['Base Fabric SKU']];
      if (!baseFabric) {
        errors.push({ row_number: idx + 1, field_name: 'Base Fabric SKU', error_message: 'SKU not found' });
        return;
      }

      try {
        const pCode = ProcessConstants.PROCESS_TYPE_CODES[row['Process Type']] || '';
        const name = HierarchyHelpers.generateFinishFabricName(
           baseFabric.base_fabric_name, row['Process'], row['Process Type'], row['Width'], row['Class'], row['Tags'], row['Finish']
        );
        const sku = HierarchyHelpers.generateFinishFabricSKU(
           baseFabric.sku, row['Process'], row['Process Type']
        );

        validRows.push({
           base_fabric_id: baseFabric.id,
           process: row['Process'],
           process_type: row['Process Type'],
           process_type_code: pCode,
           ink_type: row['Ink Type'],
           width: row['Width'],
           class: row['Class'],
           tags: row['Tags'],
           finish: row['Finish'],
           finish_fabric_name: name,
           finish_fabric_sku: sku
        });
      } catch (e) {
        errors.push({ row_number: idx + 1, field_name: 'Calculation', error_message: e.message });
      }
    });

    let success = 0;
    try {
       if (validRows.length > 0) {
         const { error } = await supabase.from('finish_fabrics').insert(validRows);
         if (error) throw error;
         success = validRows.length;
       }
    } catch (e) {
       errors.push({ row_number: 0, field_name: 'Database', error_message: e.message });
       success = 0;
    }

    const failed = data.length - success;
    await this.updateImportRecord(importRecord.id, {
       successful_items: success,
       failed_items: failed,
       status: failed === 0 ? 'completed' : 'completed_with_errors'
    });
    await this.logErrors(importRecord.id, errors);
    
    return { success, failed, errors };
  },

  async importFancyFinishFabrics(data) {
     const importRecord = await this.createImportRecord('fancy_finish_fabric', data.length);
     const errors = [];
     const validRows = [];

     const { data: finishes } = await supabase.from('finish_fabrics').select('id, finish_fabric_sku, finish_fabric_name');
     const finishMap = {};
     finishes?.forEach(f => finishMap[f.finish_fabric_sku] = f);

     data.forEach((row, idx) => {
       const finishFabric = finishMap[row['Finish Fabric SKU']];
       if (!finishFabric) {
         errors.push({ row_number: idx + 1, field_name: 'Finish Fabric SKU', error_message: 'SKU not found' });
         return;
       }

       try {
         const vaCode = VAConstants.VALUE_ADDITION_CODES[row['Value Addition']] || '';
         const conceptCode = VAConstants.CONCEPT_CODES[row['Concept']] || '';
         const name = HierarchyHelpers.generateFancyFinishFabricName(
            finishFabric.finish_fabric_name, row['Value Addition'], row['Thread'], row['Concept']
         );
         const sku = HierarchyHelpers.generateFancyFinishFabricSKU(
            finishFabric.finish_fabric_sku, row['Value Addition'], row['Concept']
         );

         validRows.push({
            finish_fabric_id: finishFabric.id,
            value_addition: row['Value Addition'],
            thread: row['Thread'],
            concept: row['Concept'],
            va_code: vaCode,
            va_concept_code: conceptCode,
            fancy_finish_fabric_name: name,
            fancy_finish_fabric_sku: sku
         });
       } catch (e) {
         errors.push({ row_number: idx + 1, field_name: 'Calculation', error_message: e.message });
       }
     });

     let success = 0;
     try {
       if (validRows.length > 0) {
         const { error } = await supabase.from('fancy_finish_fabrics').insert(validRows);
         if (error) throw error;
         success = validRows.length;
       }
     } catch (e) {
       errors.push({ row_number: 0, field_name: 'Database', error_message: e.message });
       success = 0;
     }

     const failed = data.length - success;
     await this.updateImportRecord(importRecord.id, {
        successful_items: success,
        failed_items: failed,
        status: failed === 0 ? 'completed' : 'completed_with_errors'
     });
     await this.logErrors(importRecord.id, errors);
     
     return { success, failed, errors };
  }
};