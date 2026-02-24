import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ValueAdditionService } from '@/services/ValueAdditionService';
import { Loader2 } from 'lucide-react';

const VA_TYPES = ['Hakoba', 'Embroidered', 'Handwork', 'Foil', 'Gold', 'Glitter', 'Crush', 'Pleated', 'Deca', 'Washing'];

const ValueAdditionEntryPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    job_work_unit: '',
    va_type: '',
    fabric_type: '',
    sku: '',
    width: '',
    design_number: '',
    job_charge: '',
    shortage_percent: '0',
    input_quantity: '',
    thread_type: '',
    dyeing_type: '',
    output_quantity: '0',
    total_charge: '0'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setEntries(await ValueAdditionService.getAll() || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error' });
    }
  };

  useEffect(() => {
    const input = parseFloat(form.input_quantity) || 0;
    const shortage = parseFloat(form.shortage_percent) || 0;
    const charge = parseFloat(form.job_charge) || 0;
    
    const output = input * (1 - (shortage / 100));
    setForm(prev => ({ 
      ...prev, 
      output_quantity: output.toFixed(2),
      total_charge: (input * charge).toFixed(2) // Standard assuming on input
    }));
  }, [form.input_quantity, form.shortage_percent, form.job_charge]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ValueAdditionService.create(form);
      toast({ title: 'Success', description: 'Entry saved' });
      loadData();
      setForm(prev => ({...prev, sku: '', design_number: '', input_quantity: ''}));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const showThread = ['Hakoba', 'Embroidered'].includes(form.va_type);
  const showDyeing = form.va_type === 'Hakoba';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle>Value Addition Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Job Work Unit</Label>
              <Input value={form.job_work_unit} onChange={e => setForm({...form, job_work_unit: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>VA Type</Label>
              <Select value={form.va_type} onValueChange={v => setForm({...form, va_type: v})}>
                <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  {VA_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Job Charge</Label>
              <Input type="number" step="0.01" value={form.job_charge} onChange={e => setForm({...form, job_charge: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Shortage (%)</Label>
              <Input type="number" step="0.01" value={form.shortage_percent} onChange={e => setForm({...form, shortage_percent: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Input Quantity</Label>
              <Input type="number" step="0.01" value={form.input_quantity} onChange={e => setForm({...form, input_quantity: e.target.value})} required />
            </div>

            {showThread && (
              <div className="space-y-2">
                <Label>Thread Type</Label>
                <Input value={form.thread_type} onChange={e => setForm({...form, thread_type: e.target.value})} />
              </div>
            )}
            
            {showDyeing && (
              <div className="space-y-2">
                <Label>Dyeing Type</Label>
                <Input value={form.dyeing_type} onChange={e => setForm({...form, dyeing_type: e.target.value})} />
              </div>
            )}

            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={loading}>Save Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>VA Type</TableHead><TableHead>SKU</TableHead><TableHead>Total Charge</TableHead></TableRow></TableHeader>
            <TableBody>
              {entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.entry_date}</TableCell>
                  <TableCell>{e.va_type}</TableCell>
                  <TableCell>{e.sku}</TableCell>
                  <TableCell>₹{e.total_charge}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValueAdditionEntryPage;