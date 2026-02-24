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

const FancyFinishFabricForm = () => {
  const { toast } = useToast();
  const [finishes, setFinishes] = useState([]);
  
  const [formData, setFormData] = useState({
    finishFabricId: '', baseFabricName: '', finishWidth: '', shortCode: '', class: '', tags: '', process: '',
    valueAddition: '', threadType: '', concept: '', placement: '', jobWorkUnit: '', shortage: '', designNo: ''
  });

  useEffect(() => {
    FabricMasterService.getFinishFabrics().then(setFinishes).catch(console.error);
  }, []);

  const handleChange = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const handleFinishChange = (id) => {
    const selected = finishes.find(b => b.id === id);
    if (selected) {
      setFormData(p => ({
        ...p, finishFabricId: id, baseFabricName: selected.base_fabrics?.fabric_name || '', 
        finishWidth: selected.width, shortCode: selected.base_fabrics?.short_code || '',
        class: selected.class || '', tags: selected.tags || '', process: selected.process || ''
      }));
    }
  };

  const liveName = FabricMasterService.generateFancyFinishName(
    formData.finishWidth, formData.baseFabricName, formData.class, formData.tags, 
    formData.process, formData.valueAddition, formData.concept
  );
  
  const liveSKU = FabricMasterService.generateFancyFinishSKU(
    formData.finishWidth, formData.shortCode, formData.class, formData.tags, 
    formData.process, formData.valueAddition, formData.concept
  );

  const availableThreads = formData.valueAddition ? THREAD_OPTIONS[formData.valueAddition] || [] : [];

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      if(!formData.finishFabricId) throw new Error("Select a Finish Fabric first");
      await FabricMasterService.createFancyFinishFabric(formData);
      toast({ title: 'Success', description: 'Fancy Finish created successfully!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Validation Error', description: error.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Helmet><title>Fancy Finish Fabric Form</title></Helmet>
      
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-md text-yellow-900 shadow-sm text-sm">
          <strong className="block mb-1">FANCY NAMING RULES:</strong>
          <ul className="list-disc pl-5 space-y-1">
            <li>Fancy FINISH Name = Width + Name + Class + Tags + Process + VA + Concept</li>
            <li>Fancy FINISH SKU = Width + Code + ClassCode + TagCode + ProcessCode + VACode + ConceptCode</li>
            <li>Fancy BASE Name = Width + Name + VA + Concept (NO process words)</li>
            <li>Fancy BASE SKU = Width + Code + VACode + ConceptCode (NO process code)</li>
          </ul>
        </div>

        <form onSubmit={handleSave}>
          <Card className="shadow-lg rounded-xl border-t-4 border-t-blue-500 mb-6">
            <CardHeader className="bg-slate-50"><CardTitle>STEP 1 - SELECT FINISH FABRIC</CardTitle></CardHeader>
            <CardContent className="p-6 grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Finish Fabric *</Label>
                <Select required value={formData.finishFabricId} onValueChange={handleFinishChange}>
                  <SelectTrigger><SelectValue placeholder="Select Finish Fabric" /></SelectTrigger>
                  <SelectContent>
                    {finishes.map(b => <SelectItem key={b.id} value={b.id}>{b.finish_fabric_name} [{b.finish_fabric_sku}]</SelectItem>)}
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
                <Label>Thread Type <span className="text-xs text-orange-600">(auto +₹5 surcharge for Cotton)</span></Label>
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
            <p><strong>Fancy Finish Name:</strong> {liveName || '...'}</p>
            <p><strong>SKU:</strong> <span className="font-mono bg-green-200 px-2 py-1 rounded">{liveSKU || '...'}</span></p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="bg-green-600 hover:bg-green-700">Save Fancy Finish Fabric</Button>
            <Button type="button" onClick={() => toast({title: "Redirecting..."})} className="bg-purple-600 hover:bg-purple-700">-&gt; Create Fancy Base</Button>
            <Button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">+ Add Another Width</Button>
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
export default FancyFinishFabricForm;