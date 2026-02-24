import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FinishFabricService } from '@/services/FinishFabricService';
import { BaseFabricService } from '@/services/BaseFabricService';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Module1BFinish = () => {
  const [fabrics, setFabrics] = useState([]);
  const [baseFabrics, setBaseFabrics] = useState([]);
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ base_fabric_id: searchParams.get('baseId') || '', fabric_name: '', process: '' });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setFabrics(await FinishFabricService.getAll());
      setBaseFabrics(await BaseFabricService.getAll());
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const base = baseFabrics.find(b => b.id === form.base_fabric_id);
      const sku = `${base?.sku}-FIN-${form.process}`;
      await FinishFabricService.create({ ...form, sku });
      toast({ title: 'Saved successfully' });
      loadData();
      setForm({ base_fabric_id: '', fabric_name: '', process: '' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Create Finish Fabric</CardTitle></CardHeader>
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
            <div className="space-y-2"><Label>Finish Name</Label><Input value={form.fabric_name} onChange={e=>setForm({...form, fabric_name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Process</Label><Input value={form.process} onChange={e=>setForm({...form, process: e.target.value})} required /></div>
            <Button type="submit" className="col-span-2">Save Finish Fabric</Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Finish Fabrics</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Base</TableHead><TableHead>SKU</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {fabrics.map(f => (
                <TableRow key={f.id}>
                  <TableCell>{f.fabric_name}</TableCell>
                  <TableCell>{f.base_fabrics?.fabric_name}</TableCell>
                  <TableCell>{f.sku}</TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => navigate(`/admin/fabric-master/fancy-finish?finishId=${f.id}`)}>Create Fancy</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default Module1BFinish;