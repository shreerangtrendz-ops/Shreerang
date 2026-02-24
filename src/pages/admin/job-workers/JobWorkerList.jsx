import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit2, Trash2, Star, User } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useNavigate } from 'react-router-dom';

const JobWorkerList = () => {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const navigate = useNavigate();

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentWorker, setCurrentWorker] = useState(null);
    const [formData, setFormData] = useState({
        worker_name: '', worker_type: 'Tailor', contact_person: '', phone: '',
        stitching_labor_cost: '', embroidery_cost: '', quality_rating: '3'
    });

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        setLoading(true);
        const { data } = await supabase.from('job_workers').select('*').order('created_at', { ascending: false });
        setWorkers(data || []);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData.worker_name) return toast({ title: 'Name required', variant: 'destructive' });

        try {
            if (currentWorker) {
                await supabase.from('job_workers').update(formData).eq('id', currentWorker.id);
            } else {
                await supabase.from('job_workers').insert(formData);
            }
            toast({ title: 'Success', description: 'Worker saved.' });
            setIsDialogOpen(false);
            fetchWorkers();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this worker?")) return;
        await supabase.from('job_workers').delete().eq('id', id);
        fetchWorkers();
    };

    const openDialog = (worker = null) => {
        setCurrentWorker(worker);
        setFormData(worker || {
            worker_name: '', worker_type: 'Tailor', contact_person: '', phone: '',
            stitching_labor_cost: '', embroidery_cost: '', quality_rating: '3'
        });
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <Helmet><title>Job Worker Master</title></Helmet>
            <AdminPageHeader 
                title="Job Worker Master" 
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Job Workers'}]}
            />

            <div className="flex justify-end">
                <Button onClick={() => openDialog()}><Plus className="mr-2 h-4 w-4"/> Add Job Worker</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Base Stitch Rate</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workers.map(w => (
                                <TableRow key={w.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <User className="h-4 w-4 text-slate-400"/> {w.worker_name}
                                    </TableCell>
                                    <TableCell>{w.worker_type}</TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            <div>{w.contact_person}</div>
                                            <div className="text-slate-500">{w.phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>₹{w.stitching_labor_cost}</TableCell>
                                    <TableCell>
                                        <div className="flex text-yellow-500">
                                            {[...Array(Number(w.quality_rating || 0))].map((_, i) => <Star key={i} className="h-3 w-3 fill-current"/>)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => openDialog(w)}><Edit2 className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(w.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {workers.length === 0 && !loading && (
                                <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No workers found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{currentWorker ? 'Edit Worker' : 'New Job Worker'}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={formData.worker_name} onChange={e => setFormData({...formData, worker_name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={formData.worker_type} onValueChange={v => setFormData({...formData, worker_type: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {['Tailor', 'Unit', 'Embroiderer', 'Handworker'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Stitch Rate (₹)</Label><Input type="number" value={formData.stitching_labor_cost} onChange={e => setFormData({...formData, stitching_labor_cost: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Rating (1-5)</Label><Input type="number" max="5" value={formData.quality_rating} onChange={e => setFormData({...formData, quality_rating: e.target.value})} /></div>
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

export default JobWorkerList;