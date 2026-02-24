import * as XLSX from 'xlsx';
import { supabase } from '@/lib/customSupabaseClient';
import { validateRequired, validateSKUUnique } from '@/lib/validationHelpers';

export const BulkFabricImportService = {
  parseFile: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },

  validateData: async (data, type) => {
    const results = [];
    
    // Determine required fields based on type
    const requiredFields = {
      'base': ['width', 'fabric_name', 'process'],
      'finish': ['finish_width', 'fabric_name', 'process_type', 'class', 'process'],
      'fancy_base': ['base_fabric_name', 'value_addition'],
      'fancy_finish': ['base_fabric_name', 'value_addition']
    }[type] || [];

    const tableName = {
      'base': 'base_fabrics',
      'finish': 'finish_fabrics',
      'fancy_base': 'fancy_base_fabrics',
      'fancy_finish': 'fancy_finish_fabrics'
    }[type];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const errors = [];
      
      // 1. Required Fields Check
      requiredFields.forEach(field => {
        if (!row[field]) errors.push(`${field} is required`);
      });

      // 2. SKU Check (if provided in import, otherwise we verify generated later)
      if (row.sku) {
        const skuError = await validateSKUUnique(row.sku, tableName);
        if (skuError) errors.push(skuError);
      }

      results.push({
        row: i + 1,
        data: row,
        isValid: errors.length === 0,
        errors
      });
    }

    return results;
  },

  importData: async (validatedData, type) => {
    const validRows = validatedData.filter(r => r.isValid).map(r => r.data);
    if (validRows.length === 0) return { success: 0, failed: validatedData.length };

    const tableName = {
      'base': 'base_fabrics',
      'finish': 'finish_fabrics',
      'fancy_base': 'fancy_base_fabrics',
      'fancy_finish': 'fancy_finish_fabrics'
    }[type];

    // Note: Real implementation would need to handle lookups for related IDs (e.g. finding base_fabric_id by name)
    // For this basic implementation, we assume the data is either raw or ID-ready, 
    // or we'd add complex lookup logic here. 
    // Simplified: Insert data as is.
    
    const { data, error } = await supabase.from(tableName).insert(validRows).select();
    
    if (error) throw error;
    
    return {
      success: data.length,
      failed: validatedData.length - data.length
    };
  }
};