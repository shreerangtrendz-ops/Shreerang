import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const SalesBillForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        item_name: '',
        quantity: 0,
        rate: 0,
        commission_percent: 0,
        notes: '',
        status: 'Pending'
    });

    useEffect(() => {
        if (isEdit) fetchBill();
    }, []);

    const fetchBill = async () => {
        setLoading(true);
        const { data } = await supabase.from('sales_bills').select('*').eq('id', id).single();
        if (data) setFormData(data);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const quantity = parseFloat(formData.quantity) || 0;
            const rate = parseFloat(formData.rate) || 0;
            const amount = quantity * rate;
            const commissionAmount = amount * (parseFloat(formData.commission_percent || 0) / 100);
            
            const payload = { 
                ...formData, 
                quantity, 
                rate, 
                amount,
                commission_amount: commissionAmount,
                total_amount: amount - commissionAmount // Commission usually deducted or added based on logic, assuming deduction here
            };

            let error;
            if (isEdit) {
                ({ error } = await supabase.from('sales_bills').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('sales_bills').insert(payload));
            }

            if (error) throw error;
            toast({ title: 'Success', description: 'Bill saved.' });
            navigate('/admin/accounting/sales-bills');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <Helmet><title>{isEdit ? 'Edit Sales Bill' : 'New Sales Bill'}</title></Helmet>
            <AdminPageHeader 
                title={isEdit ? 'Edit Sales Bill' : 'Add Sales Bill'} 
                onBack={() => navigate('/admin/accounting/sales-bills')} 
            />

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader><CardTitle>Bill Details</CardTitle></CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Bill Number *</Label><Input value={formData.bill_number} onChange={e => setFormData({...formData, bill_number: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={formData.bill_date} onChange={e => setFormData({...formData, bill_date: e.target.value})} required/></div>
                        </div>
                        <div className="space-y-2"><Label>Customer Name *</Label><Input value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} required/></div>
                        <div className="space-y-2"><Label>Item Name *</Label><Input value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} required/></div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Rate</Label><Input type="number" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Comm. %</Label><Input type="number" value={formData.commission_percent} onChange={e => setFormData({...formData, commission_percent: e.target.value})} /></div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded flex justify-between font-medium">
                            <span>Total Amount</span>
                            <span>₹{((formData.quantity * formData.rate) * (1 - (formData.commission_percent/100))).toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
                <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Save Bill</Button>
                </div>
            </form>
        </div>
    );
};

export default SalesBillForm;