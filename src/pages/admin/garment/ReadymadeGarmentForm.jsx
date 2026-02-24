import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Plus, Trash2, Calculator, Scissors, Ruler, Shirt } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';

const ReadymadeGarmentForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    // Form Data
    const [formData, setFormData] = useState({
        product_name: '', sku: '', type: 'Kurti', 
        garment_category: '', size_set: 'Standard', style_silhouette: '',
        neckline_type: '', sleeve_type: '', bottom_style: 'None', length: '',
        unstitched_suits_spec: '', description: '', status: 'active',
        
        // Costing
        stitching_labor_cost: 0, packing_cost: 0, other_costs: 0, profit_margin_percent: 20
    });

    // Dynamic Lists
    const [components, setComponents] = useState([]);
    const [accessories, setAccessories] = useState([]);
    const [sizeVariants, setSizeVariants] = useState([]);
    
    // Design Info
    const [designNumbers, setDesignNumbers] = useState(['']);
    const [designNames, setDesignNames] = useState(['']);
    const [addDesignNames, setAddDesignNames] = useState(false);
    
    // Master Data
    const [fabrics, setFabrics] = useState([]); // Both finish and fancy
    const [workers, setWorkers] = useState([]);

    useEffect(() => {
        fetchMasterData();
        if (isEdit) fetchData();
    }, []);

    const fetchMasterData = async () => {
        const { data: finish } = await supabase.from('finish_fabrics').select('id, finish_fabric_name');
        const { data: fancy } = await supabase.from('fancy_finish_fabrics').select('id, fancy_finish_name');
        
        const combined = [
            ...(finish || []).map(f => ({ id: f.id, name: f.finish_fabric_name, type: 'finish' })),
            ...(fancy || []).map(f => ({ id: f.id, name: f.fancy_finish_name, type: 'fancy' }))
        ];
        setFabrics(combined);

        const { data: jobWorkers } = await supabase.from('job_workers').select('*');
        setWorkers(jobWorkers || []);
    };

    const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase.from('readymade_garments').select('*').eq('id', id).single();
        if (data) {
            setFormData(data);
            
            if (data.design_numbers && Array.isArray(data.design_numbers) && data.design_numbers.length > 0) setDesignNumbers(data.design_numbers);
            if (data.design_names && Array.isArray(data.design_names) && data.design_names.length > 0) {
                setDesignNames(data.design_names);
                setAddDesignNames(true);
            }

            const { data: comps } = await supabase.from('garment_components').select('*').eq('readymade_garment_id', id);
            setComponents(comps || []);
            
            const { data: accs } = await supabase.from('garment_accessories').select('*').eq('readymade_garment_id', id);
            setAccessories(accs || []);
            
            const { data: sizes } = await supabase.from('garment_size_variants').select('*').eq('readymade_garment_id', id);
            setSizeVariants(sizes || []);
        }
        setLoading(false);
    };

    // Helper Functions
    const addComponent = () => setComponents([...components, { component_type: 'Top', consumption_meters: 0 }]);
    const removeComponent = (idx) => setComponents(components.filter((_, i) => i !== idx));
    const updateComponent = (idx, field, val) => {
        const newC = [...components];
        newC[idx][field] = val;
        if (field === 'fabric_link_id') {
            const fab = fabrics.find(f => f.id === val);
            if (fab) newC[idx].fabric_type = fab.type;
        }
        setComponents(newC);
    };

    const addAccessory = () => setAccessories([...accessories, { accessory_name: 'Buttons', consumption_per_piece: 0 }]);
    const removeAccessory = (idx) => setAccessories(accessories.filter((_, i) => i !== idx));
    const updateAccessory = (idx, field, val) => {
        const newA = [...accessories];
        newA[idx][field] = val;
        setAccessories(newA);
    };

    const addSize = () => setSizeVariants([...sizeVariants, { size: 'M', consumption_multiplier: 1.0 }]);
    const removeSize = (idx) => setSizeVariants(sizeVariants.filter((_, i) => i !== idx));
    const updateSize = (idx, field, val) => {
        const newS = [...sizeVariants];
        newS[idx][field] = val;
        setSizeVariants(newS);
    };
    
    const handleArrayChange = (setter, state, index, value) => {
        const newState = [...state];
        newState[index] = value;
        setter(newState);
    };
    const addArrayItem = (setter, state) => setter([...state, '']);
    const removeArrayItem = (setter, state, index) => setter(state.filter((_, i) => i !== index));

    const calculateTotalCost = () => {
        const labor = Number(formData.stitching_labor_cost) || 0;
        const pack = Number(formData.packing_cost) || 0;
        const other = Number(formData.other_costs) || 0;
        return labor + pack + other; 
    };
    
    const totalConsumption = components.reduce((acc, curr) => {
        if (['Top', 'Bottom', 'Dupatta'].includes(curr.component_type)) {
            return acc + (Number(curr.consumption_meters) || 0);
        }
        return acc;
    }, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.product_name) return toast({ title: 'Error', description: 'Product Name is required', variant: 'destructive' });
        
        // Validate Design Numbers
        const validDesignNumbers = designNumbers.filter(d => d.trim() !== '');
        if (validDesignNumbers.length === 0) return toast({ variant: 'destructive', title: 'Required', description: 'At least one Design Number is required.' });

        const validDesignNames = addDesignNames ? designNames.filter(d => d.trim() !== '') : [];

        setLoading(true);
        try {
            const payload = {
                ...formData,
                design_numbers: validDesignNumbers,
                design_names: validDesignNames
            };

            let garmentId = id;
            if (isEdit) {
                await supabase.from('readymade_garments').update(payload).eq('id', id);
            } else {
                const { data, error } = await supabase.from('readymade_garments').insert(payload).select().single();
                if (error) throw error;
                garmentId = data.id;
            }

            // Sync related tables
            if (isEdit) {
                await supabase.from('garment_components').delete().eq('readymade_garment_id', garmentId);
                await supabase.from('garment_accessories').delete().eq('readymade_garment_id', garmentId);
                await supabase.from('garment_size_variants').delete().eq('readymade_garment_id', garmentId);
            }

            if (components.length > 0) {
                await supabase.from('garment_components').insert(components.map(c => ({
                    readymade_garment_id: garmentId,
                    component_type: c.component_type,
                    fabric_type: c.fabric_type,
                    finish_fabric_id: c.fabric_type === 'finish' ? c.fabric_link_id : null,
                    fancy_finish_id: c.fabric_type === 'fancy' ? c.fabric_link_id : null,
                    consumption_meters: c.consumption_meters,
                    consumption_unit: 'Meters'
                })));
            }

            if (accessories.length > 0) {
                await supabase.from('garment_accessories').insert(accessories.map(a => ({
                    readymade_garment_id: garmentId,
                    ...a
                })));
            }

            if (sizeVariants.length > 0) {
                await supabase.from('garment_size_variants').insert(sizeVariants.map(s => ({
                    readymade_garment_id: garmentId,
                    ...s
                })));
            }

            toast({ title: 'Success', description: 'Garment saved successfully.' });
            navigate('/admin/fabric-master'); 

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-24">
            <Helmet><title>{isEdit ? 'Edit Garment' : 'New Garment'}</title></Helmet>
            <AdminPageHeader 
                title={isEdit ? 'Edit Readymade Garment' : 'Create Readymade Garment'} 
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Garment Master'}]}
                onBack={() => navigate('/admin/fabric-master')}
            />

            <Tabs defaultValue="header" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="header">Header & Specs</TabsTrigger>
                    <TabsTrigger value="design">Design Info</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="variants">Sizes & Acc.</TabsTrigger>
                    <TabsTrigger value="costing">Costing</TabsTrigger>
                </TabsList>

                <TabsContent value="header" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader><CardTitle>Product Header</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><Label>Product Name *</Label><Input value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} /></div>
                            <div className="space-y-2"><Label>SKU</Label><Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="Auto-generated if empty"/></div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {['Kurti', '2-Pc Set', '3-Pc Set', 'Gown', 'Dress Material', 'Bottom Wear', 'Tops', 'Leggings', 'Co-ord Sets', 'Saree', 'Lehenga', 'Blouse', 'Shirt', 'Pants', 'Others'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Garment Category</Label>
                                <Select value={formData.garment_category} onValueChange={v => setFormData({...formData, garment_category: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select Category"/></SelectTrigger>
                                    <SelectContent>
                                        {['Kurti', 'Bottom', 'Dupatta', 'Stall Dupatta', 'Unstitched Suits', 'Tops', 'Leggings', 'Co-ord Sets', 'Gown', 'Saree', 'Lehenga', 'Blouse', 'Shirt', 'Pants', 'Others'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Size Set</Label>
                                <Select value={formData.size_set} onValueChange={v => setFormData({...formData, size_set: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {['Standard', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'Free Size', 'Combo Pack'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Silhouette</Label>
                                <Select value={formData.style_silhouette} onValueChange={v => setFormData({...formData, style_silhouette: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                                    <SelectContent>
                                        {['Straight Cut', 'A-Line', 'Anarkali', 'Angrakha', 'Kaftan', 'Nyra Cut', 'Peplum'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Neckline</Label>
                                <Select value={formData.neckline_type} onValueChange={v => setFormData({...formData, neckline_type: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                                    <SelectContent>
                                        {['Round', 'Mandarin Collar', 'Boat Neck', 'Square', 'Sweetheart', 'V-Neck'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Sleeve</Label>
                                <Select value={formData.sleeve_type} onValueChange={v => setFormData({...formData, sleeve_type: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                                    <SelectContent>
                                        {['Sleeveless', 'Short Sleeve', '3/4th', 'Full Sleeve', 'Bell Sleeve', 'Puff Sleeve'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Bottom Style</Label>
                                <Select value={formData.bottom_style} onValueChange={v => setFormData({...formData, bottom_style: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                                    <SelectContent>
                                        {['None', 'Pant/Trouser', 'Palazzo', 'Sharara', 'Salwar', 'Skirt/Lehenga'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Length</Label>
                                <Select value={formData.length} onValueChange={v => setFormData({...formData, length: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select Length"/></SelectTrigger>
                                    <SelectContent>
                                        {['Crop/Short', 'Top style', 'Knee Length', 'Calf Length (40-42")', 'Floor Length/Gown (54-56")'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2 md:col-span-2">
                                <Label>Unstitched Suits Spec</Label>
                                <Select value={formData.unstitched_suits_spec} onValueChange={v => setFormData({...formData, unstitched_suits_spec: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select Specification"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Standard">Top 2.50m / Bottom 2.00m / Dupatta 2.25m (Standard)</SelectItem>
                                        <SelectItem value="Heavy">Top 2.50m / Bottom 2.50m / Dupatta 2.25m (Heavy Patiala)</SelectItem>
                                        <SelectItem value="Running">Top Only (Running Material)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="design" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Design Information</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Design Numbers <span className="text-red-500">*</span></Label>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => addArrayItem(setDesignNumbers, designNumbers)} className="h-6 text-xs gap-1">
                                            <Plus className="h-3 w-3" /> Add
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {designNumbers.map((dn, index) => (
                                            <div key={index} className="flex gap-2">
                                                <Input 
                                                    value={dn} 
                                                    onChange={e => handleArrayChange(setDesignNumbers, designNumbers, index, e.target.value)} 
                                                    placeholder={`Design No. ${index + 1} (e.g. D-001)`}
                                                    required={index === 0} 
                                                />
                                                {designNumbers.length > 1 && (
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem(setDesignNumbers, designNumbers, index)} className="text-red-500">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between h-9">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="addDesignNames" checked={addDesignNames} onCheckedChange={setAddDesignNames} />
                                            <Label htmlFor="addDesignNames">Add Design Names (Optional)</Label>
                                        </div>
                                        {addDesignNames && (
                                            <Button type="button" variant="ghost" size="sm" onClick={() => addArrayItem(setDesignNames, designNames)} className="h-6 text-xs gap-1">
                                                <Plus className="h-3 w-3" /> Add
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {addDesignNames && (
                                        <div className="space-y-2">
                                            {designNames.map((dn, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <Input 
                                                        value={dn} 
                                                        onChange={e => handleArrayChange(setDesignNames, designNames, index, e.target.value)} 
                                                        placeholder={`Design Name ${index + 1} (e.g. Floral)`}
                                                    />
                                                    {designNames.length > 1 && (
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem(setDesignNames, designNames, index)} className="text-red-500">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="components" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Scissors className="h-5 w-5"/> The Components Fix</CardTitle>
                                <p className="text-sm text-muted-foreground">Total Consumption: <strong>{totalConsumption.toFixed(2)}m</strong></p>
                            </div>
                            <Button size="sm" onClick={addComponent}><Plus className="h-4 w-4 mr-2"/> Add Component</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {components.map((comp, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border rounded-lg bg-slate-50 relative">
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-red-500" onClick={() => removeComponent(idx)}><Trash2 className="h-3 w-3"/></Button>
                                    
                                    <div className="md:col-span-3 space-y-2">
                                        <Label>Component Type</Label>
                                        <Select value={comp.component_type} onValueChange={v => updateComponent(idx, 'component_type', v)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                {['Top', 'Bottom', 'Dupatta', 'Inner/Lining', 'Stall', 'Sleeves', 'Front', 'Back', 'Pants', 'Leggings', 'Gown', 'Saree', 'Lehenga', 'Blouse', 'Shirt', 'Others'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-4 space-y-2">
                                        <Label>Fabric Link</Label>
                                        <Select value={comp.fabric_link_id} onValueChange={v => updateComponent(idx, 'fabric_link_id', v)}>
                                            <SelectTrigger><SelectValue placeholder="Search fabric..."/></SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {fabrics.map(f => (
                                                    <SelectItem key={f.id} value={f.id}>
                                                        <span className="font-medium">{f.name}</span> 
                                                        <span className="text-xs text-muted-foreground ml-2">({f.type})</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Cons. (Mtrs)</Label>
                                        <Input type="number" step="0.01" value={comp.consumption_meters} onChange={e => updateComponent(idx, 'consumption_meters', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                            {components.length === 0 && <div className="text-center py-8 text-muted-foreground">No components added. Click 'Add Component' to start.</div>}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="variants" className="mt-4 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base flex items-center gap-2"><Ruler className="h-4 w-4"/> Size Variants</CardTitle>
                            <Button size="sm" variant="outline" onClick={addSize}><Plus className="h-3 w-3"/></Button>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sizeVariants.map((s, idx) => (
                                <div key={idx} className="flex gap-2 items-center p-2 border rounded">
                                    <Select value={s.size} onValueChange={v => updateSize(idx, 'size', v)}>
                                        <SelectTrigger className="w-[100px]"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            {['XS','S','M','L','XL','XXL','3XL','4XL','5XL','Free Size'].map(sz => <SelectItem key={sz} value={sz}>{sz}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex-1">
                                        <Input 
                                            type="number" 
                                            step="0.1" 
                                            value={s.consumption_multiplier} 
                                            onChange={e => updateSize(idx, 'consumption_multiplier', e.target.value)} 
                                            placeholder="Multiplier (e.g. 1.1)"
                                            title="Consumption Multiplier"
                                        />
                                    </div>
                                    <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8" onClick={() => removeSize(idx)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base flex items-center gap-2"><Shirt className="h-4 w-4"/> Accessories</CardTitle>
                            <Button size="sm" variant="outline" onClick={addAccessory}><Plus className="h-3 w-3"/></Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {accessories.map((acc, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 border rounded bg-slate-50">
                                    <div className="col-span-4">
                                        <Select value={acc.accessory_name} onValueChange={v => updateAccessory(idx, 'accessory_name', v)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                {['Buttons', 'Lace/Border', 'Brand Label', 'Wash Care Tag', 'Zipper (Chain)'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2">
                                         <Input placeholder="Unit" value={acc.unit || ''} onChange={e => updateAccessory(idx, 'unit', e.target.value)} />
                                    </div>
                                    <div className="col-span-2">
                                        <Input type="number" placeholder="Qty" value={acc.consumption_per_piece} onChange={e => updateAccessory(idx, 'consumption_per_piece', e.target.value)} />
                                    </div>
                                    <div className="col-span-3">
                                        <Input placeholder="Cost Logic" value={acc.cost_calculation} onChange={e => updateAccessory(idx, 'cost_calculation', e.target.value)} />
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8" onClick={() => removeAccessory(idx)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="costing" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5"/> Costing Estimation</CardTitle>
                            <Button variant="outline" size="sm" asChild>
                                <Link to="/admin/costing/readymade-cost" state={{ productName: formData.product_name }}>
                                    Go to Advanced Cost Sheet
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Stitching Labor (Worker)</Label>
                                    <Select 
                                        onValueChange={(val) => {
                                            const w = workers.find(w => w.id === val);
                                            if (w) setFormData({...formData, stitching_labor_cost: w.stitching_labor_cost});
                                        }}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select Job Worker" /></SelectTrigger>
                                        <SelectContent>
                                            {workers.map(w => (
                                                <SelectItem key={w.id} value={w.id}>{w.worker_name} (₹{w.stitching_labor_cost})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Manual Labor Cost (₹)</Label><Input type="number" value={formData.stitching_labor_cost} onChange={e => setFormData({...formData, stitching_labor_cost: e.target.value})} /></div>
                                <div className="space-y-2"><Label>Packing Cost (₹)</Label><Input type="number" value={formData.packing_cost} onChange={e => setFormData({...formData, packing_cost: e.target.value})} /></div>
                                <div className="space-y-2"><Label>Other Overheads (₹)</Label><Input type="number" value={formData.other_costs} onChange={e => setFormData({...formData, other_costs: e.target.value})} /></div>
                            </div>
                            
                            <div className="bg-slate-50 p-6 rounded-lg space-y-4 border">
                                <h3 className="font-semibold text-lg border-b pb-2">Cost Breakdown</h3>
                                <div className="flex justify-between text-sm">
                                    <span>Base Costs (Labor + Pack + Other):</span>
                                    <span className="font-mono font-bold">₹{calculateTotalCost().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>+ Fabric Cost (Approx):</span>
                                    <span>Calculated dynamically</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>+ Accessory Cost:</span>
                                    <span>Calculated dynamically</span>
                                </div>
                                
                                <div className="pt-4 border-t space-y-2">
                                    <div className="space-y-2">
                                        <Label>Profit Margin (%)</Label>
                                        <Input 
                                            type="number" 
                                            value={formData.profit_margin_percent} 
                                            onChange={e => setFormData({...formData, profit_margin_percent: e.target.value})}
                                            className={Number(formData.profit_margin_percent) < 10 ? 'border-red-500 bg-red-50' : 'border-green-500'}
                                        />
                                        {Number(formData.profit_margin_percent) < 10 && <p className="text-xs text-red-600 font-medium">Margin is below recommended 10%!</p>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end gap-4 lg:pl-64 z-40 shadow-lg">
                <Button type="button" variant="outline" onClick={() => navigate('/admin/fabric-master')}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Garment
                </Button>
            </div>
        </div>
    );
};

export default ReadymadeGarmentForm;