import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const FabricExportService = {
  exportToExcel: (data, fileName = 'fabric_export', sheetName = 'Fabrics') => {
    try {
      if (!data || data.length === 0) {
        console.warn('No data to export');
        return false;
      }

      // Format data for export
      const formattedData = data.map(item => {
        // Flatten object structure for better excel representation
        const flatItem = {};
        
        Object.keys(item).forEach(key => {
          const value = item[key];
          
          if (value === null || value === undefined) {
            flatItem[key] = '';
          } else if (typeof value === 'object' && !Array.isArray(value)) {
             // Basic flattening for one level nested objects (like base_fabrics in joins)
             Object.keys(value).forEach(subKey => {
               flatItem[`${key}_${subKey}`] = value[subKey];
             });
          } else if (key.includes('created_at') || key.includes('updated_at')) {
             flatItem[key] = format(new Date(value), 'yyyy-MM-dd HH:mm');
          } else {
             flatItem[key] = value;
          }
        });
        return flatItem;
      });

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      XLSX.writeFile(workbook, `${fileName}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
};