import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { PurchaseEntryService } from '@/services/PurchaseEntryService';
import { SupplierService } from '@/services/SupplierService';
import { Loader2, Search } from 'lucide-react';

const PurchaseEntryPage = () => {
  const [entries, setEntries] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    fabric_type: '',
    sku: '',
    fabric_name: '',
    width: '',
    rate: '',
    discount_percent: '0',
    inward_quantity: '',
    total_amount: '0',
    payment_terms: '',
    design_number: '',
    bill_number: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesData, suppliersData] = await Promise.all([
        PurchaseEntryService.getAll(),
        SupplierService.getAll()
      ]);
      setEntries(entriesData || []);
      setSuppliers(suppliersData || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data' });
    }
  };

  useEffect(() => {
    const rate = parseFloat(form.rate) || 0;
    const qty = parseFloat(form.inward_quantity) || 0;
    const disc = parseFloat(form.discount_percent) || 0;
    const total = (rate * qty * (1 - (disc / 100))).toFixed(2);
    setForm(prev => ({ ...prev, total_amount: total }));
  }, [form.rate, form.inward_quantity, form.discount_percent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await PurchaseEntryService.create(form);
      toast({ title: 'Success', description: 'Purchase entry saved successfully' });
      loadData();
      setForm(prev => ({
        ...prev,
        sku: '', fabric_name: '', width: '', rate: '', inward_quantity: '', design_number: '', bill_number: ''
      }));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle>Purchase Fabric Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={form.supplier_name} onValueChange={v => setForm({...form, supplier_name: v})}>
                <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.supplier_name}>{s.supplier_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fabric Type</Label>
              <Select value={form.fabric_type} onValueChange={v => setForm({...form, fabric_type: v})}>
                <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Base Fabric">Base Fabric</SelectItem>
                  <SelectItem value="Finish Fabric">Finish Fabric</SelectItem>
                  <SelectItem value="Fancy Finish Fabric">Fancy Finish Fabric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="Enter SKU" required />
            </div>
            <div className="space-y-2">
              <Label>Fabric Name</Label>
              <Input value={form.fabric_name} onChange={e => setForm({...form, fabric_name: e.target.value})} placeholder="Auto-filled if linked" />
            </div>
            <div className="space-y-2">
              <Label>Width</Label>
              <Input value={form.width} onChange={e => setForm({...form, width: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Rate (INR/mtr)</Label>
              <Input type="number" step="0.01" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input type="number" step="0.01" value={form.discount_percent} onChange={e => setForm({...form, discount_percent: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Inward Quantity (mtr)</Label>
              <Input type="number" step="0.01" value={form.inward_quantity} onChange={e => setForm({...form, inward_quantity: e.target.value})} required />
            </div>

            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select value={form.payment_terms} onValueChange={v => setForm({...form, payment_terms: v})}>
                <SelectTrigger><SelectValue placeholder="Select Terms" /></SelectTrigger>
                <SelectContent>
                  {['Cash', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input value={form.total_amount} readOnly className="bg-slate-50 font-bold" />
            </div>
            <div className="space-y-2">
              <Label>Bill Number</Label>
              <Input value={form.bill_number} onChange={e => setForm({...form, bill_number: e.target.value})} />
            </div>
            
            <div className="md:col-span-3 space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Purchase Entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{e.entry_date}</TableCell>
                    <TableCell>{e.supplier_name}</TableCell>
                    <TableCell>{e.sku}</TableCell>
                    <TableCell>{e.inward_quantity}</TableCell>
                    <TableCell>₹{e.rate}</TableCell>
                    <TableCell>₹{e.total_amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseEntryPage;