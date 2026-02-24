import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FabricMasterService } from '@/services/FabricMasterService';
import { ReferenceTables } from '@/components/admin/fabric/ReferenceTables';
import { FIBER_CODES, GREIGE_WIDTHS, CONSTRUCTION_CODES, PROCESS_CODES } from '@/lib/fabricMasterReferences';

const BaseFabricForm = () => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    fabricName: '', shortCode: '', base: '', process: '', width: '', 
    construction: '', stretchability: '', weight: '', gsm: '', 
    gsmTolerance: '', transparency: '', handfeel: '', yarnType: '', 
    yarnCount: '', hsnCode: ''
  });

  const handleChange = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const liveName = FabricMasterService.generateBaseFabricName(formData.width, formData.fabricName, formData.process);
  const liveSKU = FabricMasterService.generateBaseFabricSKU(formData.width, formData.shortCode, formData.process);

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      await FabricMasterService.createBaseFabric(formData);
      toast({ title: 'Success', description: 'Base Fabric created successfully!' });
      handleReset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Validation Error', description: error.message });
    }
  };

  const handleReset = () => {
    setFormData({
      fabricName: '', shortCode: '', base: '', process: '', width: '', 
      construction: '', stretchability: '', weight: '', gsm: '', 
      gsmTolerance: '', transparency: '', handfeel: '', yarnType: '', 
      yarnCount: '', hsnCode: ''
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Helmet><title>Base Fabric Master Form</title></Helmet>
      
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-md text-yellow-900 shadow-sm">
          <strong>NAMING RULE:</strong> Base Fabric Name = Width + Fabric Name + Process | Base Fabric SKU = Width + Short Code + Process Code
        </div>

        <form onSubmit={handleSave}>
          <Card className="shadow-lg rounded-xl overflow-hidden border-t-4 border-t-blue-500 mb-6">
            <CardHeader className="bg-slate-50"><CardTitle>SECTION 1 - FABRIC IDENTITY</CardTitle></CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fabric Name *</Label><Input required value={formData.fabricName} onChange={e=>handleChange('fabricName', e.target.value)} placeholder="e.g. Rayon 1.8F" /></div>
              <div className="space-y-2"><Label>Short Code *</Label><Input required value={formData.shortCode} onChange={e=>handleChange('shortCode', e.target.value.toUpperCase())} maxLength={6} placeholder="e.g. 0021" /></div>
              
              <div className="space-y-2">
                <Label>Base/Fiber *</Label>
                <Select required value={formData.base} onValueChange={v=>handleChange('base', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Base" /></SelectTrigger>
                  <SelectContent>{Object.keys(FIBER_CODES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Process *</Label>
                <Select required value={formData.process} onValueChange={v=>handleChange('process', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Process" /></SelectTrigger>
                  <SelectContent>{Object.keys(PROCESS_CODES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Base Width *</Label>
                <Select required value={formData.width} onValueChange={v=>handleChange('width', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Width" /></SelectTrigger>
                  <SelectContent>{GREIGE_WIDTHS.map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Construction</Label>
                <Select value={formData.construction} onValueChange={v=>handleChange('construction', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Construction" /></SelectTrigger>
                  <SelectContent>{Object.keys(CONSTRUCTION_CODES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Stretchability</Label>
                <Select value={formData.stretchability} onValueChange={v=>handleChange('stretchability', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Stretchability" /></SelectTrigger>
                  <SelectContent><SelectItem value="Non-Stretch">Non-Stretch</SelectItem><SelectItem value="2-Way">2-Way</SelectItem><SelectItem value="4-Way">4-Way</SelectItem></SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="bg-amber-100 border border-amber-300 p-4 rounded-xl shadow-sm text-amber-900 mb-6">
            <h3 className="text-sm font-bold uppercase text-amber-700 mb-2">Auto-Generated Preview</h3>
            <p><strong>Base Fabric Name:</strong> {liveName || '...'}</p>
            <p><strong>Base SKU:</strong> <span className="font-mono bg-amber-200 px-2 py-1 rounded">{liveSKU || '...'}</span></p>
            <p className="text-xs mt-2 opacity-70">Design No. added to SKU only when image uploaded</p>
          </div>

          <Card className="shadow-lg rounded-xl overflow-hidden border-t-4 border-t-purple-500 mb-6">
            <CardHeader className="bg-slate-50"><CardTitle>SECTION 2 - FABRIC SPECIFICATIONS</CardTitle></CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Weight (kg) *</Label><Input type="number" step="0.01" min="0.01" required value={formData.weight} onChange={e=>handleChange('weight', e.target.value)} /></div>
              <div className="space-y-2"><Label>GSM *</Label><Input type="number" step="1" min="1" required value={formData.gsm} onChange={e=>handleChange('gsm', e.target.value)} /></div>
              <div className="space-y-2"><Label>GSM Tolerance</Label><Input type="number" value={formData.gsmTolerance} onChange={e=>handleChange('gsmTolerance', e.target.value)} /></div>
              <div className="space-y-2"><Label>Transparency</Label><Input value={formData.transparency} onChange={e=>handleChange('transparency', e.target.value)} /></div>
              <div className="space-y-2"><Label>Handfeel</Label><Input value={formData.handfeel} onChange={e=>handleChange('handfeel', e.target.value)} /></div>
              <div className="space-y-2"><Label>Yarn Type</Label><Input value={formData.yarnType} onChange={e=>handleChange('yarnType', e.target.value)} /></div>
              <div className="space-y-2"><Label>Yarn Count</Label><Input type="number" value={formData.yarnCount} onChange={e=>handleChange('yarnCount', e.target.value)} /></div>
              <div className="space-y-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                <Label className="text-yellow-800 flex justify-between">HSN Code <span className="text-xs">(Never shown outside)</span></Label>
                <Input className="bg-white" value={formData.hsnCode} onChange={e=>handleChange('hsnCode', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="bg-green-600 hover:bg-green-700">Save Base Fabric</Button>
            <Button type="button" onClick={() => toast({title: "Redirecting..."})} className="bg-purple-600 hover:bg-purple-700">-&gt; Create Finish Fabric</Button>
            <Button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">+ Add Another</Button>
            <Button type="button" onClick={handleReset} variant="outline">Reset</Button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <ReferenceTables />
      </div>
    </div>
  );
};
export default BaseFabricForm;