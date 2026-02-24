import { utils, write } from 'xlsx';

export const JobWorkerExportService = {
  exportToExcel: (workers, fileName = 'JobWorkers_Export.xlsx') => {
    try {
      // 1. Format data for export
      const exportData = workers.map(worker => ({
        'Worker Name': worker.worker_name,
        'Specialization': worker.specialization || '',
        'Rate': worker.rate || 0,
        'Unit': worker.rate_unit || '',
        'Contact Person': worker.contact_person || '',
        'Phone': worker.phone || '',
        'Email': worker.email || '',
        'Address': worker.address || '',
        'City': worker.city || '',
        'State': worker.state || '',
        'Pincode': worker.pincode || '',
        'Quality Grade': worker.quality_grade || '',
        'Bank Name': worker.bank_name || '',
        'Account Number': worker.bank_account_number || '',
        'IFSC Code': worker.ifsc_code || '',
        'Account Holder': worker.account_holder_name || '',
        'Status': worker.status || 'active',
        'Notes': worker.notes || ''
      }));

      // 2. Create worksheet
      const ws = utils.json_to_sheet(exportData);

      // 3. Create workbook
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Job Workers');

      // 4. Generate binary string
      const wbout = write(wb, { bookType: 'xlsx', type: 'array' });

      // 5. Create Blob and trigger download
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      // Check if running in browser environment
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export job workers.');
    }
  }
};