import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const QuotationForm = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const isEdit = !!id;
    const isConverting = searchParams.get('convert') === 'true';
    
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(isConverting);
    
    const [formData, setFormData] = useState({
        quotation_number: '',
        quotation_date: new Date().toISOString().split('T')[0],
        party_name: '',
        item_type: 'Purchase',
        item_name: '',
        design_number: '',
        quantity: 0,
        rate: 0,
        valid_until: '',
        notes: '',
        status: 'Active'
    });

    const [billData, setBillData] = useState({
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        if (isEdit) fetchQuotation();
    }, []);

    const fetchQuotation = async () => {
        setLoading(true);
        const { data } = await supabase.from('quotations').select('*').eq('id', id).single();
        if (data) setFormData(data);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const quantity = parseFloat(formData.quantity) || 0;
            const rate = parseFloat(formData.rate) || 0;
            
            const payload = { 
                ...formData, 
                quantity, 
                rate,
                amount: quantity * rate 
            };

            let error;
            if (isEdit) {
                ({ error } = await supabase.from('quotations').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('quotations').insert(payload));
            }

            if (error) throw error;
            toast({ title: 'Success', description: 'Quotation saved.' });
            navigate('/admin/accounting/quotations');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleConvert = async () => {
        setLoading(true);
        try {
            // 1. Create the bill based on type
            const billTable = formData.item_type === 'Purchase' ? 'purchase_bills' : 'job_work_bills';
            
            const billPayload = {
                bill_number: billData.bill_number,
                bill_date: billData.bill_date,
                quantity: formData.quantity,
                rate: formData.rate,
                amount: formData.quantity * formData.rate,
                status: 'Pending',
                notes: `Converted from Quotation #${formData.quotation_number}. ${billData.notes}`
            };

            if (formData.item_type === 'Purchase') {
                billPayload.supplier_name = formData.party_name;
                billPayload.item_name = formData.item_name;
                billPayload.fabric_type = 'Base Fabric'; // Default
                billPayload.hsn_code = '0000'; // Placeholder
            } else {
                billPayload.job_worker_name = formData.party_name;
                billPayload.design_number = formData.design_number || 'N/A';
                billPayload.process_type = formData.item_name;
            }

            const { error: billError } = await supabase.from(billTable).insert(billPayload);
            if (billError) throw billError;

            // 2. Update Quotation status
            await supabase.from('quotations').update({ status: 'Converted' }).eq('id', id);

            toast({ title: 'Success', description: 'Quotation converted to bill successfully.' });
            navigate('/admin/accounting/quotations');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
            setShowConvertModal(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <Helmet><title>{isEdit ? 'Edit Quotation' : 'New Quotation'}</title></Helmet>
            <AdminPageHeader 
                title={isEdit ? 'Edit Quotation' : 'Add Quotation'} 
                onBack={() => navigate('/admin/accounting/quotations')}
                actions={isEdit && formData.status !== 'Converted' && (
                    <Button onClick={() => setShowConvertModal(true)} variant="outline" className="gap-2 text-blue-600 border-blue-200 bg-blue-50">
                        <CheckCircle className="h-4 w-4" /> Convert to Bill
                    </Button>
                )}
            />

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader><CardTitle>Quotation Details</CardTitle></CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Quotation #</Label><Input value={formData.quotation_number} onChange={e => setFormData({...formData, quotation_number: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Date</Label><Input type="date" value={formData.quotation_date} onChange={e => setFormData({...formData, quotation_date: e.target.value})} required/></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Item Type</Label>
                                <Select value={formData.item_type} onValueChange={v => setFormData({...formData, item_type: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Purchase">Purchase (Material)</SelectItem>
                                        <SelectItem value="JobWork">Job Work (Service)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Supplier/Job Worker Name</Label><Input value={formData.party_name} onChange={e => setFormData({...formData, party_name: e.target.value})} required/></div>
                        </div>

                        <div className="space-y-2">
                            <Label>Item Name / Process</Label>
                            <Input value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} required placeholder="e.g. 60x60 Cotton or Digital Print" />
                        </div>

                        {formData.item_type === 'JobWork' && (
                            <div className="space-y-2">
                                <Label>Design Number (Optional)</Label>
                                <Input value={formData.design_number} onChange={e => setFormData({...formData, design_number: e.target.value})} />
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Rate</Label><Input type="number" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} required/></div>
                            <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={formData.valid_until} onChange={e => setFormData({...formData, valid_until: e.target.value})} /></div>
                        </div>
                        
                        <div className="space-y-2"><Label>Notes</Label><Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                    </CardContent>
                </Card>
                <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Save Quotation</Button>
                </div>
            </form>

            <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convert to {formData.item_type === 'Purchase' ? 'Purchase' : 'Job Work'} Bill</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-slate-50 rounded border text-sm">
                            <p><strong>Converting:</strong> {formData.item_name} ({formData.quantity} @ {formData.rate})</p>
                            <p><strong>Total Amount:</strong> ₹{(formData.quantity * formData.rate).toFixed(2)}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>New Bill Number *</Label>
                            <Input value={billData.bill_number} onChange={e => setBillData({...billData, bill_number: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Bill Date *</Label>
                            <Input type="date" value={billData.bill_date} onChange={e => setBillData({...billData, bill_date: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Conversion Notes</Label>
                            <Input value={billData.notes} onChange={e => setBillData({...billData, notes: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConvertModal(false)}>Cancel</Button>
                        <Button onClick={handleConvert} disabled={loading || !billData.bill_number}>Confirm Conversion</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default QuotationForm;