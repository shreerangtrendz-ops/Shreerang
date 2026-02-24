import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { DataLoadingService } from '@/services/DataLoadingService';

const JobWorkBillForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const [workers, setWorkers] = useState([]);
    const [formData, setFormData] = useState({
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        job_worker_id: '',
        job_worker_name: '',
        design_number: '',
        process_type: '',
        quantity: 0,
        rate: 0,
        notes: '',
        status: 'Pending'
    });

    useEffect(() => {
        loadWorkers();
        if (isEdit) fetchBill();
    }, []);

    const loadWorkers = async () => {
        const data = await DataLoadingService.fetchJobWorkers();
        setWorkers(data || []);
    };

    const fetchBill = async () => {
        setLoading(true);
        const { data } = await supabase.from('job_work_bills').select('*').eq('id', id).single();
        if (data) setFormData(data);
        setLoading(false);
    };

    const handleWorkerChange = (val) => {
        const worker = workers.find(w => w.id === val);
        setFormData(prev => ({
            ...prev,
            job_worker_id: val,
            job_worker_name: worker ? worker.label : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const quantity = parseFloat(formData.quantity) || 0;
            const rate = parseFloat(formData.rate) || 0;
            
            const payload = { ...formData, quantity, rate };

            let error;
            if (isEdit) {
                ({ error } = await supabase.from('job_work_bills').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('job_work_bills').insert(payload));
            }

            if (error) throw error;
            toast({ title: 'Success', description: 'Bill saved.' });
            navigate('/admin/accounting/job-work-bills');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <Helmet><title>{isEdit ? 'Edit Job Bill' : 'New Job Bill'}</title></Helmet>
            <AdminPageHeader 
                title={isEdit ? 'Edit Job Work Bill' : 'Add Job Work Bill'} 
                breadcrumbs={[{label: 'Job Bills', href: '/admin/accounting/job-work-bills'}, {label: isEdit ? 'Edit' : 'New'}]}
                onBack={() => navigate('/admin/accounting/job-work-bills')}
            />

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader><CardTitle>Bill Details</CardTitle></CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Bill # *</Label><Input value={formData.bill_number} onChange={e => setFormData({...formData, bill_number: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={formData.bill_date} onChange={e => setFormData({...formData, bill_date: e.target.value})} required/></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Job Worker *</Label>
                                <Select value={formData.job_worker_id} onValueChange={handleWorkerChange} required>
                                    <SelectTrigger><SelectValue placeholder="Select Worker" /></SelectTrigger>
                                    <SelectContent>{workers.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Design #</Label><Input value={formData.design_number} onChange={e => setFormData({...formData, design_number: e.target.value})} /></div>
                        </div>

                        <div className="space-y-2">
                            <Label>Process / Value Addition</Label>
                            <Input value={formData.process_type} onChange={e => setFormData({...formData, process_type: e.target.value})} placeholder="e.g. Embroidery, Dying" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Rate</Label><Input type="number" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} required/></div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Bill
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default JobWorkBillForm;