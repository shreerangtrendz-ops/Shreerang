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

const CommissionBrokerageForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        type: 'Commission',
        agent_name: '',
        bill_number: '',
        bill_amount: 0,
        percentage: 0,
        amount: 0,
        entry_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        if (isEdit) fetchEntry();
    }, []);

    const fetchEntry = async () => {
        setLoading(true);
        const { data } = await supabase.from('brokerage_entries').select('*').eq('id', id).single();
        if (data) setFormData(data);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const billAmt = parseFloat(formData.bill_amount) || 0;
            const pct = parseFloat(formData.percentage) || 0;
            const amount = billAmt * (pct / 100);
            
            const payload = { ...formData, amount };

            let error;
            if (isEdit) {
                ({ error } = await supabase.from('brokerage_entries').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('brokerage_entries').insert(payload));
            }

            if (error) throw error;
            toast({ title: 'Success', description: 'Entry saved.' });
            navigate('/admin/accounting/commission');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <Helmet><title>{isEdit ? 'Edit Entry' : 'New Entry'}</title></Helmet>
            <AdminPageHeader title={isEdit ? 'Edit Entry' : 'Add Entry'} onBack={() => navigate('/admin/accounting/commission')} />

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Commission">Commission (Sales)</SelectItem>
                                        <SelectItem value="Brokerage">Brokerage (Purchase)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Date</Label><Input type="date" value={formData.entry_date} onChange={e => setFormData({...formData, entry_date: e.target.value})} required/></div>
                        </div>

                        <div className="space-y-2"><Label>Agent / Broker Name</Label><Input value={formData.agent_name} onChange={e => setFormData({...formData, agent_name: e.target.value})} required/></div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>Bill #</Label><Input value={formData.bill_number} onChange={e => setFormData({...formData, bill_number: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Bill Amount</Label><Input type="number" value={formData.bill_amount} onChange={e => setFormData({...formData, bill_amount: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Percentage %</Label><Input type="number" value={formData.percentage} onChange={e => setFormData({...formData, percentage: e.target.value})} required/></div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded flex justify-between font-medium">
                            <span>Calculated Amount</span>
                            <span>₹{((formData.bill_amount * formData.percentage) / 100).toFixed(2)}</span>
                        </div>

                        <div className="space-y-2"><Label>Notes</Label><Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                    </CardContent>
                </Card>
                <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Save</Button>
                </div>
            </form>
        </div>
    );
};

export default CommissionBrokerageForm;