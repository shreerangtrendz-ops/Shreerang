import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/customSupabaseClient';

export const BulkImportExportService = {
  parseCSVFile: (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error),
      });
    });
  },

  parseExcelFile: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
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

  validateFabricData: (data, fabricType) => {
    const errors = [];
    const validData = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 1;
      const rowErrors = [];

      // Basic Validation
      if (!row.name && !row.fabric_name) rowErrors.push("Fabric Name is required");
      
      // Type specific checks
      if (fabricType === 'base' && !row.base_material) rowErrors.push("Base Material required");
      
      // Duplicate check in current batch
      const isDuplicateInBatch = validData.some(
        d => (d.name || d.fabric_name) === (row.name || row.fabric_name)
      );
      if (isDuplicateInBatch) rowErrors.push("Duplicate in current batch");

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, errors: rowErrors, data: row });
      } else {
        validData.push({ ...row, rowNum });
      }
    });

    return { validData, errors };
  },

  importFabrics: async (data, fabricType, onProgress) => {
    const total = data.length;
    let successful = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < total; i++) {
      const item = data[i];
      try {
        // Transform data to DB schema
        const dbPayload = {
          name: item.name || item.fabric_name,
          type: fabricType,
          sku: item.sku || `IMP-${Date.now()}-${i}`,
          base_fabric_details: fabricType === 'base' ? item : {},
          process_spec: ['finish', 'fancy_finish'].includes(fabricType) ? item : {},
          va_spec: ['fancy_base', 'fancy_finish'].includes(fabricType) ? item : {},
          is_active: true
        };

        const { error } = await supabase.from('fabric_master').insert([dbPayload]);
        
        if (error) throw error;
        successful++;
      } catch (err) {
        failed++;
        errors.push({ row: item.rowNum, error: err.message, data: item });
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          percent: Math.round(((i + 1) / total) * 100)
        });
      }
    }

    return { successful, failed, errors };
  },

  generateTemplate: (fabricType) => {
    const commonHeaders = ['name', 'sku', 'width', 'gsm'];
    let specificHeaders = [];
    
    if (fabricType === 'base') specificHeaders = ['base_material', 'process', 'construction', 'yarn_count'];
    else if (fabricType === 'finish') specificHeaders = ['process_type', 'finish_type', 'dye_used'];
    else if (fabricType.includes('fancy')) specificHeaders = ['va_category', 'va_sub_category', 'rate'];

    return [...commonHeaders, ...specificHeaders];
  },
  
  downloadErrorReport: (errors) => {
    const csvData = errors.map(e => ({
      Row: e.row,
      Error: Array.isArray(e.errors) ? e.errors.join(', ') : e.error,
      Data: JSON.stringify(e.data)
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `error_report_${new Date().toISOString()}.csv`;
    link.click();
  }
};