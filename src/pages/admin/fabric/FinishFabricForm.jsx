import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FabricMasterService } from '@/services/FabricMasterService';
import { ReferenceTables } from '@/components/admin/fabric/ReferenceTables';
import { FINISH_WIDTHS, PROCESS_CODES, CLASS_CODES, TAG_CODES } from '@/lib/fabricMasterReferences';

const FinishFabricForm = () => {
  const { toast } = useToast();
  const [bases, setBases] = useState([]);
  
  const [formData, setFormData] = useState({
    baseFabricId: '', baseFabricName: '', shortCode: '', finishWidth: '', 
    process: '', printType: '', class: '', tags: '', inkType: '', 
    finishTreatment: '', printConcept: '', jobWorkUnit: '', shortage: '',
    design_image_url: ''
  });
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading]     = useState(false);
  const fileInputRef = useRef(null);

  async function uploadImageToBunny(file) {
    const BUNNY_ZONE = 'shreerang-s';
    const BUNNY_HOST = 'https://storage.bunnycdn.com';
    const BUNNY_KEY  = import.meta.env.VITE_BUNNY_API_KEY || 'c63b3837-120a-46bf-b953-191f40f9059c5c9f12ae-f798-4293-abb2-359df5942b06';
    const CDN_URL    = 'https://shreerang.b-cdn.net';
    const ext = file.name.split('.').pop();
    const fileName = `designs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const res = await fetch(`${BUNNY_HOST}/${BUNNY_ZONE}/${fileName}`, {
      method: 'PUT',
      headers: { AccessKey: BUNNY_KEY, 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) throw new Error('Bunny upload failed: ' + res.status);
    return `${CDN_URL}/${fileName}`;
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleImageUpload() {
    if (!imageFile) return;
    setUploading(true);
    try {
      const url = await uploadImageToBunny(imageFile);
      handleChange('design_image_url', url);
      toast({ title: 'Image uploaded ✅', description: 'Bunny CDN link saved.' });
    } catch(e) {
      toast({ variant:'destructive', title:'Upload failed', description: e.message });
    } finally { setUploading(false); }
  }

  useEffect(() => {
    FabricMasterService.getBaseFabrics().then(setBases).catch(console.error);
  }, []);

  const handleChange = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const handleBaseChange = (id) => {
    const selected = bases.find(b => b.id === id);
    if (selected) {
      setFormData(p => ({
        ...p, baseFabricId: id, baseFabricName: selected.fabric_name, shortCode: selected.short_code
      }));
    }
  };

  const liveName = FabricMasterService.generateFinishFabricName(formData.finishWidth, formData.baseFabricName, formData.class, formData.tags, formData.process);
  const liveSKU = FabricMasterService.generateFinishFabricSKU(formData.finishWidth, formData.shortCode, formData.class, formData.tags, formData.process);

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      let formData = { ...formData };
      if(!formData.baseFabricId) throw new Error("Select a Base Fabric first");
      // Upload image first if pending
      if (imageFile && !formData.design_image_url) {
        const url = await uploadImageToBunny(imageFile);
        formData = { ...formData, design_image_url: url };
      }
      await FabricMasterService.createFinishFabric(formData);
      toast({ title: 'Success', description: 'Finish Fabric created successfully!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Validation Error', description: error.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Helmet><title>Finish Fabric Form</title></Helmet>
      
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-md text-yellow-900 shadow-sm text-sm">
          <strong className="block mb-1">CRITICAL NAMING RULES:</strong>
          <ul className="list-disc pl-5 space-y-1">
            <li>Class = 'Regular' → OMIT from name AND SKU completely</li>
            <li>Tags = 'Without Foil' → OMIT from name AND SKU completely</li>
            <li>Finish Fabric Name = Width + Fabric Name + Class + Tags + Process</li>
            <li>Finish Fabric SKU = Width + ShortCode + ClassCode + TagCode + ProcessCode</li>
          </ul>
        </div>

        <form onSubmit={handleSave}>
          <Card className="shadow-lg rounded-xl border-t-4 border-t-blue-500 mb-6">
            <CardHeader className="bg-slate-50"><CardTitle>STEP 1 - SELECT BASE FABRIC</CardTitle></CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Base Fabric *</Label>
                <Select required value={formData.baseFabricId} onValueChange={handleBaseChange}>
                  <SelectTrigger><SelectValue placeholder="Select Base Fabric" /></SelectTrigger>
                  <SelectContent>
                    {bases.map(b => <SelectItem key={b.id} value={b.id}>{b.base_fabric_name} ({b.sku})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Short Code (Auto-filled)</Label><Input value={formData.shortCode} readOnly className="bg-slate-100" /></div>
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-xl border-t-4 border-t-purple-500 mb-6">
            <CardHeader className="bg-slate-50"><CardTitle>STEP 2 - PROCESS SPECIFICATION</CardTitle></CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Finish Width *</Label>
                <Select required value={formData.finishWidth} onValueChange={v=>handleChange('finishWidth', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Width" /></SelectTrigger>
                  <SelectContent>{FINISH_WIDTHS.map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Process *</Label>
                <Select required value={formData.process} onValueChange={v=>handleChange('process', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Process" /></SelectTrigger>
                  <SelectContent>{Object.keys(PROCESS_CODES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2"><Label>Print Type (if applicable)</Label><Input value={formData.printType} onChange={e=>handleChange('printType', e.target.value)} /></div>
              
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={formData.class} onValueChange={v=>handleChange('class', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>{Object.keys(CLASS_CODES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Select value={formData.tags} onValueChange={v=>handleChange('tags', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Tags" /></SelectTrigger>
                  <SelectContent>{Object.keys(TAG_CODES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2"><Label>Ink Type</Label><Input value={formData.inkType} onChange={e=>handleChange('inkType', e.target.value)} /></div>
              <div className="space-y-2"><Label>Finish Treatment</Label><Input value={formData.finishTreatment} onChange={e=>handleChange('finishTreatment', e.target.value)} placeholder="e.g. Bio-wash" /></div>
              <div className="space-y-2"><Label>Print Concept</Label><Input value={formData.printConcept} onChange={e=>handleChange('printConcept', e.target.value)} /></div>
              <div className="space-y-2"><Label>Job Work Unit</Label><Input value={formData.jobWorkUnit} onChange={e=>handleChange('jobWorkUnit', e.target.value)} /></div>
              <div className="space-y-2"><Label>Shortage % *</Label><Input type="number" step="0.01" min="0.01" required value={formData.shortage} onChange={e=>handleChange('shortage', e.target.value)} /></div>
            </CardContent>
          </Card>

          {/* Design Image Upload */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-teal-800">📷 Design Image (Bunny CDN)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 items-start">
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-24 h-24 object-cover rounded-lg border" />
                ) : formData.design_image_url ? (
                  <img src={formData.design_image_url} alt="design" className="w-24 h-24 object-cover rounded-lg border" />
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-3xl border cursor-pointer" onClick={()=>fileInputRef.current?.click()}>📷</div>
                )}
                <div className="flex-1 space-y-2">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={()=>fileInputRef.current?.click()} className="w-full">Choose Image</Button>
                  {imageFile && !formData.design_image_url && (
                    <Button type="button" size="sm" onClick={handleImageUpload} disabled={uploading} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                      {uploading ? '⏳ Uploading…' : '☁ Upload to Bunny CDN'}
                    </Button>
                  )}
                  {formData.design_image_url && (
                    <p className="text-xs text-green-700 break-all">✅ {formData.design_image_url.split('/').pop()}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-green-100 border border-green-300 p-4 rounded-xl shadow-sm text-green-900 mb-6">
            <h3 className="text-sm font-bold uppercase text-green-700 mb-2">Live Preview</h3>
            <p><strong>Finish Name:</strong> {liveName || '...'}</p>
            <p><strong>SKU:</strong> <span className="font-mono bg-green-200 px-2 py-1 rounded">{liveSKU || '...'}</span></p>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm mb-6">
            <h3 className="text-sm font-bold text-blue-800 mb-2">COMPLETE NAMING EXAMPLES</h3>
            <table className="w-full text-xs text-left text-blue-900">
              <thead><tr className="border-b border-blue-200"><th className="pb-1">Class + Tag</th><th className="pb-1">Name Example</th><th className="pb-1">SKU Example</th></tr></thead>
              <tbody>
                <tr><td className="py-1">Regular + Without Foil</td><td>44 Rayon Digital Print</td><td className="font-mono">44-0021-DP</td></tr>
                <tr><td className="py-1">Regular + Foil</td><td>44 Rayon Foil Digital Print</td><td className="font-mono">44-0021-FOI-DP</td></tr>
                <tr><td className="py-1">Regular + Gold</td><td>44 Rayon Gold Digital Print</td><td className="font-mono">44-0021-GLD-DP</td></tr>
                <tr><td className="py-1">Premium + Without Foil</td><td>44 Rayon Premium Digital Print</td><td className="font-mono">44-0021-PRM-DP</td></tr>
                <tr><td className="py-1">Premium + Foil</td><td>44 Rayon Premium Foil Digital Print</td><td className="font-mono">44-0021-PRM-FOI-DP</td></tr>
                <tr><td className="py-1">Khadi + Without Foil</td><td>44 Rayon Khadi Digital Print</td><td className="font-mono">44-0021-KHD-DP</td></tr>
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="bg-green-600 hover:bg-green-700">Save Finish Fabric</Button>
            <Button type="button" onClick={() => toast({title: "Redirecting..."})} className="bg-purple-600 hover:bg-purple-700">-&gt; Create Fancy Finish</Button>
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
export default FinishFabricForm;