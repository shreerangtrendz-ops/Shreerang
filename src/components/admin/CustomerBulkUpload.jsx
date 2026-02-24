import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, XCircle, AlertCircle, FileDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const REQUIRED_HEADERS = ["email", "full_name", "firm_name", "phone_number", "gst_number", "city", "state"];

const CustomerBulkUpload = () => {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields;
          const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
          
          if (missingHeaders.length > 0) {
            toast({
              variant: "destructive",
              title: "Invalid CSV Headers",
              description: `Missing: ${missingHeaders.join(', ')}`,
            });
            setParsedData([]);
          } else {
            setParsedData(results.data);
            toast({ title: "File Parsed", description: `${results.data.length} customers found.` });
          }
        },
      });
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;
    setUploading(true);
    
    let successCount = 0;
    let errorCount = 0;
    let errors = [];

    // Process in chunks to avoid hitting payload limits
    const chunkSize = 10;
    for (let i = 0; i < parsedData.length; i += chunkSize) {
        const chunk = parsedData.slice(i, i + chunkSize);
        
        const updates = chunk.map(row => ({
            email: row.email,
            full_name: row.full_name,
            firm_name: row.firm_name,
            phone_number: row.phone_number,
            gst_number: row.gst_number,
            city: row.city,
            state: row.state,
            role: 'wholesale_customer', // Default role
            is_approved: true, // Auto-approve bulk uploads
            updated_at: new Date()
        }));

        // Using upsert with email as the conflict key isn't standard in Supabase Auth
        // So we primarily insert into user_profiles. 
        // Note: This won't create Auth Users (login), just profile entries for records.
        // If login is needed, they must register or use a different flow.
        // Assuming "Customer Database" implies records for billing/orders.
        
        const { error } = await supabase.from('user_profiles').upsert(updates, { onConflict: 'email', ignoreDuplicates: false });

        if (error) {
            errorCount += chunk.length;
            errors.push({ row: `${i+1}-${i+chunk.length}`, error: error.message });
        } else {
            successCount += chunk.length;
        }
    }

    setUploadResult({ successCount, errorCount, errors });
    setUploading(false);
    if (successCount > 0) {
        toast({ title: "Upload Complete", description: `${successCount} customers processed.` });
    }
  };

  const downloadTemplate = () => {
    const headers = REQUIRED_HEADERS.join(',');
    const sample = "customer@example.com,John Doe,Doe Enterprises,9876543210,29ABCDE1234F1Z5,Bangalore,Karnataka";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sample;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customer_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6 border">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Customer Bulk Upload</h3>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
            <FileDown className="h-4 w-4" /> Template
        </Button>
      </div>
      
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <label htmlFor="customer-upload" className="mt-4 block text-sm font-medium text-primary hover:underline cursor-pointer">
          <span>{file ? file.name : 'Select CSV file'}</span>
          <input id="customer-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
            Required: email, full_name, firm_name, gst_number, phone_number
        </p>
      </div>

      {parsedData.length > 0 && (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{parsedData.length} records ready</span>
                <Button onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Processing...' : 'Upload Customers'}
                </Button>
            </div>
        </div>
      )}

      {uploadResult && (
        <div className="space-y-3 bg-slate-50 p-4 rounded-md text-sm">
            <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>{uploadResult.successCount} successful</span>
            </div>
            {uploadResult.errorCount > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span>{uploadResult.errorCount} failed</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto text-xs text-red-500 p-2 border border-red-100 rounded bg-white">
                        {uploadResult.errors.map((e, i) => (
                            <div key={i}>Batch {e.row}: {e.error}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default CustomerBulkUpload;