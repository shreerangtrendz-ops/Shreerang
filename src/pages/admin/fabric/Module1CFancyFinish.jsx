import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FancyFinishFabricService } from '@/services/FancyFinishFabricService';
import { FinishFabricService } from '@/services/FinishFabricService';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Module1CFancyFinish = () => {
  const [fabrics, setFabrics] = useState([]);
  const [finishFabrics, setFinishFabrics] = useState([]);
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ finish_fabric_id: searchParams.get('finishId') || '', fabric_name: '', value_addition_type: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setFabrics(await FancyFinishFabricService.getAll());
      setFinishFabrics(await FinishFabricService.getAll());
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const finish = finishFabrics.find(b => b.id === form.finish_fabric_id);
      const sku = `${finish?.sku}-FF-${form.value_addition_type.substring(0,3).toUpperCase()}`;
      await FancyFinishFabricService.create({ ...form, sku });
      toast({ title: 'Saved successfully' });
      loadData();
      setForm({ finish_fabric_id: '', fabric_name: '', value_addition_type: '' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Create Fancy Finish Fabric</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Finish Fabric</Label>
              <Select value={form.finish_fabric_id} onValueChange={(v) => setForm({...form, finish_fabric_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select Finish" /></SelectTrigger>
                <SelectContent>
                  {finishFabrics.map(b => <SelectItem key={b.id} value={b.id}>{b.fabric_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Fancy Name</Label><Input value={form.fabric_name} onChange={e=>setForm({...form, fabric_name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>VA Type</Label><Input value={form.value_addition_type} onChange={e=>setForm({...form, value_addition_type: e.target.value})} required /></div>
            <Button type="submit" className="col-span-2">Save Fancy Finish</Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Fancy Finish Fabrics</CardTitle></CardHeader>
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
export default Module1CFancyFinish;