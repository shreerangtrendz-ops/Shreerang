import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ProcessEntryService } from '@/services/ProcessEntryService';
import { JobWorkUnitService } from '@/services/JobWorkUnitService';
import { Loader2 } from 'lucide-react';

const PROCESS_TYPES = ['RFD', 'Mill Print', 'Screen Print', 'Table Print', 'Block Print', 'ODP Print', 'Digital Print', 'Solid Dyed', 'Foil Gold Glitter'];

const ProcessEntryPage = () => {
  const [entries, setEntries] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    job_work_unit: '',
    process_type: '',
    fabric_type: '',
    sku: '',
    width: '',
    design_number: '',
    job_charge: '',
    shortage_percent: '0',
    input_quantity: '',
    costing_method: 'Grey Charge',
    output_quantity: '0',
    total_charge: '0'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesData, unitsData] = await Promise.all([
        ProcessEntryService.getAll(),
        JobWorkUnitService.getAll()
      ]);
      setEntries(entriesData || []);
      setUnits(unitsData || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data' });
    }
  };

  useEffect(() => {
    const input = parseFloat(form.input_quantity) || 0;
    const shortage = parseFloat(form.shortage_percent) || 0;
    const charge = parseFloat(form.job_charge) || 0;
    
    const output = input * (1 - (shortage / 100));
    const total = form.costing_method === 'Grey Charge' ? (input * charge) : (output * charge);
    
    setForm(prev => ({ 
      ...prev, 
      output_quantity: output.toFixed(2),
      total_charge: total.toFixed(2)
    }));
  }, [form.input_quantity, form.shortage_percent, form.job_charge, form.costing_method]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ProcessEntryService.create(form);
      toast({ title: 'Success', description: 'Process entry saved' });
      loadData();
      setForm(prev => ({...prev, sku: '', design_number: '', input_quantity: ''}));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle>Process Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Job Work Unit</Label>
              <Select value={form.job_work_unit} onValueChange={v => setForm({...form, job_work_unit: v})}>
                <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                <SelectContent>
                  {units.map(u => <SelectItem key={u.id} value={u.unit_name}>{u.unit_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Process Type</Label>
              <Select value={form.process_type} onValueChange={v => setForm({...form, process_type: v})}>
                <SelectTrigger><SelectValue placeholder="Select Process" /></SelectTrigger>
                <SelectContent>
                  {PROCESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fabric Type</Label>
              <Select value={form.fabric_type} onValueChange={v => setForm({...form, fabric_type: v})}>
                <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Finish Fabric">Finish Fabric</SelectItem>
                  <SelectItem value="Fancy Finish Fabric">Fancy Finish Fabric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Width</Label>
              <Input value={form.width} onChange={e => setForm({...form, width: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Job Charge (INR/mtr)</Label>
              <Input type="number" step="0.01" value={form.job_charge} onChange={e => setForm({...form, job_charge: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Shortage (%)</Label>
              <Input type="number" step="0.01" value={form.shortage_percent} onChange={e => setForm({...form, shortage_percent: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Input Quantity (mtr)</Label>
              <Input type="number" step="0.01" value={form.input_quantity} onChange={e => setForm({...form, input_quantity: e.target.value})} required />
            </div>

            <div className="space-y-2">
              <Label>Costing Method</Label>
              <Select value={form.costing_method} onValueChange={v => setForm({...form, costing_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grey Charge">Grey Charge (On Input)</SelectItem>
                  <SelectItem value="Finish Charge">Finish Charge (On Output)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Output Quantity</Label>
              <Input value={form.output_quantity} readOnly className="bg-slate-50 font-bold" />
            </div>
            <div className="space-y-2">
              <Label>Total Charge</Label>
              <Input value={form.total_charge} readOnly className="bg-slate-50 font-bold" />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Unit</TableHead><TableHead>Process</TableHead><TableHead>SKU</TableHead><TableHead>Total Charge</TableHead></TableRow></TableHeader>
            <TableBody>
              {entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.entry_date}</TableCell>
                  <TableCell>{e.job_work_unit}</TableCell>
                  <TableCell>{e.process_type}</TableCell>
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

export default ProcessEntryPage;