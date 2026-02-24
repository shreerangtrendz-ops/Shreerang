import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Image as ImageIcon, Layers } from 'lucide-react';
import ImageUpload from '@/components/common/ImageUpload';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const COMPONENT_TYPES = [
  'Top', 'Bottom', 'Dupatta', 'Inner/Lining', 'Stall', 'Sleeves', 
  'Front', 'Back', 'Pants', 'Leggings', 'Gown', 'Saree', 'Lehenga', 'Blouse', 'Shirt', 'Others'
];

const DesignSetManager = ({ onSetCreated, existingSets }) => {
    const { toast } = useToast();
    const [sets, setSets] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Modal Form State
    const [setType, setSetType] = useState('Single');
    const [components, setComponents] = useState([]);
    const [masterDesignNumber, setMasterDesignNumber] = useState('');
    const [setPhoto, setSetPhoto] = useState('');
    const [designName, setDesignName] = useState('');
    
    // Auto-fetch data
    const [fabrics, setFabrics] = useState([]);

    // Update local state when prop changes, but prevent infinite loops
    useEffect(() => {
        if (existingSets) {
            setSets(prev => {
                // Deep comparison to prevent update if content is identical
                if (JSON.stringify(prev) !== JSON.stringify(existingSets)) {
                    return existingSets;
                }
                return prev;
            });
        }
    }, [existingSets]);

    useEffect(() => {
        let mounted = true;
        const fetchFabrics = async () => {
            try {
                const { data: finish } = await supabase.from('finish_fabrics').select('id, finish_fabric_name');
                const { data: fancy } = await supabase.from('fancy_finish_fabrics').select('id, fancy_finish_name');
                
                if (mounted) {
                    const combined = [
                        ...(finish || []).map(f => ({ id: f.id, name: f.finish_fabric_name, type: 'Finish Fabric' })),
                        ...(fancy || []).map(f => ({ id: f.id, name: f.fancy_finish_name, type: 'Fancy Finish Fabric' }))
                    ];
                    setFabrics(combined);
                }
            } catch (error) {
                console.error("Error fetching fabrics for dropdown:", error);
            }
        };
        fetchFabrics();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        // Auto-generate Master Design Number
        if (components.length > 0) {
            const numbers = components
                .map(c => c.design_number)
                .filter(n => n && n.trim() !== '')
                .join('-');
            setMasterDesignNumber(numbers);
        } else {
            setMasterDesignNumber('');
        }
    }, [components]);

    const handleAddComponent = () => {
        setComponents([...components, {
            id: Math.random(), // temp id
            component_type: 'Top',
            design_number: '',
            design_name: '',
            fabric_type: 'Finish Fabric',
            fabric_id: '',
            fabric_name: '',
            photo_url: ''
        }]);
    };

    const updateComponent = (idx, field, value) => {
        const newComps = [...components];
        newComps[idx][field] = value;
        
        // Auto-fetch fabric name if fabric_id changes
        if (field === 'fabric_id') {
            const fab = fabrics.find(f => f.id === value);
            if (fab) {
                newComps[idx].fabric_name = fab.name;
                newComps[idx].fabric_type = fab.type;
            }
        }
        setComponents(newComps);
    };

    const removeComponent = (idx) => {
        setComponents(components.filter((_, i) => i !== idx));
    };

    const handleSaveSet = async () => {
        // Validation
        if (components.length === 0) {
            return toast({ variant: 'destructive', title: "Validation Error", description: "Add at least one component." });
        }
        if (components.some(c => !c.design_number)) {
            return toast({ variant: 'destructive', title: "Validation Error", description: "Design Number is compulsory for all components." });
        }
        if (['2-Pc Set', '3-Pc Set', 'Combo Set'].includes(setType) && !setPhoto) {
            return toast({ variant: 'destructive', title: "Validation Error", description: "Set Photo is compulsory for combo sets." });
        }

        try {
            // 1. Create Design Set
            const { data: set, error: setError } = await supabase.from('design_sets').insert({
                type: setType,
                master_design_number: masterDesignNumber,
                design_name: designName,
                set_photo_url: setPhoto
            }).select().single();

            if (setError) throw setError;

            // 2. Create Components
            const componentsPayload = components.map((c, idx) => ({
                design_set_id: set.id,
                component_type: c.component_type,
                design_number: c.design_number,
                design_name: c.design_name,
                fabric_type: c.fabric_type,
                fabric_id: c.fabric_id === '' ? null : c.fabric_id,
                fabric_name: c.fabric_name,
                photo_url: c.photo_url,
                sequence: idx
            }));

            const { error: compError } = await supabase.from('design_set_components').insert(componentsPayload);
            if (compError) throw compError;

            toast({ title: "Success", description: "Design Combo Pack created successfully." });
            
            // Add to local list and notify parent
            const newSet = { ...set, components: componentsPayload };
            setSets(prev => [newSet, ...prev]);
            if (onSetCreated) onSetCreated(newSet);
            
            // Reset and close
            resetForm();
            setIsDialogOpen(false);

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };

    const resetForm = () => {
        setSetType('Single');
        setComponents([]);
        setMasterDesignNumber('');
        setSetPhoto('');
        setDesignName('');
    };

    return (
        <Card className="border-dashed border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Layers className="h-5 w-5"/> Design Combo Packs / Sets</CardTitle>
                    <p className="text-sm text-muted-foreground">Create design sets with multiple components</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-2">
                    <Plus className="h-4 w-4"/> Add Design Set
                </Button>
            </CardHeader>
            <CardContent>
                {sets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No design sets created yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sets.map((set) => (
                            <div key={set.id} className="flex gap-4 p-4 border rounded-lg bg-slate-50 items-start">
                                <div className="h-24 w-24 bg-white rounded border overflow-hidden flex-shrink-0">
                                    {set.set_photo_url ? (
                                        <img src={set.set_photo_url} alt="Set" className="h-full w-full object-cover"/>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-300"><ImageIcon/></div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-lg">{set.master_design_number}</h4>
                                            <p className="text-sm font-medium text-slate-600">{set.design_name || 'No Name'}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-white">{set.type}</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground pt-2">
                                        {set.components?.length || 0} Components • Created {new Date(set.created_at).toLocaleDateString()}
                                    </div>
                                    {/* Component Preview */}
                                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                        {set.components?.map((c, i) => (
                                            <Badge key={i} variant="secondary" className="text-[10px] whitespace-nowrap">
                                                {c.component_type}: {c.design_number}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Design Set</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Step 1: Type Selection */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Step 1: Select Set Type</Label>
                            <RadioGroup value={setType} onValueChange={setSetType} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['Single', '2-Pc Set', '3-Pc Set', 'Combo Set'].map(type => (
                                    <div key={type}>
                                        <RadioGroupItem value={type} id={type} className="peer sr-only" />
                                        <Label
                                            htmlFor={type}
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full"
                                        >
                                            <span className="font-semibold">{type}</span>
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        {/* Step 2: Components */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-base font-semibold">Step 2: Components</Label>
                                <Button size="sm" variant="outline" onClick={handleAddComponent}><Plus className="h-4 w-4 mr-2"/> Add Component</Button>
                            </div>
                            
                            <div className="space-y-4">
                                {components.map((comp, idx) => (
                                    <div key={comp.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-md bg-slate-50 relative">
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="absolute top-1 right-1 h-6 w-6 text-red-500 hover:text-red-700"
                                            onClick={() => removeComponent(idx)}
                                        >
                                            <Trash2 className="h-3 w-3"/>
                                        </Button>
                                        
                                        <div className="md:col-span-2 space-y-1">
                                            <Label className="text-xs">Type</Label>
                                            <Select value={comp.component_type} onValueChange={v => updateComponent(idx, 'component_type', v)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                                                <SelectContent>{COMPONENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>

                                        <div className="md:col-span-2 space-y-1">
                                            <Label className="text-xs text-red-600">Design No. *</Label>
                                            <Input 
                                                className="h-8 text-xs font-bold" 
                                                value={comp.design_number} 
                                                onChange={e => updateComponent(idx, 'design_number', e.target.value)}
                                                placeholder="e.g. 5001"
                                            />
                                        </div>

                                        <div className="md:col-span-3 space-y-1">
                                            <Label className="text-xs">Fabric Name</Label>
                                            <Select value={comp.fabric_id} onValueChange={v => updateComponent(idx, 'fabric_id', v)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Fabric"/></SelectTrigger>
                                                <SelectContent className="max-h-[200px]">
                                                    {fabrics.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="md:col-span-2 space-y-1">
                                            <Label className="text-xs">Image</Label>
                                            {comp.photo_url ? (
                                                <div className="relative h-8 w-8">
                                                    <img src={comp.photo_url} className="h-full w-full object-cover rounded"/>
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer" onClick={() => updateComponent(idx, 'photo_url', '')}>
                                                        <Trash2 className="h-3 w-3 text-white"/>
                                                    </div>
                                                </div>
                                            ) : (
                                                <ImageUpload 
                                                    maxFiles={1} 
                                                    bucketName="design-images"
                                                    onUploadComplete={(data) => updateComponent(idx, 'photo_url', data.public_url)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {components.length === 0 && <div className="text-center text-sm text-muted-foreground py-4 border-2 border-dashed rounded">Click 'Add Component' to begin.</div>}
                            </div>
                        </div>

                        {/* Step 3: Set Details */}
                        <div className="space-y-4 border-t pt-4">
                            <Label className="text-base font-semibold">Step 3: Set Details</Label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>Master Design Number (Auto)</Label>
                                        <Input value={masterDesignNumber} readOnly className="font-mono bg-slate-100 font-bold text-lg"/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Set Name (Optional)</Label>
                                        <Input value={designName} onChange={e => setDesignName(e.target.value)} placeholder="e.g. Summer Floral Collection"/>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>Set Photo {['2-Pc Set', '3-Pc Set', 'Combo Set'].includes(setType) && <span className="text-red-500">*</span>}</Label>
                                    {setPhoto ? (
                                        <div className="relative h-40 w-full bg-slate-50 border rounded flex items-center justify-center">
                                            <img src={setPhoto} className="h-full object-contain"/>
                                            <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setSetPhoto('')}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    ) : (
                                        <div className="h-40 border-2 border-dashed rounded flex flex-col items-center justify-center bg-slate-50">
                                            <ImageUpload maxFiles={1} bucketName="design-images" onUploadComplete={(data) => setSetPhoto(data.public_url)} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSet}>Save Design Set</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default DesignSetManager;