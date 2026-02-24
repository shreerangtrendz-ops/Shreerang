import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, CheckCircle2 } from 'lucide-react';
import { FabricService } from '@/services/FabricService';
import { DesignService } from '@/services/DesignService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const DesignProcessingForm = ({ files, onComplete }) => {
  const { toast } = useToast();
  const [fabrics, setFabrics] = useState([]);
  const [processingData, setProcessingData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    loadFabrics();
    initializeData();
  }, [files]);

  const loadFabrics = async () => {
    try {
        const data = await FabricService.listFabrics();
        setFabrics(data || []);
    } catch(e) { console.error(e); }
  };

  const initializeData = () => {
    const initialData = files.map(file => ({
        file: file,
        designNumber: file.name.split('.')[0], // Default from filename
        skuId: '',
        aiDescription: '',
        manualDescription: '',
        status: 'pending' // pending, processing, saved, error
    }));
    setProcessingData(initialData);
  };

  const handleUpdate = (index, field, value) => {
    setProcessingData(prev => {
        const newData = [...prev];
        newData[index] = { ...newData[index], [field]: value };
        return newData;
    });
  };

  const handleGenerateAI = async (index) => {
    const item = processingData[index];
    if(!item.designNumber) return;

    handleUpdate(index, 'isGeneratingAI', true);
    
    // In a real scenario, we'd need to upload the image temporarily or pass base64
    // For this demo, we mock the call
    const description = await DesignService.generateAIDescription(item.file, item.designNumber);
    
    handleUpdate(index, 'aiDescription', description);
    handleUpdate(index, 'isGeneratingAI', false);
  };

  const handleSaveAll = async () => {
    // Validate
    const invalid = processingData.some(d => !d.designNumber || !d.skuId);
    if (invalid) {
        toast({ variant: "destructive", title: "Validation Error", description: "All designs must have a Design Number and SKU." });
        return;
    }

    setIsSaving(true);
    let successCount = 0;

    for (let i = 0; i < processingData.length; i++) {
        const item = processingData[i];
        if (item.status === 'saved') continue;

        try {
            handleUpdate(i, 'status', 'processing');
            
            // 1. Fetch Fabric SKU Code for storage path
            const fabric = fabrics.find(f => f.id === item.skuId);
            const skuCode = fabric?.sku || 'UNKNOWN';

            // 2. Upload Image
            const imageUrl = await DesignService.uploadImagesToStorage([item.file], skuCode, item.designNumber);
            
            // 3. Save Record
            await DesignService.saveDesign({
                design_number: item.designNumber,
                sku_id: item.skuId,
                image_url: imageUrl,
                ai_description: item.aiDescription,
                manual_description: item.manualDescription,
                created_by: (await supabase.auth.getUser()).data.user.id
            });

            handleUpdate(i, 'status', 'saved');
            successCount++;
            setSavedCount(successCount);

        } catch (error) {
            console.error(error);
            handleUpdate(i, 'status', 'error');
            toast({ variant: "destructive", title: "Error Saving", description: `Failed to save ${item.designNumber}` });
        }
    }

    setIsSaving(false);
    if (successCount === processingData.length) {
        toast({ title: "Success", description: "All designs uploaded successfully!" });
        if(onComplete) onComplete();
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
          <div>
            <h3 className="font-semibold text-slate-800">Process Uploads</h3>
            <p className="text-sm text-slate-500">{files.length} images selected</p>
          </div>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving {savedCount}/{files.length}</> : "Save All Designs"}
          </Button>
       </div>

       <div className="grid gap-6">
          {processingData.map((item, index) => (
            <Card key={index} className={`overflow-hidden ${item.status === 'saved' ? 'border-green-200 bg-green-50' : ''}`}>
                <div className="flex flex-col md:flex-row gap-4 p-4">
                    {/* Image Thumbnail */}
                    <div className="w-full md:w-32 h-32 flex-shrink-0 bg-slate-100 rounded-md overflow-hidden relative group">
                        <img src={URL.createObjectURL(item.file)} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                            <Button variant="ghost" className="text-white h-full w-full">View</Button>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div>
                                <Label>Design Number <span className="text-red-500">*</span></Label>
                                <Input 
                                    value={item.designNumber} 
                                    onChange={(e) => handleUpdate(index, 'designNumber', e.target.value)}
                                    disabled={item.status === 'saved'}
                                />
                            </div>
                            <div>
                                <Label>Fabric SKU <span className="text-red-500">*</span></Label>
                                <Select 
                                    value={item.skuId} 
                                    onValueChange={(val) => handleUpdate(index, 'skuId', val)}
                                    disabled={item.status === 'saved'}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Fabric..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fabrics.map(f => (
                                            <SelectItem key={f.id} value={f.id}>{f.sku} - {f.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3">
                             <div className="relative">
                                <Label className="flex justify-between">
                                    AI Description
                                    <button 
                                        onClick={() => handleGenerateAI(index)} 
                                        disabled={item.isGeneratingAI || !item.designNumber || item.status === 'saved'}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                                    >
                                        {item.isGeneratingAI ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : <Wand2 className="h-3 w-3 mr-1"/>}
                                        {item.aiDescription ? 'Regenerate' : 'Generate'}
                                    </button>
                                </Label>
                                <Textarea 
                                    className="h-20 text-xs mt-1" 
                                    value={item.aiDescription} 
                                    onChange={(e) => handleUpdate(index, 'aiDescription', e.target.value)}
                                    placeholder="Click generate to get AI insights..."
                                    disabled={item.status === 'saved'}
                                />
                             </div>
                             <div>
                                <Label>Manual Notes</Label>
                                <Input 
                                    className="text-sm"
                                    value={item.manualDescription}
                                    onChange={(e) => handleUpdate(index, 'manualDescription', e.target.value)}
                                    placeholder="Additional details..."
                                    disabled={item.status === 'saved'}
                                />
                             </div>
                        </div>
                    </div>
                </div>
                {item.status === 'saved' && (
                    <div className="bg-green-100 text-green-700 text-xs p-1 text-center font-medium flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-3 w-3" /> Saved Successfully
                    </div>
                )}
            </Card>
          ))}
       </div>
    </div>
  );
};

export default DesignProcessingForm;