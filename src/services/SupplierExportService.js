import { utils, write } from 'xlsx';

export const SupplierExportService = {
  exportToExcel: (suppliers, fileName = 'Suppliers_Export.xlsx') => {
    try {
      // 1. Format data for export
      const exportData = suppliers.map(supplier => ({
        'Supplier Name': supplier.supplier_name,
        'Code': supplier.supplier_code || '',
        'Contact Person': supplier.contact_person || '',
        'Phone': supplier.phone || '',
        'Email': supplier.email || '',
        'Address': supplier.address || '',
        'City': supplier.city || '',
        'State': supplier.state || '',
        'Pincode': supplier.pincode || '',
        'GST Number': supplier.gst_number || '',
        'Bank Name': supplier.bank_name || '',
        'Account Number': supplier.bank_account_number || '',
        'IFSC Code': supplier.ifsc_code || '',
        'Account Holder': supplier.account_holder_name || '',
        'Payment Terms': supplier.payment_terms || '',
        'Status': supplier.status || 'active',
        'Notes': supplier.notes || ''
      }));

      // 2. Create worksheet
      const ws = utils.json_to_sheet(exportData);

      // 3. Create workbook
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Suppliers');

      // 4. Generate binary string
      const wbout = write(wb, { bookType: 'xlsx', type: 'array' });

      // 5. Create Blob and trigger download
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      // Check if running in browser environment before trying to download
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
      throw new Error('Failed to export suppliers.');
    }
  }
};