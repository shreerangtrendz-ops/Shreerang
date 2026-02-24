import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';

const PurchaseEntryForm = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0], supplier_name: '', fabric_type: '', sku: '',
    fabric_name: '', width: '', rate: '', discount_percent: '0', inward_quantity: '', payment_terms: 'Cash',
    design_number: '', bill_number: '', notes: ''
  });

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    const { data } = await supabase.from('purchase_entries').select('*').order('created_at', { ascending: false }).limit(10);
    if (data) setEntries(data);
  };

  const totalAmount = (Number(formData.rate) * Number(formData.inward_quantity) * (1 - Number(formData.discount_percent)/100)).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await supabase.from('purchase_entries').insert([{ ...formData, total_amount: totalAmount }]);
      toast({ title: 'Saved successfully' });
      loadEntries();
      setFormData({ ...formData, bill_number: '', inward_quantity: '', notes: '' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet><title>Purchase Entry Form</title></Helmet>
      <Card>
        <CardHeader><CardTitle>New Purchase Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={formData.entry_date} onChange={e => setFormData({...formData, entry_date: e.target.value})} required/></div>
            <div className="space-y-2"><Label>Supplier</Label><Input value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} required/></div>
            <div className="space-y-2"><Label>Fabric Type</Label><Input value={formData.fabric_type} onChange={e => setFormData({...formData, fabric_type: e.target.value})} /></div>
            <div className="space-y-2"><Label>SKU</Label><Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} required/></div>
            <div className="space-y-2"><Label>Rate (₹)</Label><Input type="number" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} required/></div>
            <div className="space-y-2"><Label>Quantity (mtr)</Label><Input type="number" value={formData.inward_quantity} onChange={e => setFormData({...formData, inward_quantity: e.target.value})} required/></div>
            <div className="space-y-2"><Label>Discount %</Label><Input type="number" value={formData.discount_percent} onChange={e => setFormData({...formData, discount_percent: e.target.value})} /></div>
            <div className="space-y-2"><Label>Total Amount</Label><Input value={`₹${totalAmount}`} readOnly className="font-bold bg-slate-100" /></div>
            <div className="space-y-2"><Label>Bill Number</Label><Input value={formData.bill_number} onChange={e => setFormData({...formData, bill_number: e.target.value})} required/></div>
            <div className="col-span-3">
               <Button type="submit" className="w-full">Save Purchase Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>SKU</TableHead><TableHead>Qty</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.entry_date}</TableCell><TableCell>{e.supplier_name}</TableCell><TableCell>{e.sku}</TableCell><TableCell>{e.inward_quantity}</TableCell><TableCell>₹{e.total_amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default PurchaseEntryForm;