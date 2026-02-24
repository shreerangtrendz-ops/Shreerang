import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Plus, Trash2, Edit2, Save, X, Image as ImageIcon } from 'lucide-react';
import ImageUpload from '@/components/common/ImageUpload';

const DesignManagementModal = ({ isOpen, onClose, finishFabricId, finishFabricName }) => {
    const { toast } = useToast();
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // New/Edit State
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        design_number: '',
        design_name: '',
        design_photo_url: '',
        status: 'active'
    });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (isOpen && finishFabricId) {
            fetchDesigns();
        } else {
            setDesigns([]);
            resetForm();
        }
    }, [isOpen, finishFabricId]);

    const fetchDesigns = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('finish_fabric_designs')
            .select('*')
            .eq('finish_fabric_id', finishFabricId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load designs.' });
        } else {
            setDesigns(data || []);
        }
        setLoading(false);
    };

    const resetForm = () => {
        setFormData({ design_number: '', design_name: '', design_photo_url: '', status: 'active' });
        setEditingId(null);
        setIsAdding(false);
    };

    const handleSave = async () => {
        if (!formData.design_number) return toast({ variant: 'destructive', title: 'Required', description: 'Design Number is required.' });

        // Check Uniqueness locally (rough check)
        const isDuplicate = designs.some(d => d.design_number === formData.design_number && d.id !== editingId);
        if (isDuplicate) return toast({ variant: 'destructive', title: 'Duplicate', description: 'Design Number already exists in this fabric.' });

        try {
            const payload = { ...formData, finish_fabric_id: finishFabricId };
            
            let error;
            if (editingId) {
                ({ error } = await supabase.from('finish_fabric_designs').update(payload).eq('id', editingId));
            } else {
                ({ error } = await supabase.from('finish_fabric_designs').insert(payload));
            }

            if (error) throw error;

            toast({ title: 'Success', description: editingId ? 'Design updated.' : 'Design added.' });
            fetchDesigns();
            resetForm();

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this design?')) return;
        
        try {
            const { error } = await supabase.from('finish_fabric_designs').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Deleted', description: 'Design removed successfully.' });
            setDesigns(designs.filter(d => d.id !== id));
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const startEdit = (design) => {
        setFormData(design);
        setEditingId(design.id);
        setIsAdding(true);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Designs for {finishFabricName}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto py-4 px-1">
                    {/* Add/Edit Form */}
                    {isAdding ? (
                        <div className="bg-slate-50 p-4 rounded-lg border mb-6 space-y-4">
                            <h3 className="font-semibold text-sm">{editingId ? 'Edit Design' : 'Add New Design'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Design Number <span className="text-red-500">*</span></Label>
                                    <Input 
                                        value={formData.design_number} 
                                        onChange={e => setFormData({...formData, design_number: e.target.value})} 
                                        placeholder="e.g. 5001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Design Name (Optional)</Label>
                                    <Input 
                                        value={formData.design_name} 
                                        onChange={e => setFormData({...formData, design_name: e.target.value})} 
                                        placeholder="e.g. Floral Red"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Design Photo</Label>
                                    <div className="flex gap-4 items-start">
                                        {formData.design_photo_url && (
                                            <img src={formData.design_photo_url} alt="Preview" className="h-20 w-20 object-cover rounded border bg-white" />
                                        )}
                                        <div className="flex-1">
                                            <ImageUpload 
                                                bucketName="design-images" 
                                                onUploadComplete={(data) => setFormData({...formData, design_photo_url: data.public_url})}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-8">
                                    <div className="flex items-center space-x-2">
                                        <Switch 
                                            checked={formData.status === 'active'} 
                                            onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'active' : 'inactive'})}
                                        />
                                        <Label>Status: {formData.status === 'active' ? 'Active (In Stock)' : 'Inactive (Out of Stock)'}</Label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
                                <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-2"/> Save Design</Button>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={() => setIsAdding(true)} className="mb-4 gap-2">
                            <Plus className="h-4 w-4" /> Add New Design
                        </Button>
                    )}

                    {/* Designs Table */}
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400"/></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Photo</TableHead>
                                    <TableHead>Design No</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {designs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No designs found.</TableCell>
                                    </TableRow>
                                ) : (
                                    designs.map((design) => (
                                        <TableRow key={design.id}>
                                            <TableCell>
                                                <div className="h-10 w-10 bg-slate-100 rounded overflow-hidden">
                                                    {design.design_photo_url ? (
                                                        <img src={design.design_photo_url} alt={design.design_number} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-300"/></div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{design.design_number}</TableCell>
                                            <TableCell>{design.design_name || '-'}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${design.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {design.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => startEdit(design)}><Edit2 className="h-4 w-4 text-blue-500"/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(design.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DesignManagementModal;