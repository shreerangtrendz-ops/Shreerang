import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { BulkFabricImportService } from '@/services/BulkFabricImportService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const STEPS = {
  UPLOAD: 1,
  MAPPING: 2,
  PREVIEW: 3,
  IMPORT: 4
};

const BulkFabricImportWizard = ({ isOpen, onClose, fabricType }) => {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [validatedData, setValidatedData] = useState([]);
  const [importStats, setImportStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    try {
      const data = await BulkFabricImportService.parseFile(selectedFile);
      setRawData(data);
      setStep(STEPS.MAPPING); // Auto skip to mapping for now
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to parse file' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async () => {
    setLoading(true);
    try {
      const results = await BulkFabricImportService.validateData(rawData, fabricType);
      setValidatedData(results);
      setStep(STEPS.PREVIEW);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Validation Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setStep(STEPS.IMPORT);
    try {
      const result = await BulkFabricImportService.importData(validatedData, fabricType);
      setImportStats(result);
      toast({ title: 'Import Complete', description: `Successfully imported ${result.success} items.` });
    } catch (error) {
      setImportStats({ error: error.message });
      toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setRawData([]);
    setValidatedData([]);
    setImportStats(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetWizard}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import: {fabricType.replace(/_/g, ' ').toUpperCase()}</DialogTitle>
          <DialogDescription>Step {step} of 4</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4">
          {step === STEPS.UPLOAD && (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-slate-50">
              <Upload className="h-12 w-12 text-slate-400 mb-4" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
                   Select Excel/CSV File
                </div>
                <Input id="file-upload" type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileUpload} />
              </Label>
              <p className="text-sm text-slate-500 mt-2">
                {file ? file.name : "Drag and drop or click to upload"}
              </p>
            </div>
          )}

          {step === STEPS.MAPPING && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-800 rounded">
                <FileSpreadsheet className="h-5 w-5" />
                <span>Found {rawData.length} rows in "{file?.name}"</span>
              </div>
              <p className="text-sm text-slate-600">
                Columns found: {rawData.length > 0 ? Object.keys(rawData[0]).join(', ') : 'None'}
              </p>
              <p className="text-xs text-slate-500">
                * Automatic column mapping is active. Ensure your Excel headers match expected field names.
              </p>
            </div>
          )}

          {step === STEPS.PREVIEW && (
            <ScrollArea className="h-full border rounded-md">
              <div className="p-4 space-y-2">
                {validatedData.slice(0, 10).map((row, idx) => (
                  <div key={idx} className={`p-3 border rounded text-sm flex justify-between items-start ${row.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div>
                      <div className="font-semibold mb-1">Row {row.row}</div>
                      <pre className="text-xs">{JSON.stringify(row.data, null, 2)}</pre>
                    </div>
                    {row.isValid ? <CheckCircle className="text-green-600 h-5 w-5" /> : (
                      <div className="text-red-600 text-xs">
                        <AlertCircle className="h-5 w-5 mb-1" />
                        {row.errors.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
                {validatedData.length > 10 && <div className="text-center text-slate-500 py-2">...and {validatedData.length - 10} more rows</div>}
              </div>
            </ScrollArea>
          )}

          {step === STEPS.IMPORT && (
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              {loading ? (
                <>
                  <div className="w-full max-w-md space-y-2">
                    <div className="flex justify-between text-sm">
                       <span>Importing data...</span>
                       <span>Please wait</span>
                    </div>
                    <Progress value={33} className="animate-pulse" />
                  </div>
                </>
              ) : importStats ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    {importStats.error ? <AlertCircle className="h-16 w-16 text-red-500" /> : <CheckCircle className="h-16 w-16 text-green-500" />}
                  </div>
                  <h3 className="text-xl font-bold">{importStats.error ? 'Import Failed' : 'Import Complete'}</h3>
                  {!importStats.error && (
                    <div className="flex gap-8 justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{importStats.success}</div>
                        <div className="text-xs uppercase text-slate-500">Success</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{importStats.failed}</div>
                        <div className="text-xs uppercase text-slate-500">Failed</div>
                      </div>
                    </div>
                  )}
                  {importStats.error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{importStats.error}</AlertDescription></Alert>}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 1 && step < STEPS.IMPORT && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
          {step === STEPS.MAPPING && (
            <Button onClick={handleValidation} disabled={loading}>
              Validate Data <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === STEPS.PREVIEW && (
            <Button onClick={handleImport} disabled={loading || validatedData.every(r => !r.isValid)} className="bg-green-600 hover:bg-green-700">
              Start Import <Upload className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === STEPS.IMPORT && !loading && (
            <Button onClick={resetWizard}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkFabricImportWizard;