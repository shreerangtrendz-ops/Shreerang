import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';

const ValueAdditionEntryForm = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0], job_work_unit: '', va_type: '', fabric_type: '', sku: '',
    width: '', design_number: '', job_charge: '', shortage_percent: '', input_quantity: '', thread_type: '', dyeing_type: ''
  });

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    const { data } = await supabase.from('value_addition_entries').select('*').order('created_at', { ascending: false }).limit(10);
    if (data) setEntries(data);
  };

  const outputQty = (Number(formData.input_quantity) * (1 - Number(formData.shortage_percent)/100)).toFixed(2);
  const totalCharge = (Number(formData.input_quantity) * Number(formData.job_charge)).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await supabase.from('value_addition_entries').insert([{ ...formData, output_quantity: outputQty, total_charge: totalCharge }]);
      toast({ title: 'Saved successfully' });
      loadEntries();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet><title>VA Entry Form</title></Helmet>
      <Card>
        <CardHeader><CardTitle>New Value Addition Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={formData.entry_date} onChange={e => setFormData({...formData, entry_date: e.target.value})} required/></div>
            <div className="space-y-2"><Label>Job Unit</Label><Input value={formData.job_work_unit} onChange={e => setFormData({...formData, job_work_unit: e.target.value})} required/></div>
            <div className="space-y-2"><Label>VA Type</Label><Input value={formData.va_type} onChange={e => setFormData({...formData, va_type: e.target.value})} required placeholder="Hakoba, Handwork..."/></div>
            
            <div className="space-y-2"><Label>SKU</Label><Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} required/></div>
            <div className="space-y-2"><Label>Input Qty (mtr)</Label><Input type="number" value={formData.input_quantity} onChange={e => setFormData({...formData, input_quantity: e.target.value})} required/></div>
            <div className="space-y-2"><Label>Rate (₹)</Label><Input type="number" value={formData.job_charge} onChange={e => setFormData({...formData, job_charge: e.target.value})} required/></div>
            
            <div className="space-y-2"><Label>Shortage %</Label><Input type="number" value={formData.shortage_percent} onChange={e => setFormData({...formData, shortage_percent: e.target.value})} required/></div>
            <div className="space-y-2"><Label>Thread Type</Label><Input value={formData.thread_type} onChange={e => setFormData({...formData, thread_type: e.target.value})} /></div>
            <div className="space-y-2"><Label>Output Qty / Total</Label><Input value={`${outputQty} mtr | ₹${totalCharge}`} readOnly className="font-bold bg-slate-100" /></div>
            <div className="col-span-3">
               <Button type="submit" className="w-full">Save VA Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default ValueAdditionEntryForm;