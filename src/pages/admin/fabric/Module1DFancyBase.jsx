import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FancyBaseFabricService } from '@/services/FancyBaseFabricService';
import { BaseFabricService } from '@/services/BaseFabricService';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Module1DFancyBase = () => {
  const [fabrics, setFabrics] = useState([]);
  const [baseFabrics, setBaseFabrics] = useState([]);
  const [form, setForm] = useState({ base_fabric_id: '', fabric_name: '', value_addition_type: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setFabrics(await FancyBaseFabricService.getAll());
      setBaseFabrics(await BaseFabricService.getAll());
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const base = baseFabrics.find(b => b.id === form.base_fabric_id);
      const sku = `${base?.sku}-FB-${form.value_addition_type.substring(0,3).toUpperCase()}`;
      await FancyBaseFabricService.create({ ...form, sku });
      toast({ title: 'Saved successfully' });
      loadData();
      setForm({ base_fabric_id: '', fabric_name: '', value_addition_type: '' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Create Fancy Base Fabric</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Fabric</Label>
              <Select value={form.base_fabric_id} onValueChange={(v) => setForm({...form, base_fabric_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select Base" /></SelectTrigger>
                <SelectContent>
                  {baseFabrics.map(b => <SelectItem key={b.id} value={b.id}>{b.fabric_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Fancy Base Name</Label><Input value={form.fabric_name} onChange={e=>setForm({...form, fabric_name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>VA Type</Label><Input value={form.value_addition_type} onChange={e=>setForm({...form, value_addition_type: e.target.value})} required /></div>
            <Button type="submit" className="col-span-2">Save Fancy Base</Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Fancy Base Fabrics</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>VA Type</TableHead><TableHead>SKU</TableHead></TableRow></TableHeader>
            <TableBody>
              {fabrics.map(f => (
                <TableRow key={f.id}>
                  <TableCell>{f.fabric_name}</TableCell>
                  <TableCell>{f.value_addition_type}</TableCell>
                  <TableCell>{f.sku}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default Module1DFancyBase;