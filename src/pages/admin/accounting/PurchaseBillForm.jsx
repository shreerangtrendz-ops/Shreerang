import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { DataLoadingService } from '@/services/DataLoadingService';

const PurchaseBillForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const [suppliers, setSuppliers] = useState([]);
    const [formData, setFormData] = useState({
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        supplier_name: '',
        fabric_type: 'Base Fabric',
        item_name: '',
        hsn_code: '',
        quantity: 0,
        rate: 0,
        brokerage_percent: 0,
        notes: '',
        status: 'Pending'
    });

    useEffect(() => {
        loadSuppliers();
        if (isEdit) fetchBill();
    }, []);

    const loadSuppliers = async () => {
        const data = await DataLoadingService.fetchSuppliers();
        setSuppliers(data || []);
    };

    const fetchBill = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('purchase_bills').select('*').eq('id', id).single();
        if (data) setFormData(data);
        setLoading(false);
    };

    const handleSupplierChange = (val) => {
        const supplier = suppliers.find(s => s.id === val);
        setFormData(prev => ({
            ...prev,
            supplier_id: val,
            supplier_name: supplier ? supplier.label : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.bill_number || !formData.supplier_id || !formData.item_name) {
            return toast({ variant: 'destructive', title: 'Required', description: 'Please fill all mandatory fields.' });
        }

        setLoading(true);
        try {
            const quantity = parseFloat(formData.quantity) || 0;
            const rate = parseFloat(formData.rate) || 0;
            const amount = quantity * rate;
            const brokerageAmount = amount * (parseFloat(formData.brokerage_percent || 0) / 100);
            
            const payload = {
                ...formData,
                quantity,
                rate,
                total_amount: amount + brokerageAmount, // Or subtract, depending on business logic. Usually brokerage is separate expense. Storing total bill value here.
                brokerage_amount: brokerageAmount
            };

            let error;
            if (isEdit) {
                ({ error } = await supabase.from('purchase_bills').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('purchase_bills').insert(payload));
            }

            if (error) throw error;
            toast({ title: 'Success', description: 'Bill saved successfully.' });
            navigate('/admin/accounting/purchase-bills');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <Helmet><title>{isEdit ? 'Edit Purchase Bill' : 'Add Purchase Bill'}</title></Helmet>
            <AdminPageHeader 
                title={isEdit ? 'Edit Purchase Bill' : 'Add Purchase Bill'} 
                breadcrumbs={[{label: 'Purchase Bills', href: '/admin/accounting/purchase-bills'}, {label: isEdit ? 'Edit' : 'New'}]}
                onBack={() => navigate('/admin/accounting/purchase-bills')}
            />

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader><CardTitle>Bill Details</CardTitle></CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Bill Number *</Label>
                                <Input value={formData.bill_number} onChange={e => setFormData({...formData, bill_number: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Bill Date *</Label>
                                <Input type="date" value={formData.bill_date} onChange={e => setFormData({...formData, bill_date: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Supplier *</Label>
                                <Select value={formData.supplier_id} onValueChange={handleSupplierChange}>
                                    <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Fabric Type *</Label>
                                <Select value={formData.fabric_type} onValueChange={v => setFormData({...formData, fabric_type: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['Base Fabric', 'Finish Fabric', 'Fancy Finish Fabric', 'Readymade', 'Others'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Item Name *</Label>
                            <Input value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} placeholder="e.g. 60x60 Cotton Grey" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>HSN Code</Label>
                                <Input value={formData.hsn_code} onChange={e => setFormData({...formData, hsn_code: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Rate</Label>
                                <Input type="number" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded border flex justify-between items-center">
                            <div className="space-y-1">
                                <Label>Brokerage (%)</Label>
                                <Input type="number" className="w-24 bg-white" value={formData.brokerage_percent} onChange={e => setFormData({...formData, brokerage_percent: e.target.value})} />
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Total Amount</div>
                                <div className="text-2xl font-bold text-green-600">
                                    ₹{((parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0))).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
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

export default PurchaseBillForm;