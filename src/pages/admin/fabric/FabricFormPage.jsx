import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { sanitizeNumeric } from '@/lib/utils';

const FabricFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Master Data State
  const [processTypes, setProcessTypes] = useState([]);
  const [subtypes, setSubtypes] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [jobWorkers, setJobWorkers] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
      fabric_name: '', hsn_code: '', set_type: '', base_category: '', base_type: '',
      width: '', gsm: '', weight: '', yarn_count: '', construction: '',
      finish: '', stretchability: '', transparency: ''
  });
  const [aliases, setAliases] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [costs, setCosts] = useState([]);

  useEffect(() => {
      fetchMasterData();
      if (isEdit) fetchFabricDetails();
  }, [id]);

  const fetchMasterData = async () => {
      const { data: pt } = await supabase.from('process_types').select('*');
      const { data: st } = await supabase.from('process_subtypes').select('*');
      const { data: dl } = await supabase.from('design_layouts').select('*');
      const { data: jw } = await supabase.from('job_workers').select('*');
      setProcessTypes(pt || []);
      setSubtypes(st || []);
      setLayouts(dl || []);
      setJobWorkers(jw || []);
  };

  const fetchFabricDetails = async () => {
      setLoading(true);
      const { data: fabric, error } = await supabase.from('fabrics').select('*').eq('id', id).single();
      if (fabric) {
          setFormData(fabric);
          
          const { data: al } = await supabase.from('fabric_aliases').select('*').eq('fabric_id', id);
          setAliases(al || []);
          
          const { data: de } = await supabase.from('fabric_designs').select('*').eq('fabric_id', id);
          setDesigns(de || []);
          
          const { data: sp } = await supabase.from('fabric_specifications').select('*').eq('fabric_id', id);
          setSpecs(sp || []);
          
          const { data: co } = await supabase.from('fabric_costs').select('*').eq('fabric_id', id);
          setCosts(co || []);
      }
      setLoading(false);
  };

  const handleSave = async () => {
      if (!formData.fabric_name || !formData.base_category || !formData.base_type) {
          toast({ variant: 'destructive', title: 'Validation Error', description: 'Name, Category and Type are required.' });
          return;
      }

      setLoading(true);
      try {
          // Sanitize numeric fields
          const cleanFormData = { ...formData };
          cleanFormData.gsm = sanitizeNumeric(cleanFormData.gsm);
          cleanFormData.weight = sanitizeNumeric(cleanFormData.weight);

          // 1. Save Fabric
          let fabricId = id;
          if (isEdit) {
              await supabase.from('fabrics').update(cleanFormData).eq('id', id);
          } else {
              const { data, error } = await supabase.from('fabrics').insert(cleanFormData).select().single();
              if (error) throw error;
              fabricId = data.id;
          }

          // 2. Save Relations (Delete all and re-insert for simplicity in this demo, usually upsert is better)
          // Ideally use upsert or smart diffing, but for this constraint env, plain delete-insert is safer for consistency
          
          // Aliases
          if (isEdit) await supabase.from('fabric_aliases').delete().eq('fabric_id', fabricId);
          if (aliases.length > 0) {
              await supabase.from('fabric_aliases').insert(aliases.map(a => ({ fabric_id: fabricId, alias_name: a.alias_name })));
          }

          // Designs
          if (isEdit) await supabase.from('fabric_designs').delete().eq('fabric_id', fabricId);
          if (designs.length > 0) {
             await supabase.from('fabric_designs').insert(designs.map(d => ({ fabric_id: fabricId, design_number: d.design_number, design_name: d.design_name })));
          }

          // Specs
          if (isEdit) await supabase.from('fabric_specifications').delete().eq('fabric_id', fabricId);
          if (specs.length > 0) {
              await supabase.from('fabric_specifications').insert(specs.map(s => ({
                  fabric_id: fabricId,
                  process_type_id: s.process_type_id === 'none' ? null : s.process_type_id, // Handle 'none' value
                  process_subtype_id: s.process_subtype_id === 'none' ? null : s.process_subtype_id, // Handle 'none' value
                  design_layout_id: s.design_layout_id === 'none' ? null : s.design_layout_id, // Handle 'none' value
                  std_top_consumption: s.std_top_consumption || 0,
                  std_bottom_consumption: s.std_bottom_consumption || 0,
                  std_dupatta_consumption: s.std_dupatta_consumption || 0,
                  damage_contingency_percent: s.damage_contingency_percent || 0,
                  thread_type: s.thread_type === 'none' ? null : s.thread_type // Handle 'none' value
              })));
          }

          // Costs
          if (isEdit) await supabase.from('fabric_costs').delete().eq('fabric_id', fabricId);
          if (costs.length > 0) {
              await supabase.from('fabric_costs').insert(costs.map(c => ({
                  fabric_id: fabricId,
                  cost_type: c.cost_type,
                  rate: c.rate || 0,
                  moq: c.moq || 0,
                  moq_surcharge: c.moq_surcharge || 10,
                  job_worker_id: c.job_worker_id === 'none' ? null : c.job_worker_id // Handle 'none' value
              })));
          }

          toast({ title: 'Success', description: 'Fabric saved successfully.' });
          navigate('/admin/fabric-master');

      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Error', description: error.message });
      } finally {
          setLoading(false);
      }
  };

  // --- Helper Renderers ---
  
  const addAlias = () => setAliases([...aliases, { alias_name: '' }]);
  const removeAlias = (idx) => setAliases(aliases.filter((_, i) => i !== idx));
  const updateAlias = (idx, val) => {
      const newAliases = [...aliases];
      newAliases[idx].alias_name = val;
      setAliases(newAliases);
  };

  const addDesign = () => setDesigns([...designs, { design_number: '', design_name: '' }]);
  const removeDesign = (idx) => setDesigns(designs.filter((_, i) => i !== idx));
  const updateDesign = (idx, field, val) => {
      const newDesigns = [...designs];
      newDesigns[idx][field] = val;
      setDesigns(newDesigns);
  };

  const addSpec = () => setSpecs([...specs, { process_type_id: 'none', std_top_consumption: '' }]); // Default to 'none'
  const removeSpec = (idx) => setSpecs(specs.filter((_, i) => i !== idx));
  const updateSpec = (idx, field, val) => {
      const newSpecs = [...specs];
      newSpecs[idx][field] = val;
      setSpecs(newSpecs);
  };
  
  const addCost = () => setCosts([...costs, { cost_type: 'Digital', rate: '', job_worker_id: 'none' }]); // Default job_worker_id to 'none'
  const removeCost = (idx) => setCosts(costs.filter((_, i) => i !== idx));
  const updateCost = (idx, field, val) => {
      const newCosts = [...costs];
      newCosts[idx][field] = val;
      setCosts(newCosts);
  };

  // Conditional Logic Helpers
  const getSubtypesForProcess = (processTypeId) => subtypes.filter(s => s.process_type_id === processTypeId);
  const isHakoba = (processTypeId) => {
      const pt = processTypes.find(p => p.id === processTypeId);
      return pt?.process_name?.includes('Hakoba');
  };
  const isEmbroideryOrHakoba = (processTypeId) => {
      const pt = processTypes.find(p => p.id === processTypeId);
      return pt?.process_name?.includes('Hakoba') || pt?.process_name?.includes('Embroidery');
  };


  return (
    <>
      <Helmet><title>{isEdit ? 'Edit Fabric' : 'New Fabric'} - Admin</title></Helmet>
      <div className="space-y-6 pb-20">
        <AdminPageHeader 
          title={isEdit ? `Edit: ${formData.fabric_name}` : 'Create New Fabric'}
          breadcrumbs={[{ label: 'Fabric Master', href: '/admin/fabric-master' }, { label: isEdit ? 'Edit' : 'New' }]}
          onBack={() => navigate('/admin/fabric-master')}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start h-auto p-1 bg-slate-100">
                <TabsTrigger value="basic" className="py-2">Basic Details</TabsTrigger>
                <TabsTrigger value="specs" className="py-2">Specifications</TabsTrigger>
                <TabsTrigger value="costs" className="py-2">Costing</TabsTrigger>
                <TabsTrigger value="designs" className="py-2">Designs & Aliases</TabsTrigger>
            </TabsList>

            {/* BASIC TAB */}
            <TabsContent value="basic" className="space-y-4 mt-4">
                <Card>
                    <CardHeader><CardTitle>Classification & Properties</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-red-500">Fabric Name *</Label>
                            <Input value={formData.fabric_name} onChange={e => setFormData({...formData, fabric_name: e.target.value})} placeholder="e.g. Rayon 60s"/>
                        </div>
                        <div className="space-y-2">
                            <Label>HSN Code</Label>
                            <Input value={formData.hsn_code} onChange={e => setFormData({...formData, hsn_code: e.target.value})} />
                        </div>
                         <div className="space-y-2">
                            <Label>Set Type</Label>
                            <Select value={formData.set_type} onValueChange={v => setFormData({...formData, set_type: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Set Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                    <SelectItem value="Single">Single</SelectItem>
                                    <SelectItem value="2-Pc Set">2-Pc Set</SelectItem>
                                    <SelectItem value="3-Pc Set">3-Pc Set</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-red-500">Base Category *</Label>
                            <Select value={formData.base_category} onValueChange={v => setFormData({...formData, base_category: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                    <SelectItem value="Natural">Natural</SelectItem>
                                    <SelectItem value="Synthetic">Synthetic</SelectItem>
                                    <SelectItem value="Semi-Synthetic">Semi-Synthetic</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label className="text-red-500">Base Type *</Label>
                             <Select value={formData.base_type} onValueChange={v => setFormData({...formData, base_type: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" disabled={!formData.base_category}>Select Category First</SelectItem> {/* Explicit 'none' and disabled */}
                                    {formData.base_category === 'Natural' && ['Cotton', 'Linen', 'Silk', 'Wool', 'Hemp'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    {formData.base_category === 'Synthetic' && ['Polyester', 'Nylon', 'PV', 'NV', 'PC'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    {formData.base_category === 'Semi-Synthetic' && ['Rayon', 'Viscose', 'Modal', 'Rayon x Poly'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Width</Label>
                             <Select value={formData.width} onValueChange={v => setFormData({...formData, width: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Width" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                    {['28"', '36"', '44"', '48"', '54"', '58"', '68"', '72"'].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2"><Label>GSM</Label><Input type="number" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} /></div>
                        
                        <div className="space-y-2">
                            <Label>Yarn Count</Label>
                            <Select value={formData.yarn_count} onValueChange={v => setFormData({...formData, yarn_count: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Yarn Count" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                    {['30s', '40s', '60s', '80s', '30x30', '60x60', 'Other'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Construction</Label>
                             <Select value={formData.construction} onValueChange={v => setFormData({...formData, construction: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Construction" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                    {['Woven', 'Knitted', 'Non-Woven'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Finish</Label>
                             <Select value={formData.finish} onValueChange={v => setFormData({...formData, finish: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Finish" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                    {['Bio wash', 'Silicon', 'Mercerized', 'Lurex', 'RFD'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Stretchability</Label>
                             <Select value={formData.stretchability} onValueChange={v => setFormData({...formData, stretchability: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Stretchability" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                    {['Rigid', '2-Way', '4-Way', 'Mechanical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Transparency</Label>
                             <Select value={formData.transparency} onValueChange={v => setFormData({...formData, transparency: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Transparency" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                    {['Sheer', 'Semi-Sheer', 'Opaque'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* SPECS TAB */}
            <TabsContent value="specs" className="space-y-4 mt-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Fabric Specifications</CardTitle>
                        <Button size="sm" onClick={addSpec}><Plus className="h-4 w-4 mr-2"/> Add Spec</Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {specs.map((spec, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-slate-50 relative">
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500" onClick={() => removeSpec(index)}><Trash2 className="h-4 w-4"/></Button>
                                
                                <div className="space-y-2">
                                    <Label>Process Type</Label>
                                    <Select value={spec.process_type_id || 'none'} onValueChange={v => updateSpec(index, 'process_type_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Process Type"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                            {processTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.process_name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Subtype</Label>
                                    <Select value={spec.process_subtype_id || 'none'} onValueChange={v => updateSpec(index, 'process_subtype_id', v)} disabled={!spec.process_type_id || spec.process_type_id === 'none'}>
                                        <SelectTrigger><SelectValue placeholder="Select Subtype"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                            {getSubtypesForProcess(spec.process_type_id).map(st => <SelectItem key={st.id} value={st.id}>{st.subtype_name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Design Layout</Label>
                                    <Select value={spec.design_layout_id || 'none'} onValueChange={v => updateSpec(index, 'design_layout_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Design Layout"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                            {layouts.map(l => <SelectItem key={l.id} value={l.id}>{l.layout_name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Top Cons. (m)</Label><Input type="number" step="0.1" value={spec.std_top_consumption} onChange={e => updateSpec(index, 'std_top_consumption', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Bottom Cons. (m)</Label><Input type="number" step="0.1" value={spec.std_bottom_consumption} onChange={e => updateSpec(index, 'std_bottom_consumption', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Dupatta Cons. (m)</Label><Input type="number" step="0.1" value={spec.std_dupatta_consumption} onChange={e => updateSpec(index, 'std_dupatta_consumption', e.target.value)} /></div>
                                
                                {isHakoba(spec.process_type_id) && (
                                    <div className="space-y-2 border-l-4 border-orange-400 pl-2">
                                        <Label className="text-orange-600">Damage Contingency %</Label>
                                        <Input type="number" value={spec.damage_contingency_percent} onChange={e => updateSpec(index, 'damage_contingency_percent', e.target.value)} placeholder="e.g. 2"/>
                                    </div>
                                )}
                                {isEmbroideryOrHakoba(spec.process_type_id) && (
                                     <div className="space-y-2 border-l-4 border-blue-400 pl-2">
                                        <Label className="text-blue-600">Thread Type</Label>
                                        <Select value={spec.thread_type || 'none'} onValueChange={v => updateSpec(index, 'thread_type', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select Thread"/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                                <SelectItem value="Poly">Poly (Standard)</SelectItem>
                                                <SelectItem value="Cotton">Cotton (+₹5 Cost)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* COSTS TAB */}
            <TabsContent value="costs" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Fabric Costing</CardTitle>
                        <Button size="sm" onClick={addCost}><Plus className="h-4 w-4 mr-2"/> Add Cost Tier</Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {costs.map((cost, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-slate-50 relative items-end">
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500" onClick={() => removeCost(index)}><Trash2 className="h-4 w-4"/></Button>
                                
                                <div className="space-y-2">
                                    <Label>Cost Type</Label>
                                     <Select value={cost.cost_type} onValueChange={v => updateCost(index, 'cost_type', v)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Digital">Digital</SelectItem>
                                            <SelectItem value="Mill">Mill</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Rate (₹)</Label><Input type="number" value={cost.rate} onChange={e => updateCost(index, 'rate', e.target.value)} /></div>
                                <div className="space-y-2"><Label>MOQ (Mtr)</Label><Input type="number" value={cost.moq} onChange={e => updateCost(index, 'moq', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Surcharge (₹)</Label><Input type="number" value={cost.moq_surcharge} onChange={e => updateCost(index, 'moq_surcharge', e.target.value)} /></div>
                                <div className="space-y-2">
                                    <Label>Job Worker</Label>
                                    <Select value={cost.job_worker_id || 'none'} onValueChange={v => updateCost(index, 'job_worker_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Optional"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem> {/* Added explicit 'none' */}
                                            {jobWorkers.map(jw => <SelectItem key={jw.id} value={jw.id}>{jw.worker_name} ({jw.quality_grade})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

             {/* DESIGNS TAB */}
            <TabsContent value="designs" className="space-y-4 mt-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base">Aliases</CardTitle>
                            <Button size="xs" variant="outline" onClick={addAlias}><Plus className="h-3 w-3"/></Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {aliases.map((a, i) => (
                                <div key={i} className="flex gap-2">
                                    <Input value={a.alias_name} onChange={e => updateAlias(i, e.target.value)} placeholder="Alt Name"/>
                                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeAlias(i)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base">Designs</CardTitle>
                            <Button size="xs" variant="outline" onClick={addDesign}><Plus className="h-3 w-3"/></Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {designs.map((d, i) => (
                                <div key={i} className="flex gap-2">
                                    <Input value={d.design_number} onChange={e => updateDesign(i, 'design_number', e.target.value)} placeholder="Design #"/>
                                    <Input value={d.design_name} onChange={e => updateDesign(i, 'design_name', e.target.value)} placeholder="Name"/>
                                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeDesign(i)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                 </div>
            </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 lg:pl-64 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
             <Button variant="outline" onClick={() => navigate('/admin/fabric-master')}>Cancel</Button>
             <Button onClick={handleSave} disabled={loading}>
                 {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                 Save Fabric
             </Button>
        </div>
      </div>
    </>
  );
};

export default FabricFormPage;