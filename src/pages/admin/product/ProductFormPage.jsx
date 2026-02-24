import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Plus, Trash2, Edit2, Info, Calculator, Package, Shirt } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

const COMPONENT_TYPES = [
  "Top", "Bottom", "Dupatta", "Inner", "Lining", "Sleeves", "Front Panel", "Back Panel", "Other"
];

const ProductFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Master Data
  const [garmentTypes, setGarmentTypes] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  
  // Form Data
  const [formData, setFormData] = useState({
    name: '', sku: '', garment_type: '', set_type: '', description: ''
  });

  // Components State structure:
  // [ { id (temp/real), type: 'Top', total_consumption: 0, parts: [ { fabric_id, part_name, consumption } ] } ]
  const [components, setComponents] = useState([]);

  // Modal State
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [editingComponentIndex, setEditingComponentIndex] = useState(null);
  const [tempComponent, setTempComponent] = useState({
    type: 'Top',
    parts: [{ fabric_id: 'none', part_name: 'Main', consumption: '' }]
  });

  useEffect(() => {
    fetchMasterData();
    if (isEdit) fetchProductDetails();
  }, [id]);

  const fetchMasterData = async () => {
    const { data: g } = await supabase.from('garment_types').select('*');
    const { data: f } = await supabase.from('fabrics').select('id, fabric_name, base_type, width, fabric_costs(rate)');
    setGarmentTypes(g || []);
    setFabrics(f || []);
  };

  const fetchProductDetails = async () => {
    setLoading(true);
    // Fetch Product
    const { data: prod } = await supabase.from('products').select('*').eq('id', id).single();
    if (prod) setFormData(prod);

    // Fetch Components & Mappings
    const { data: comps } = await supabase.from('product_components').select('*').eq('product_id', id);
    const { data: maps } = await supabase.from('product_fabric_mapping').select('*').eq('product_id', id);

    if (comps && maps) {
       const mergedComponents = comps.map(c => {
         const parts = maps.filter(m => m.component_id === c.id).map(m => ({
            fabric_id: m.fabric_id,
            part_name: m.part_detail || 'Main',
            consumption: m.consumption_value
         }));
         return {
            ...c,
            type: c.component_type,
            parts: parts.length > 0 ? parts : [{ fabric_id: 'none', part_name: 'Main', consumption: '' }]
         };
       });
       setComponents(mergedComponents);
    }
    setLoading(false);
  };

  // --- Logic ---

  const generateAutoDescription = () => {
     if (components.length === 0) return;
     
     const descParts = components.map(comp => {
         // Get unique fabric names for this component
         const fabricNames = [...new Set(comp.parts.map(p => {
             const f = fabrics.find(fab => fab.id === p.fabric_id);
             return f ? f.fabric_name : '';
         }).filter(Boolean))];
         
         const fabricStr = fabricNames.length > 0 ? fabricNames.join('/') : 'Unknown Fabric';
         return `${fabricStr} ${comp.type}`;
     });

     const desc = descParts.join(' with ');
     setFormData(prev => ({ ...prev, description: desc }));
     toast({ title: "Description Updated", description: "Product description auto-generated from components." });
  };

  const calculateTotalConsumption = () => {
      let total = 0;
      components.forEach(c => {
          c.parts.forEach(p => total += Number(p.consumption || 0));
      });
      return total.toFixed(2);
  };

  const calculateEstimatedCost = () => {
      let totalCost = 0;
      components.forEach(c => {
          c.parts.forEach(p => {
             const fab = fabrics.find(f => f.id === p.fabric_id);
             // Find average cost or specific cost (using simple logic here: first cost found or 0)
             const rate = fab?.fabric_costs?.[0]?.rate || 0; 
             totalCost += (Number(p.consumption || 0) * rate);
          });
      });
      return totalCost.toFixed(2);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.sku || !formData.garment_type) {
        toast({ variant: 'destructive', title: "Validation Error", description: "Name, SKU, and Type are required." });
        return;
    }
    if (components.length === 0) {
        toast({ variant: 'destructive', title: "Validation Error", description: "At least one component is required." });
        return;
    }

    setLoading(true);
    try {
        // 1. Upsert Product
        const { data: prodData, error: prodError } = await supabase
            .from('products')
            .upsert({
                id: isEdit ? id : undefined,
                name: formData.name,
                sku: formData.sku,
                garment_type: formData.garment_type,
                set_type: formData.set_type,
                description: formData.description
            })
            .select()
            .single();

        if (prodError) throw prodError;
        const productId = prodData.id;

        // 2. Handle Components (Full Replacement Strategy for simplicity)
        // First delete existing mappings and components for this product
        if (isEdit) {
            await supabase.from('product_fabric_mapping').delete().eq('product_id', productId);
            await supabase.from('product_components').delete().eq('product_id', productId);
        }

        // Insert new components
        for (const comp of components) {
            const totalCons = comp.parts.reduce((acc, p) => acc + Number(p.consumption || 0), 0);
            
            // Insert parent component
            const { data: compData, error: compError } = await supabase
                .from('product_components')
                .insert({
                    product_id: productId,
                    component_type: comp.type,
                    consumption_value: totalCons,
                    unit: 'meters'
                })
                .select()
                .single();
            
            if (compError) throw compError;

            // Insert fabric mappings (parts)
            const mappings = comp.parts.map(p => ({
                product_id: productId,
                component_id: compData.id,
                fabric_id: p.fabric_id === 'none' ? null : p.fabric_id,
                component_type: comp.type, // Redundant but requested/useful
                part_detail: p.part_name,
                consumption_value: Number(p.consumption || 0)
            }));

            if (mappings.length > 0) {
                const { error: mapError } = await supabase.from('product_fabric_mapping').insert(mappings);
                if (mapError) throw mapError;
            }
        }

        toast({ title: "Success", description: "Product saved successfully." });
        navigate('/admin/products');

    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: "Error", description: error.message });
    } finally {
        setLoading(false);
    }
  };

  // --- Modal Handlers ---

  const openNewComponentModal = () => {
      setTempComponent({ type: 'Top', parts: [{ fabric_id: 'none', part_name: 'Main', consumption: '' }] });
      setEditingComponentIndex(null);
      setIsComponentModalOpen(true);
  };

  const openEditComponentModal = (index) => {
      setTempComponent(JSON.parse(JSON.stringify(components[index])));
      setEditingComponentIndex(index);
      setIsComponentModalOpen(true);
  };

  const saveComponentFromModal = () => {
      if (editingComponentIndex !== null) {
          const newComps = [...components];
          newComps[editingComponentIndex] = tempComponent;
          setComponents(newComps);
      } else {
          setComponents([...components, tempComponent]);
      }
      setIsComponentModalOpen(false);
  };

  const addPartToTemp = () => {
      setTempComponent(prev => ({
          ...prev,
          parts: [...prev.parts, { fabric_id: 'none', part_name: '', consumption: '' }]
      }));
  };

  const removePartFromTemp = (idx) => {
      setTempComponent(prev => ({
          ...prev,
          parts: prev.parts.filter((_, i) => i !== idx)
      }));
  };

  const updatePart = (idx, field, value) => {
      const newParts = [...tempComponent.parts];
      newParts[idx][field] = value;
      setTempComponent(prev => ({ ...prev, parts: newParts }));
  };

  const deleteComponent = (index) => {
      setComponents(prev => prev.filter((_, i) => i !== index));
  };


  return (
    <>
      <Helmet><title>{isEdit ? 'Edit Product' : 'New Product'} - Admin</title></Helmet>
      <div className="space-y-6 pb-20">
        <AdminPageHeader 
          title={isEdit ? `Edit: ${formData.name}` : 'Create New Product'}
          breadcrumbs={[{ label: 'Product Master', href: '/admin/products' }, { label: isEdit ? 'Edit' : 'New' }]}
          onBack={() => navigate('/admin/products')}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="components">Components & Fabrics</TabsTrigger>
                <TabsTrigger value="calculator">Cost & Consumption</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
                <Card>
                    <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-red-500">Product Name *</Label>
                            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Blue Printed Kurti"/>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-red-500">SKU *</Label>
                            <Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="e.g. K-001"/>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-red-500">Garment Type *</Label>
                            <Select value={formData.garment_type || 'none'} onValueChange={v => setFormData({...formData, garment_type: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Type"/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {garmentTypes.map(g => <SelectItem key={g.id} value={g.garment_name}>{g.garment_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Set Type</Label>
                            <Select value={formData.set_type || 'none'} onValueChange={v => setFormData({...formData, set_type: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Set Type"/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="Single">Single</SelectItem>
                                    <SelectItem value="2-Pc Set">2-Pc Set</SelectItem>
                                    <SelectItem value="3-Pc Set">3-Pc Set</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label>Description</Label>
                            <div className="flex gap-2">
                                <Textarea 
                                    value={formData.description} 
                                    onChange={e => setFormData({...formData, description: e.target.value})} 
                                    className="min-h-[100px]"
                                />
                                <Button 
                                    variant="outline" 
                                    className="h-auto whitespace-normal w-32 flex-shrink-0 text-xs flex flex-col gap-1"
                                    onClick={generateAutoDescription}
                                    type="button"
                                >
                                    <Edit2 className="h-4 w-4"/>
                                    Auto Generate
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Click "Auto Generate" to build description from components.</p>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="components" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Garment Composition</h3>
                    <Button onClick={openNewComponentModal}><Plus className="mr-2 h-4 w-4"/> Add Component</Button>
                </div>
                
                {components.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
                        <Shirt className="h-10 w-10 mx-auto mb-2 opacity-50"/>
                        <p>No components added yet.</p>
                        <Button variant="link" onClick={openNewComponentModal}>Add your first component</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {components.map((comp, idx) => {
                             const totalCons = comp.parts.reduce((a, b) => a + Number(b.consumption||0), 0);
                             return (
                                <Card key={idx} className="relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"/>
                                    <CardHeader className="py-3 bg-slate-50 border-b flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{comp.type}</Badge>
                                            <span className="text-sm text-muted-foreground">Total: <strong>{totalCons.toFixed(2)}m</strong></span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditComponentModal(idx)}><Edit2 className="h-4 w-4"/></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteComponent(idx)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-3">
                                        <div className="space-y-2">
                                            {comp.parts.map((part, pIdx) => {
                                                const fabric = fabrics.find(f => f.id === part.fabric_id);
                                                return (
                                                    <div key={pIdx} className="flex justify-between items-center text-sm border-b last:border-0 pb-1 last:pb-0">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{part.part_name || 'Main Part'}</span>
                                                            <span className="text-xs text-muted-foreground">{fabric ? `${fabric.fabric_name} (${fabric.base_type}, ${fabric.width})` : 'No Fabric Selected'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <Badge variant="outline">{part.consumption} m</Badge>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                             );
                        })}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="calculator" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5"/> Consumption Breakdown</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-lg font-bold border-b pb-2">
                                <span>Total Fabric Required</span>
                                <span>{calculateTotalConsumption()} Meters</span>
                            </div>
                            <div className="space-y-2">
                                {components.map((c, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span>{c.type}</span>
                                        <span className="font-medium">{c.parts.reduce((a,b)=>a+Number(b.consumption||0), 0).toFixed(2)} m</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5"/> Cost Estimate</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-lg font-bold border-b pb-2 text-green-700">
                                <span>Est. Fabric Cost</span>
                                <span>₹{calculateEstimatedCost()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                * Based on primary cost tier of selected fabrics. Does not include job work or processing overheads unless configured in fabric master.
                            </p>
                            <div className="pt-4">
                                <h4 className="font-medium mb-2">Fabric Details</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {components.flatMap(c => c.parts).map((p, i) => {
                                        const fab = fabrics.find(f => f.id === p.fabric_id);
                                        const rate = fab?.fabric_costs?.[0]?.rate || 0;
                                        return fab ? (
                                            <div key={i} className="flex justify-between text-xs border p-2 rounded bg-slate-50">
                                                <span>{fab.fabric_name}</span>
                                                <span className="text-muted-foreground">₹{rate}/m x {p.consumption}m = ₹{(rate * p.consumption).toFixed(0)}</span>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>

        {/* Modal for Component Editing */}
        <Dialog open={isComponentModalOpen} onOpenChange={setIsComponentModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{editingComponentIndex !== null ? 'Edit Component' : 'Add New Component'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Component Type</Label>
                        <Select value={tempComponent.type || 'none'} onValueChange={v => setTempComponent({...tempComponent, type: v})}>
                            <SelectTrigger><SelectValue placeholder="Select Type"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {COMPONENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-md p-3 space-y-3 bg-slate-50">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium">Fabric Parts</Label>
                            <Button size="sm" variant="outline" onClick={addPartToTemp} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1"/> Add Split</Button>
                        </div>
                        {tempComponent.parts.map((part, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <div className="flex-1 space-y-1">
                                    <Input 
                                        placeholder="Part Name (e.g. Front)" 
                                        className="h-8 text-xs" 
                                        value={part.part_name} 
                                        onChange={e => updatePart(idx, 'part_name', e.target.value)}
                                    />
                                    <Select value={part.fabric_id || 'none'} onValueChange={v => updatePart(idx, 'fabric_id', v)}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Fabric"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Select Fabric</SelectItem>
                                            {fabrics.map(f => (
                                                <SelectItem key={f.id} value={f.id}>
                                                    {f.fabric_name} - {f.base_type} ({f.width})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-20 space-y-1">
                                    <Input 
                                        type="number" 
                                        placeholder="Mtrs" 
                                        className="h-8 text-xs"
                                        value={part.consumption}
                                        onChange={e => updatePart(idx, 'consumption', e.target.value)}
                                    />
                                    <div className="h-8 flex items-center justify-center">
                                         <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removePartFromTemp(idx)} disabled={tempComponent.parts.length === 1}>
                                            <Trash2 className="h-3 w-3"/>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsComponentModalOpen(false)}>Cancel</Button>
                    <Button onClick={saveComponentFromModal}>Save Component</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 lg:pl-64 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
             <Button variant="outline" onClick={() => navigate('/admin/products')}>Cancel</Button>
             <Button onClick={handleSave} disabled={loading}>
                 {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                 Save Product
             </Button>
        </div>
      </div>
    </>
  );
};

export default ProductFormPage;