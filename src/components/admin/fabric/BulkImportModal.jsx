import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, AlertTriangle, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { ExcelCSVParser } from '@/services/ExcelCSVParser';
import { FabricService } from '@/services/FabricService';
import BulkImportPreview from './BulkImportPreview';
import BulkImportProgress from './BulkImportProgress';

const BulkImportModal = ({ trigger, onSuccess }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('upload'); // upload, preview, importing, result
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  
  const [parsedData, setParsedData] = useState([]);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, invalid: 0 });
  
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, errors: [] });

  const handleFileChange = (e) => {
      const selected = e.target.files?.[0];
      if (selected) {
          if (selected.size > 5 * 1024 * 1024) {
              setParseError('File size exceeds 5MB limit.');
              setFile(null);
              return;
          }
          setFile(selected);
          setParseError(null);
      }
  };

  const handleParse = async () => {
      if (!file) return;
      setIsParsing(true);
      setParseError(null);
      
      try {
          const result = await ExcelCSVParser.parseFile(file);
          if (result.data.length === 0) {
              setParseError("No valid data found in file.");
          } else {
              setParsedData(result.data);
              setImportStats(result.summary);
              setStep('preview');
          }
      } catch (e) {
          setParseError("Failed to parse file. Please check format.");
          console.error(e);
      } finally {
          setIsParsing(false);
      }
  };

  const handleImport = async () => {
      setStep('importing');
      setProgress(0);
      
      const validData = parsedData.filter(r => r._status !== 'error');
      const total = validData.length;
      
      try {
          // Simulate progress for better UX
          const interval = setInterval(() => {
             setProgress(old => {
                 if (old >= 90) return old;
                 return old + 5;
             });
          }, 100);

          const result = await FabricService.bulkCreate(validData);
          
          clearInterval(interval);
          setProgress(100);
          
          setImportResult({
             success: result.success,
             failed: result.failed + (parsedData.length - validData.length),
             errors: result.errors
          });
          
          if (result.success > 0) {
              toast({ title: "Import Successful", description: `${result.success} items imported.` });
              onSuccess?.();
          }

      } catch (e) {
          setProgress(100);
          setImportResult({ success: 0, failed: total, errors: [{ message: e.message }] });
          toast({ variant: 'destructive', title: "Import Failed", description: e.message });
      }
  };
  
  const resetModal = () => {
      setFile(null);
      setParsedData([]);
      setStep('upload');
      setParseError(null);
      setImportResult({ success: 0, failed: 0, errors: [] });
  };
  
  const handleOpenChange = (open) => {
      if (!open) resetModal();
      setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
       <DialogTrigger asChild>{trigger}</DialogTrigger>
       <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
           <DialogHeader>
               <DialogTitle>Bulk Import Fabrics</DialogTitle>
           </DialogHeader>
           
           <div className="flex-1 overflow-y-auto p-1">
               {step === 'upload' && (
                   <div className="space-y-6 py-6">
                       <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 text-center hover:bg-slate-50 transition-colors">
                           <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
                           <h3 className="font-medium text-lg mb-2">Drag and drop or select file</h3>
                           <p className="text-sm text-slate-500 mb-6">Supports .xlsx and .csv (Max 5MB)</p>
                           
                           <input 
                              type="file" 
                              accept=".xlsx, .csv" 
                              className="hidden" 
                              id="file-upload"
                              onChange={handleFileChange}
                           />
                           <label htmlFor="file-upload">
                               <Button variant="outline" type="button" onClick={() => document.getElementById('file-upload').click()}>
                                   Select File
                               </Button>
                           </label>
                           
                           {file && (
                               <div className="mt-4 flex items-center justify-center gap-2 text-sm bg-blue-50 text-blue-700 py-2 px-4 rounded-full inline-flex">
                                   <FileText className="h-4 w-4" />
                                   {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                   <button onClick={() => setFile(null)} className="ml-2 hover:text-blue-900"><X className="h-4 w-4"/></button>
                               </div>
                           )}
                       </div>
                       
                       {parseError && (
                           <Alert variant="destructive">
                               <AlertTriangle className="h-4 w-4" />
                               <AlertTitle>Error</AlertTitle>
                               <AlertDescription>{parseError}</AlertDescription>
                           </Alert>
                       )}
                       
                       <div className="flex justify-between items-center pt-4">
                           <Button variant="ghost" onClick={ExcelCSVParser.generateTemplate}>
                               <Download className="mr-2 h-4 w-4" /> Download Template
                           </Button>
                           <Button onClick={handleParse} disabled={!file || isParsing}>
                               {isParsing ? 'Parsing...' : 'Parse File'}
                           </Button>
                       </div>
                   </div>
               )}
               
               {step === 'preview' && (
                   <BulkImportPreview 
                       data={parsedData} 
                       onCancel={() => setStep('upload')} 
                       onImport={handleImport}
                   />
               )}
               
               {step === 'importing' && (
                   <BulkImportProgress 
                       progress={progress}
                       total={parsedData.length}
                       current={Math.floor((progress / 100) * parsedData.length)}
                       successCount={importResult.success}
                       errorCount={importResult.failed}
                       errors={importResult.errors}
                       isComplete={progress === 100}
                       onClose={() => setIsOpen(false)}
                   />
               )}
           </div>
       </DialogContent>
    </Dialog>
  );
};

export default BulkImportModal;