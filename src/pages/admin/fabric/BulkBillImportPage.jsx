import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, FileText, CheckCircle, ArrowRight, ScanLine } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { BulkBillService } from '@/services/BulkBillService';
import { BillMappingService } from '@/services/BillMappingService';
import { Badge } from '@/components/ui/badge';
import { DataLoadingService } from '@/services/DataLoadingService';

const BulkBillImportPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [billType, setBillType] = useState('Purchase');
  const [extractedData, setExtractedData] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [selectedFabric, setSelectedFabric] = useState('');
  
  // Master lists
  const [baseFabrics, setBaseFabrics] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setFile(f);
      // Create preview URL
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) return toast({ variant: 'destructive', title: 'File Missing', description: 'Please select a bill.' });
    
    setLoading(true);
    try {
      // Fetch needed data
      const [bases, supps] = await Promise.all([
         DataLoadingService.fetchBaseFabrics(),
         DataLoadingService.fetchSuppliers()
      ]);
      setBaseFabrics(bases);
      setSuppliers(supps);

      // Extract
      const result = await BulkBillService.uploadAndExtract(file, billType);
      setExtractedData(result.extracted_data);
      setRecordId(result.id);
      
      // Map
      const matches = await BillMappingService.findPotentialMatches(result.extracted_data, billType);
      setPotentialMatches(matches);
      
      if (matches.length > 0) {
        setSelectedFabric(matches[0].id);
        toast({ title: "Auto-Match Found", description: `Found ${matches.length} matches.` });
      }

      setStep(2);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Extraction Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMapping = async () => {
    setLoading(true);
    try {
      await BillMappingService.confirmMapping(recordId, {
        fabric_id: selectedFabric,
        fabric_type: billType === 'Purchase' ? 'Base' : 'Finish',
        supplier_id: null,
        update_cost: true,
        new_cost: extractedData.rate
      });
      setStep(3);
      toast({ title: 'Success', description: 'Bill mapped and cost updated.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save mapping.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <Helmet><title>Bulk Bill Import</title></Helmet>
      <AdminPageHeader 
        title="Bulk Bill Import (AI)" 
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Bill Import'}]}
      />

      {/* Progress */}
      <div className="flex justify-between mb-8 max-w-2xl mx-auto">
        {['Upload', 'Verify & Map', 'Complete'].map((label, i) => (
            <div key={i} className={`flex flex-col items-center gap-2 ${step > i ? 'text-green-600' : step === i + 1 ? 'text-blue-600' : 'text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step > i ? 'border-green-600 bg-green-50' : step === i + 1 ? 'border-blue-600 bg-blue-50' : 'border-slate-300'}`}>
                    {step > i ? <CheckCircle className="w-5 h-5"/> : <span>{i+1}</span>}
                </div>
                <span className="text-xs font-medium">{label}</span>
            </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Bill Preview */}
          <div className="space-y-4">
             <Card className="h-full min-h-[400px] flex flex-col">
                <CardHeader>
                    <CardTitle>Bill Preview</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg m-4">
                    {filePreview ? (
                        <img src={filePreview} alt="Bill" className="max-h-[500px] object-contain" />
                    ) : (
                        <div className="text-center text-slate-400">
                            <FileText className="w-12 h-12 mx-auto mb-2" />
                            <p>No document uploaded</p>
                        </div>
                    )}
                </CardContent>
             </Card>
          </div>

          {/* Right Column: Steps */}
          <div className="space-y-4">
            {step === 1 && (
                <Card>
                <CardHeader>
                    <CardTitle>1. Upload Bill</CardTitle>
                    <CardDescription>Supported: JPG, PNG, PDF</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Bill Type</Label>
                        <Select value={billType} onValueChange={setBillType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Purchase">Purchase Bill (Raw Material)</SelectItem>
                                <SelectItem value="JobWork">Job Worker Bill (Process)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Select File</Label>
                        <Input type="file" accept=".pdf,.jpg,.png" onChange={handleFileSelect} />
                    </div>
                    <Button className="w-full" onClick={handleUploadAndExtract} disabled={loading || !file}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                        {loading ? 'Analyzing...' : 'Analyze with AI'}
                    </Button>
                </CardContent>
                </Card>
            )}

            {step === 2 && extractedData && (
                <Card>
                <CardHeader>
                    <CardTitle>2. Verify & Map</CardTitle>
                    <CardDescription>AI Confidence: <span className="text-green-600 font-bold">{(extractedData.confidence_score * 100).toFixed(0)}%</span></CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2 p-3 bg-slate-50 rounded border text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Vendor:</span>
                            <span className="font-medium">{extractedData.supplier_name || extractedData.job_worker_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{extractedData.bill_date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-bold text-green-600">₹{extractedData.bill_amount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Description:</span>
                            <span className="font-medium italic">{extractedData.description}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Map to Fabric Item</Label>
                        <Select value={selectedFabric} onValueChange={setSelectedFabric}>
                            <SelectTrigger><SelectValue placeholder="Select from Inventory..." /></SelectTrigger>
                            <SelectContent>
                                {potentialMatches.length > 0 && <SelectItem value="header" disabled className="font-bold text-slate-900">Suggested Matches</SelectItem>}
                                {potentialMatches.map(m => (
                                    <SelectItem key={m.id} value={m.id}>★ {m.base_fabric_name || m.finish_fabric_name}</SelectItem>
                                ))}
                                <SelectItem value="divider" disabled>──────────</SelectItem>
                                {baseFabrics.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button className="w-full" onClick={handleConfirmMapping} disabled={loading || !selectedFabric}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Confirm & Update Costs
                    </Button>
                </CardContent>
                </Card>
            )}

            {step === 3 && (
                <Card className="bg-green-50 border-green-200">
                <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                        <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-800">Success!</h3>
                    <p className="text-green-700 mb-6">
                        Bill recorded and inventory costs updated automatically.
                    </p>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => { setStep(1); setFile(null); setFilePreview(null); }}>Import Another</Button>
                        <Button onClick={() => navigate('/admin/fabric-master')}>Dashboard</Button>
                    </div>
                </CardContent>
                </Card>
            )}
          </div>
      </div>
    </div>
  );
};

export default BulkBillImportPage;