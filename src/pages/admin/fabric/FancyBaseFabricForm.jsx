import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FabricMasterService } from '@/services/FabricMasterService';
import { ReferenceTables } from '@/components/admin/fabric/ReferenceTables';
import { VA_CODES, CONCEPT_CODES, PLACEMENT_CODES, THREAD_OPTIONS } from '@/lib/fabricMasterReferences';

const FancyBaseFabricForm = () => {
  const { toast } = useToast();
  const [bases, setBases] = useState([]);
  
  const [formData, setFormData] = useState({
    baseFabricId: '', baseFabricName: '', width: '', shortCode: '', 
    valueAddition: '', threadType: '', concept: '', placement: '', jobWorkUnit: '', shortage: '', designNo: ''
  });

  useEffect(() => {
    FabricMasterService.getBaseFabrics().then(setBases).catch(console.error);
  }, []);

  const handleChange = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const handleBaseChange = (id) => {
    const selected = bases.find(b => b.id === id);
    if (selected) {
      setFormData(p => ({
        ...p, baseFabricId: id, baseFabricName: selected.fabric_name, 
        width: selected.width, shortCode: selected.short_code
      }));
    }
  };

  const liveName = FabricMasterService.generateFancyBaseName(formData.width, formData.baseFabricName, formData.valueAddition, formData.concept);
  const liveSKU = FabricMasterService.generateFancyBaseSKU(formData.width, formData.shortCode, formData.valueAddition, formData.concept);

  const availableThreads = formData.valueAddition ? THREAD_OPTIONS[formData.valueAddition] || [] : [];

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      if(!formData.baseFabricId) throw new Error("Select a Base Fabric first");
      await FabricMasterService.createFancyBaseFabric(formData);
      toast({ title: 'Success', description: 'Fancy Base Fabric created successfully!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Validation Error', description: error.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Helmet><title>Fancy Base Fabric Form</title></Helmet>
      
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-md text-yellow-900 shadow-sm text-sm">
          <strong className="block mb-1">FANCY BASE NAMING RULES:</strong>
          <ul className="list-disc pl-5 space-y-1">
            <li>Fancy BASE Name = Width + Name + VA + Concept (NO process words)</li>
            <li>Fancy BASE SKU = Width + Code + VACode + ConceptCode (NO process code)</li>
            <li>Example: 44 Rayon Greige Hakoba Eyelet – NOT 44 Rayon Greige Hakoba Eyelet</li>
          </ul>
        </div>

        <form onSubmit={handleSave}>
          <Card className="shadow-lg rounded-xl border-t-4 border-t-blue-500 mb-6">
            <CardHeader className="bg-slate-50"><CardTitle>STEP 1 - SELECT BASE FABRIC</CardTitle></CardHeader>
            <CardContent className="p-6 grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Base Fabric *</Label>
                <Select required value={formData.baseFabricId} onValueChange={handleBaseChange}>
                  <SelectTrigger><SelectValue placeholder="Select Base Fabric" /></SelectTrigger>
                  <SelectContent>
                    {bases.map(b => <SelectItem key={b.id} value={b.id}>{b.base_fabric_name} [{b.sku}]</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-xl border-t-4 border-t-purple-500 mb-6">
            <CardHeader className="bg-slate-50"><CardTitle>STEP 2 - VALUE ADDITION SPECIFICATION</CardTitle></CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value Addition Type *</Label>
                <Select required value={formData.valueAddition} onValueChange={v=>handleChange('valueAddition', v)}>
                  <SelectTrigger><SelectValue placeholder="Select VA Type" /></SelectTrigger>
                  <SelectContent>{Object.keys(VA_CODES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Thread Type</Label>
                <Select value={formData.threadType} onValueChange={v=>handleChange('threadType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Thread" /></SelectTrigger>
                  <SelectContent>
                    {availableThreads.map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}
                    {availableThreads.length === 0 && <SelectItem value="None">No threads available</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Concept *</Label>
                <Select required value={formData.concept} onValueChange={v=>handleChange('concept', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Concept" /></SelectTrigger>
                  <SelectContent>{Object.keys(CONCEPT_CODES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Concept Placement</Label>
                <Select value={formData.placement} onValueChange={v=>handleChange('placement', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Placement" /></SelectTrigger>
                  <SelectContent>{Object.keys(PLACEMENT_CODES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2"><Label>Job Work Unit</Label><Input value={formData.jobWorkUnit} onChange={e=>handleChange('jobWorkUnit', e.target.value)} /></div>
              <div className="space-y-2"><Label>Shortage % *</Label><Input type="number" step="0.01" min="0.01" required value={formData.shortage} onChange={e=>handleChange('shortage', e.target.value)} /></div>
              <div className="space-y-2 col-span-2"><Label>Design No.</Label><Input value={formData.designNo} onChange={e=>handleChange('designNo', e.target.value)} /></div>
            </CardContent>
          </Card>

          <div className="bg-green-100 border border-green-300 p-4 rounded-xl shadow-sm text-green-900 mb-6">
            <h3 className="text-sm font-bold uppercase text-green-700 mb-2">Live Preview</h3>
            <p><strong>Fancy Base Name:</strong> {liveName || '...'}</p>
            <p><strong>SKU:</strong> <span className="font-mono bg-green-200 px-2 py-1 rounded">{liveSKU || '...'}</span></p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="bg-green-600 hover:bg-green-700">Save Fancy Base Fabric</Button>
            <Button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">+ Add Another</Button>
            <Button type="button" onClick={() => setFormData({})} variant="outline">Reset</Button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <ReferenceTables />
      </div>
    </div>
  );
};
export default FancyBaseFabricForm;