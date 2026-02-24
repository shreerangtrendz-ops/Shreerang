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

const PendingOrderForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        order_number: '',
        order_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        item_name: '',
        design_number: '',
        order_quantity: 0,
        rate: 0,
        dispatched_quantity: 0,
        notes: '',
        status: 'Pending'
    });

    useEffect(() => {
        if (isEdit) fetchOrder();
    }, []);

    const fetchOrder = async () => {
        setLoading(true);
        const { data } = await supabase.from('pending_orders').select('*').eq('id', id).single();
        if (data) setFormData(data);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const orderQty = parseFloat(formData.order_quantity) || 0;
            const dispQty = parseFloat(formData.dispatched_quantity) || 0;
            const rate = parseFloat(formData.rate) || 0;

            if (dispQty > orderQty) throw new Error("Dispatched quantity cannot exceed order quantity");

            const balance = orderQty - dispQty;
            const status = balance <= 0 ? 'Completed' : (dispQty > 0 ? 'Partial' : 'Pending');
            
            const payload = { 
                ...formData, 
                order_quantity: orderQty,
                dispatched_quantity: dispQty,
                rate,
                status
            };

            let error;
            if (isEdit) {
                ({ error } = await supabase.from('pending_orders').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('pending_orders').insert(payload));
            }

            if (error) throw error;
            toast({ title: 'Success', description: 'Order saved.' });
            navigate('/admin/accounting/pending-orders');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <Helmet><title>{isEdit ? 'Edit Pending Order' : 'New Pending Order'}</title></Helmet>
            <AdminPageHeader 
                title={isEdit ? 'Edit Pending Order' : 'Add Pending Order'} 
                onBack={() => navigate('/admin/accounting/pending-orders')} 
            />

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Order # *</Label><Input value={formData.order_number} onChange={e => setFormData({...formData, order_number: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={formData.order_date} onChange={e => setFormData({...formData, order_date: e.target.value})} required/></div>
                        </div>
                        <div className="space-y-2"><Label>Customer Name *</Label><Input value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} required/></div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Item Name *</Label><Input value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Design Number *</Label><Input value={formData.design_number} onChange={e => setFormData({...formData, design_number: e.target.value})} required/></div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>Order Qty</Label><Input type="number" value={formData.order_quantity} onChange={e => setFormData({...formData, order_quantity: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Rate</Label><Input type="number" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Dispatched Qty</Label><Input type="number" value={formData.dispatched_quantity} onChange={e => setFormData({...formData, dispatched_quantity: e.target.value})} /></div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded flex justify-between font-medium">
                            <span>Balance Quantity</span>
                            <span className="text-orange-600">{(formData.order_quantity - formData.dispatched_quantity).toFixed(2)}</span>
                        </div>

                        <div className="space-y-2"><Label>Notes</Label><Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                    </CardContent>
                </Card>
                <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Save Order</Button>
                </div>
            </form>
        </div>
    );
};

export default PendingOrderForm;