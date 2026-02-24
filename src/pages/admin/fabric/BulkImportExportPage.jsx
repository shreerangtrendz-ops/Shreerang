import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle } from 'lucide-react';
import { BulkImportExportService } from '@/services/BulkImportExportService';
import BulkImportPreview from '@/components/admin/fabric/BulkImportPreview';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Progress } from '@/components/ui/progress';

const BulkImportExportPage = () => {
  const [activeTab, setActiveTab] = useState('import');
  const [fabricType, setFabricType] = useState('base');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Max 50MB allowed' });
      return;
    }

    setFile(selectedFile);
    setPreviewData(null);
    setImportResult(null);

    try {
      let data;
      if (selectedFile.name.endsWith('.csv')) {
        data = await BulkImportExportService.parseCSVFile(selectedFile);
      } else {
        data = await BulkImportExportService.parseExcelFile(selectedFile);
      }
      
      const { validData, errors } = BulkImportExportService.validateFabricData(data, fabricType);
      setPreviewData(validData);
      setValidationErrors(errors);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Parse Error', description: 'Failed to read file' });
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.length === 0) return;
    
    setImporting(true);
    setProgress(0);
    
    try {
      const result = await BulkImportExportService.importFabrics(previewData, fabricType, (p) => {
        setProgress(p.percent);
      });
      setImportResult(result);
      if (result.failed === 0) {
        toast({ title: 'Success', description: `Imported ${result.successful} fabrics successfully` });
      } else {
        toast({ variant: 'warning', title: 'Partial Import', description: `${result.successful} imported, ${result.failed} failed` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = BulkImportExportService.generateTemplate(fabricType);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fabricType}_template.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 pb-24">
      <Helmet><title>Bulk Import/Export | Admin</title></Helmet>
      <AdminPageHeader title="Bulk Operations" description="Import or export large volumes of fabric data." />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="import" className="rounded-md px-6">Import</TabsTrigger>
          <TabsTrigger value="export" className="rounded-md px-6">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Fabrics</CardTitle>
              <CardDescription>Upload CSV or Excel files to import fabrics in bulk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4 items-end">
                <div className="space-y-2 w-64">
                  <label className="text-sm font-medium">Fabric Type</label>
                  <Select value={fabricType} onValueChange={setFabricType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base Fabric</SelectItem>
                      <SelectItem value="finish">Finish Fabric</SelectItem>
                      <SelectItem value="fancy_base">Fancy Base</SelectItem>
                      <SelectItem value="fancy_finish">Fancy Finish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" /> Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  className="hidden" 
                  id="file-upload"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <FileSpreadsheet className="h-10 w-10 text-slate-400 mb-2" />
                  <span className="font-medium text-slate-700">Click to upload CSV or Excel</span>
                  <span className="text-xs text-slate-500 mt-1">Max 50MB</span>
                </label>
              </div>

              {(previewData || validationErrors.length > 0) && (
                <div className="space-y-4">
                  <BulkImportPreview data={previewData || []} errors={validationErrors} />
                  
                  {importResult ? (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-center gap-3">
                      <CheckCircle className="text-green-600 h-5 w-5" />
                      <div>
                        <p className="font-medium text-green-800">Import Complete</p>
                        <p className="text-sm text-green-700">
                          {importResult.successful} imported, {importResult.failed} failed.
                        </p>
                        {importResult.errors.length > 0 && (
                          <Button variant="link" className="text-red-600 h-auto p-0 text-sm" onClick={() => BulkImportExportService.downloadErrorReport(importResult.errors)}>
                            Download Error Report
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {importing && <Progress value={progress} className="w-full" />}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setFile(null); setPreviewData(null); }}>Cancel</Button>
                        <Button onClick={handleImport} disabled={importing || previewData?.length === 0} className="bg-slate-900 text-white">
                          {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Import {previewData?.length} Rows
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>Export your data for backup or reporting.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg">
                 Feature coming soon. Please use Import for now.
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BulkImportExportPage;