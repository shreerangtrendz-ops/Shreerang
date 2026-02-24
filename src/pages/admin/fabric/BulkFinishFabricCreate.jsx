import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, ArrowLeft, Save, Copy } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import FabricSelect from '@/components/admin/fabric/FabricSelect';

const PROCESS_TYPES = [
    'Dyeing', 'Printing', 'Embroidery', 'Foil', 'Pleating', 'Crushing', 'Digital Print'
];

const BulkFinishFabricCreate = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    
    const [loading, setLoading] = useState(false);
    const [baseFabrics, setBaseFabrics] = useState([]);
    const [selectedBaseId, setSelectedBaseId] = useState('');
    const [selectedBaseDetails, setSelectedBaseDetails] = useState(null);
    
    // Bulk Items State
    const [items, setItems] = useState([
        { id: 1, process_type: 'Dyeing', color: '', suffix: '', hsn_code: '' }
    ]);

    useEffect(() => {
        fetchBaseFabrics();
    }, []);

    useEffect(() => {
        if (selectedBaseId) {
            const fabric = baseFabrics.find(f => f.id === selectedBaseId);
            if (fabric) {
                setSelectedBaseDetails(fabric);
                // Auto-fill HSN for existing items if they are empty
                setItems(prev => prev.map(item => ({
                    ...item,
                    hsn_code: item.hsn_code || fabric.hsn_code
                })));
            }
        }
    }, [selectedBaseId, baseFabrics]);

    const fetchBaseFabrics = async () => {
        const { data } = await supabase.from('base_fabrics').select('*').eq('status', 'active');
        setBaseFabrics(data || []);
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev, 
            { 
                id: Date.now(), 
                process_type: prev[prev.length-1]?.process_type || 'Dyeing', 
                color: '', 
                suffix: '', 
                hsn_code: selectedBaseDetails?.hsn_code || '' 
            }
        ]);
    };

    const handleRemoveItem = (id) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleSubmit = async () => {
        if (!selectedBaseId) return toast({ variant: 'destructive', title: 'Error', description: 'Please select a base fabric' });
        
        // Validation
        const invalidItems = items.filter(i => !i.process_type || !i.suffix);
        if (invalidItems.length > 0) return toast({ variant: 'destructive', title: 'Validation Error', description: 'All items must have a Process Type and Suffix/Name.' });

        setLoading(true);
        try {
            const payload = items.map(item => ({
                base_fabric_id: selectedBaseId,
                finish_fabric_name: `${selectedBaseDetails.base_fabric_name} ${item.suffix}`,
                process_type: item.process_type,
                process: item.process_type,
                description: `${item.process_type} finish on ${selectedBaseDetails.base_fabric_name}. Color: ${item.color || 'Standard'}`,
                hsn_code: item.hsn_code,
                status: 'active',
                ready_stock: true,
                fabric_name_suffix: item.suffix,
                // Inherit from base
                gst_rate: selectedBaseDetails.gst_rate
            }));

            const { error } = await supabase.from('finish_fabrics').insert(payload);
            if (error) throw error;

            toast({ title: 'Success', description: `Created ${items.length} finish fabrics.` });
            navigate('/admin/fabric-master/finish');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create fabrics.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            <Helmet><title>Bulk Create Finish Fabrics</title></Helmet>
            
            <AdminPageHeader 
                title="Bulk Finish Fabric Creation" 
                breadcrumbs={[
                    {label: 'Fabric Master', href: '/admin/fabric-master'}, 
                    {label: 'Finish Fabrics', href: '/admin/fabric-master/finish'},
                    {label: 'Bulk Create'}
                ]}
                onBack={() => navigate('/admin/fabric-master/finish')}
            />

            <Card>
                <CardHeader>
                    <CardTitle>1. Select Base Fabric</CardTitle>
                    <CardDescription>All created items will inherit properties from this base fabric.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md">
                        <Label>Base Fabric (Griege)</Label>
                        <Select value={selectedBaseId} onValueChange={setSelectedBaseId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select Base Fabric" />
                            </SelectTrigger>
                            <SelectContent>
                                {baseFabrics.map(f => (
                                    <SelectItem key={f.id} value={f.id}>{f.base_fabric_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedBaseDetails && (
                            <div className="mt-2 text-sm text-muted-foreground bg-slate-50 p-2 rounded">
                                <span className="font-semibold">Details:</span> HSN: {selectedBaseDetails.hsn_code} | GSM: {selectedBaseDetails.gsm} | Width: {selectedBaseDetails.width}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedBaseId && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>2. Add Variants</CardTitle>
                            <CardDescription>Define the finish variations you want to create.</CardDescription>
                        </div>
                        <Button onClick={handleAddItem} variant="outline" size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Add Row
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Process Type</TableHead>
                                    <TableHead>Suffix / Variant Name</TableHead>
                                    <TableHead>Color / Tone</TableHead>
                                    <TableHead className="w-[120px]">HSN Code</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Select value={item.process_type} onValueChange={(v) => handleItemChange(item.id, 'process_type', v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Process" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {PROCESS_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                value={item.suffix} 
                                                onChange={(e) => handleItemChange(item.id, 'suffix', e.target.value)} 
                                                placeholder="e.g. Dark Red, Soft Finish"
                                            />
                                            {selectedBaseDetails && item.suffix && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Preview: {selectedBaseDetails.base_fabric_name} {item.suffix}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                value={item.color} 
                                                onChange={(e) => handleItemChange(item.id, 'color', e.target.value)} 
                                                placeholder="Optional color info"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                value={item.hsn_code} 
                                                onChange={(e) => handleItemChange(item.id, 'hsn_code', e.target.value)} 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} disabled={items.length === 1}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end gap-4 lg:pl-64 z-40 shadow-lg">
                <Button variant="outline" onClick={() => navigate('/admin/fabric-master/finish')}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading || !selectedBaseId}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Create {items.length} Variants
                </Button>
            </div>
        </div>
    );
};

export default BulkFinishFabricCreate;