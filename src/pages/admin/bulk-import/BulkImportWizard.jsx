import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Check, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const WizardStep = ({ number, title, isActive, isCompleted }) => (
  <div className={`flex items-center ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 mr-2 ${
      isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
      isActive ? 'border-primary text-primary' : 'border-muted'
    }`}>
      {isCompleted ? <Check className="w-4 h-4" /> : number}
    </div>
    <span className="font-medium hidden md:block">{title}</span>
    <div className="mx-4 h-[1px] w-12 bg-border hidden md:block last:hidden"></div>
  </div>
);

const BulkImportWizardContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Import State
  const [importType, setImportType] = useState('ready_made'); // ready_made | fabric
  const [items, setItems] = useState([]);
  const [commonDetails, setCommonDetails] = useState({
    category: '',
    base_type: '',
    process_type: ''
  });

  // Step 1: Type Selection
  const handleTypeSelect = (type) => {
    setImportType(type);
    setStep(2);
  };

  // Step 2: Common Details
  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    setStep(3);
  };

  // Step 3: File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Basic formatting
        const formattedItems = data.map((row, idx) => ({
          id: idx,
          name: row['Item Name'] || row['Name'] || `Item ${idx + 1}`,
          ...row
        }));
        
        setItems(formattedItems);
        setStep(4);
      } catch (err) {
        console.error(err);
        toast({ title: "Upload Failed", description: "Could not parse Excel file.", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Step 5: Execute Import
  const executeImport = async () => {
    try {
      setIsLoading(true);

      // 1. Create Import Header
      const { data: importData, error: importError } = await supabase
        .from('bulk_item_imports')
        .insert({
          import_name: `${importType.toUpperCase()} Import - ${new Date().toLocaleDateString()}`,
          item_type: importType,
          common_details: commonDetails,
          status: 'pending',
          total_items: items.length,
          created_by: user.id
        })
        .select()
        .single();

      if (importError) throw importError;

      // 2. Create Import Lines
      const lines = items.map(item => ({
        import_id: importData.id,
        item_name: item.name,
        unique_details: item,
        status: 'pending'
      }));

      // Insert in chunks if needed, but for now simple insert
      const { error: linesError } = await supabase
        .from('bulk_item_import_lines')
        .insert(lines);

      if (linesError) throw linesError;

      toast({ title: "Import Started", description: "Items queued for processing." });
      navigate('/admin/bulk-item-import/list');

    } catch (error) {
      console.error(error);
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Helmet><title>Bulk Import Wizard</title></Helmet>
      <BackButton to="/admin/bulk-item-import/list" label="Cancel Import" />

      {/* Progress */}
      <div className="flex justify-between mb-8 overflow-x-auto pb-2">
        <WizardStep number={1} title="Select Type" isActive={step === 1} isCompleted={step > 1} />
        <WizardStep number={2} title="Common Details" isActive={step === 2} isCompleted={step > 2} />
        <WizardStep number={3} title="Upload Data" isActive={step === 3} isCompleted={step > 3} />
        <WizardStep number={4} title="Preview & Confirm" isActive={step === 4} isCompleted={step > 4} />
      </div>

      <Card>
        <CardContent className="p-6">
          
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">What are you importing?</h2>
                <p className="text-muted-foreground">Select the type of items you want to add to the system.</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <button onClick={() => handleTypeSelect('ready_made')} className="p-6 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left space-y-4">
                  <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Ready-made Garments</h3>
                    <p className="text-sm text-muted-foreground mt-1">Dresses, Tops, Sets, etc.</p>
                  </div>
                </button>
                <button onClick={() => handleTypeSelect('fabric')} className="p-6 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left space-y-4">
                  <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Fabric Items</h3>
                    <p className="text-sm text-muted-foreground mt-1">Rolls, Lots, Raw Fabric, etc.</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h2 className="text-xl font-bold">Common Details for {importType.replace('_', ' ')}</h2>
              <p className="text-sm text-muted-foreground">These details will apply to all imported items unless overridden.</p>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input 
                    placeholder="e.g. Summer Collection" 
                    value={commonDetails.category} 
                    onChange={e => setCommonDetails({...commonDetails, category: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base Material</Label>
                  <Input 
                    placeholder="e.g. Cotton" 
                    value={commonDetails.base_type} 
                    onChange={e => setCommonDetails({...commonDetails, base_type: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h2 className="text-xl font-bold">Upload Data</h2>
              <div className="border-2 border-dashed rounded-lg p-12 text-center space-y-4 hover:bg-slate-50 transition-colors">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Click to upload Excel/CSV</h3>
                  <p className="text-sm text-muted-foreground mt-1">Or drag and drop file here</p>
                </div>
                <Input type="file" className="hidden" id="file-upload" accept=".xlsx, .csv" onChange={handleFileUpload} />
                <Button variant="secondary" onClick={() => document.getElementById('file-upload').click()}>
                  Select File
                </Button>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h2 className="text-xl font-bold">Preview Items ({items.length})</h2>
              
              <div className="border rounded-md max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      {Object.keys(items[0] || {}).filter(k => k !== 'id' && k !== 'name').slice(0, 3).map(k => (
                        <TableHead key={k}>{k}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        {Object.keys(items[0] || {}).filter(k => k !== 'id' && k !== 'name').slice(0, 3).map(k => (
                          <TableCell key={k}>{item[k]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                <Button onClick={executeImport} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                  {isLoading ? <LoadingSpinner text="Importing..." /> : 'Confirm Import'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const BulkImportWizard = () => (
  <PageErrorBoundary>
    <BulkImportWizardContent />
  </PageErrorBoundary>
);

export default BulkImportWizard;