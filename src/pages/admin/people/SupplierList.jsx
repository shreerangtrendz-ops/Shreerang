import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit2, Trash2, Truck } from 'lucide-react';

const SupplierList = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState(null);
    const [formData, setFormData] = useState({
        supplier_name: '', contact_person: '', phone: '', email: '',
        gst_number: '', city: '', status: 'active'
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
        setSuppliers(data || []);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData.supplier_name) return toast({ title: 'Name required', variant: 'destructive' });

        try {
            if (currentSupplier) {
                await supabase.from('suppliers').update(formData).eq('id', currentSupplier.id);
            } else {
                await supabase.from('suppliers').insert(formData);
            }
            toast({ title: 'Success', description: 'Supplier saved.' });
            setIsDialogOpen(false);
            fetchSuppliers();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this supplier?")) return;
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
        else fetchSuppliers();
    };

    const openDialog = (supplier = null) => {
        setCurrentSupplier(supplier);
        setFormData(supplier || {
            supplier_name: '', contact_person: '', phone: '', email: '',
            gst_number: '', city: '', status: 'active'
        });
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => openDialog()}><Plus className="mr-2 h-4 w-4"/> Add Supplier</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>GST / Location</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-slate-400"/> {s.supplier_name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            <div className="font-medium">{s.contact_person}</div>
                                            <div className="text-slate-500">{s.phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            <div>{s.gst_number || '-'}</div>
                                            <div className="text-slate-500">{s.city}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                                            {s.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => openDialog(s)}><Edit2 className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {suppliers.length === 0 && !loading && (
                                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No suppliers found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{currentSupplier ? 'Edit Supplier' : 'New Supplier'}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Supplier Name *</Label>
                            <Input value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>GST Number</Label><Input value={formData.gst_number} onChange={e => setFormData({...formData, gst_number: e.target.value})} /></div>
                            <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SupplierList;