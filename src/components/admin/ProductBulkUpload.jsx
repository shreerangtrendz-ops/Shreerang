import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, XCircle, FileDown } from 'lucide-react';

const REQUIRED_HEADERS = [
  "name", "slug", "sku", "retail_price", "wholesale_price", 
  "stock_quantity", "is_active", "category_slug"
];

const ProductBulkUpload = () => {
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
              title: "Invalid CSV",
              description: `Missing columns: ${missingHeaders.join(', ')}`,
            });
            setParsedData([]);
          } else {
            setParsedData(results.data);
            toast({ title: "File Parsed", description: `${results.data.length} products found.` });
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

    // 1. Fetch categories to map slug -> id
    const { data: categories } = await supabase.from('categories').select('id, slug');
    const categoryMap = (categories || []).reduce((acc, cat) => {
        acc[cat.slug] = cat.id;
        return acc;
    }, {});

    const chunkSize = 20;
    for (let i = 0; i < parsedData.length; i += chunkSize) {
        const chunk = parsedData.slice(i, i + chunkSize);
        
        const processedProducts = chunk.map(row => {
            const catId = categoryMap[row.category_slug];
            return {
                name: row.name,
                slug: row.slug || row.name.toLowerCase().replace(/ /g, '-'),
                sku: row.sku,
                description: row.description || '',
                retail_price: parseFloat(row.retail_price) || 0,
                wholesale_price: parseFloat(row.wholesale_price) || 0,
                stock_quantity: parseInt(row.stock_quantity) || 0,
                min_wholesale_quantity: parseInt(row.min_wholesale_quantity) || 5,
                is_active: row.is_active === 'true' || row.is_active === true,
                category_id: catId || null, // Will fail nicely if category missing? Or should we skip?
                product_type: row.product_type || 'Standard',
                unit: row.unit || 'Piece'
            };
        });

        const { error } = await supabase.from('products').upsert(processedProducts, { onConflict: 'sku' });

        if (error) {
            errorCount += chunk.length;
            errors.push({ row: `${i+1}-${i+chunk.length}`, error: error.message });
        } else {
            successCount += chunk.length;
        }
    }

    setUploadResult({ successCount, errorCount, errors });
    setUploading(false);
    
    if(successCount > 0) toast({ title: "Success", description: "Products uploaded." });
  };

  const downloadTemplate = () => {
    const headers = REQUIRED_HEADERS.join(',');
    const sample = "Cotton Shirt,cotton-shirt-001,SHIRT-001,999,500,100,true,mens-shirts";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sample;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6 border">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Product Bulk Upload</h3>
         <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
            <FileDown className="h-4 w-4" /> Template
        </Button>
      </div>
      
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50/50">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <label htmlFor="product-upload" className="mt-4 block text-sm font-medium text-primary hover:underline cursor-pointer">
          <span>{file ? file.name : 'Select CSV file'}</span>
          <input id="product-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
        </label>
         <p className="mt-2 text-xs text-muted-foreground">
            Required: name, slug, sku, retail_price, stock_quantity, category_slug
        </p>
      </div>

      {parsedData.length > 0 && (
         <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{parsedData.length} items ready</span>
            <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Start Upload'}
            </Button>
        </div>
      )}

      {uploadResult && (
         <div className="space-y-2 bg-slate-50 p-4 rounded border">
            <p className="text-green-600 flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4"/> {uploadResult.successCount} success</p>
            {uploadResult.errorCount > 0 && (
                <p className="text-red-600 flex items-center gap-2 text-sm"><XCircle className="h-4 w-4"/> {uploadResult.errorCount} failed</p>
            )}
         </div>
      )}
    </div>
  );
};

export default ProductBulkUpload;