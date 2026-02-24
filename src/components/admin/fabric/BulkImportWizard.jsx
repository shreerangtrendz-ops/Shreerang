import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UploadCloud, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { BulkImportTemplateService } from '@/services/BulkImportTemplateService';
import { BulkImportService } from '@/services/BulkImportService';
import ColumnMappingInterface from './ColumnMappingInterface';
import ImportValidationReport from './ImportValidationReport';
import ImportProgressTracker from './ImportProgressTracker';
import { useToast } from '@/components/ui/use-toast';

const steps = ['Select Type', 'Upload File', 'Map Columns', 'Validate', 'Import'];

const BulkImportWizard = ({ onFinish }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [importType, setImportType] = useState('base');
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [excelColumns, setExcelColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, failed: 0, errors: [] });
  const [isImportComplete, setIsImportComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsLoading(true);
      try {
        const data = await BulkImportService.parseExcelFile(selectedFile);
        if (data && data.length > 0) {
          setExcelData(data);
          setExcelColumns(Object.keys(data[0]));
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to parse file.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMappingComplete = async (map) => {
    setMapping(map);
    setIsLoading(true);
    setCurrentStep(4); // Move to Validate
    
    try {
      const mappedData = BulkImportService.mapColumns(excelData, map);
      let result;
      if (importType === 'base') result = BulkImportService.validateBaseFabricData(mappedData);
      else if (importType === 'finish') result = await BulkImportService.validateFinishFabricData(mappedData);
      else if (importType === 'fancy') result = await BulkImportService.validateFancyFinishFabricData(mappedData);
      
      setValidationResult({ ...result, total: mappedData.length });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Validation Error', description: error.message });
    } finally {
       setIsLoading(false);
    }
  };

  const startImport = async () => {
    setCurrentStep(5);
    setIsLoading(true);
    setProgress({ total: validationResult.total, current: 0, success: 0, failed: 0, errors: [] });
    
    try {
      const mappedData = BulkImportService.mapColumns(excelData, mapping);
      let result;
      
      if (importType === 'base') result = await BulkImportService.importBaseFabrics(mappedData);
      else if (importType === 'finish') result = await BulkImportService.importFinishFabrics(mappedData);
      else if (importType === 'fancy') result = await BulkImportService.importFancyFinishFabrics(mappedData);

      setProgress({
         total: mappedData.length,
         current: mappedData.length,
         success: result.success,
         failed: result.failed,
         errors: result.errors
      });
      setIsImportComplete(true);
      toast({ title: 'Import Completed', description: `Successfully imported ${result.success} items.` });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
       setProgress(prev => ({ ...prev, errors: [{ row_number: 0, error_message: error.message }] }));
    } finally {
       setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold">Select Import Type</h2>
      <RadioGroup value={importType} onValueChange={setImportType} className="space-y-4">
        <div className="flex items-center space-x-2 border p-4 rounded-md hover:bg-slate-50 cursor-pointer">
          <RadioGroupItem value="base" id="base" />
          <Label htmlFor="base" className="cursor-pointer flex-1">
            <span className="block font-medium">Base Fabrics</span>
            <span className="text-sm text-slate-500">Import raw material specifications</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2 border p-4 rounded-md hover:bg-slate-50 cursor-pointer">
          <RadioGroupItem value="finish" id="finish" />
          <Label htmlFor="finish" className="cursor-pointer flex-1">
            <span className="block font-medium">Finish Fabrics</span>
            <span className="text-sm text-slate-500">Import processed fabrics linked to base</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2 border p-4 rounded-md hover:bg-slate-50 cursor-pointer">
          <RadioGroupItem value="fancy" id="fancy" />
          <Label htmlFor="fancy" className="cursor-pointer flex-1">
            <span className="block font-medium">Fancy Finish Fabrics</span>
            <span className="text-sm text-slate-500">Import value-added fabric variants</span>
          </Label>
        </div>
      </RadioGroup>
      <div className="flex justify-end">
         <Button onClick={() => setCurrentStep(2)}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-semibold">Upload Excel File</h2>
         <Button variant="outline" size="sm" onClick={() => BulkImportTemplateService.downloadTemplate(importType)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Template
         </Button>
      </div>
      
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 text-center hover:bg-slate-50 transition-colors">
         <Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="hidden" id="file-upload" />
         <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <UploadCloud className="h-12 w-12 text-slate-400 mb-4" />
            <span className="text-lg font-medium text-slate-700">Click to upload or drag file here</span>
            <span className="text-sm text-slate-500 mt-2">Supported formats: .xlsx, .xls</span>
         </label>
      </div>

      {file && (
         <div className="bg-blue-50 p-4 rounded-md flex items-center gap-3">
            <FileSpreadsheet className="text-blue-600" />
            <div className="flex-1">
               <p className="font-medium text-blue-900">{file.name}</p>
               <p className="text-xs text-blue-700">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
         </div>
      )}

      <div className="flex justify-between pt-4">
         <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
         <Button onClick={() => setCurrentStep(3)} disabled={!file || isLoading}>
            {isLoading ? 'Processing...' : 'Next'}
         </Button>
      </div>
    </div>
  );

  return (
    <div className="py-6 px-4">
       <div className="mb-8 max-w-3xl mx-auto">
          <div className="flex justify-between mb-2">
             {steps.map((label, idx) => (
                <div key={label} className={`text-sm font-medium ${idx + 1 === currentStep ? 'text-blue-600' : 'text-slate-400'}`}>
                   Step {idx + 1}: {label}
                </div>
             ))}
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
             <div 
                className="h-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${(currentStep / steps.length) * 100}%` }} 
             />
          </div>
       </div>

       <Card>
          <CardContent className="pt-6">
             {currentStep === 1 && renderStep1()}
             {currentStep === 2 && renderStep2()}
             {currentStep === 3 && (
                <ColumnMappingInterface 
                   importType={importType} 
                   excelColumns={excelColumns} 
                   excelData={excelData}
                   onBack={() => setCurrentStep(2)}
                   onMappingComplete={handleMappingComplete}
                />
             )}
             {currentStep === 4 && (
                <ImportValidationReport 
                   validationResult={validationResult}
                   onRetry={() => setCurrentStep(3)}
                   onProceed={startImport}
                />
             )}
             {currentStep === 5 && (
                <ImportProgressTracker 
                   progress={progress}
                   isComplete={isImportComplete}
                   onComplete={onFinish}
                />
             )}
          </CardContent>
       </Card>
    </div>
  );
};

export default BulkImportWizard;