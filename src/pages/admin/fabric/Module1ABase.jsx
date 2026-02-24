import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BaseFabricService } from '@/services/BaseFabricService';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const Module1ABase = () => {
  const [fabrics, setFabrics] = useState([]);
  const [form, setForm] = useState({ fabric_name: '', short_code: '', process: '', base_width: '' });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadFabrics();
  }, []);

  const loadFabrics = async () => {
    try {
      const data = await BaseFabricService.getAll();
      setFabrics(data);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const processCode = form.process.substring(0,3).toUpperCase();
      const sku = `${form.base_width}-${form.short_code}-${processCode}`;
      const fullName = `${form.base_width} ${form.fabric_name} ${form.process}`;
      
      await BaseFabricService.create({ ...form, fabric_name: fullName, sku });
      toast({ title: 'Saved successfully' });
      loadFabrics();
      setForm({ fabric_name: '', short_code: '', process: '', base_width: '' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Create Base Fabric</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Fabric Name</Label><Input value={form.fabric_name} onChange={e=>setForm({...form, fabric_name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Short Code (max 6)</Label><Input maxLength={6} value={form.short_code} onChange={e=>setForm({...form, short_code: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Process</Label><Input value={form.process} onChange={e=>setForm({...form, process: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Base Width</Label><Input value={form.base_width} onChange={e=>setForm({...form, base_width: e.target.value})} required /></div>
            <Button type="submit" className="col-span-2">Save Base Fabric</Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Base Fabrics</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>SKU</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {fabrics.map(f => (
                <TableRow key={f.id}>
                  <TableCell>{f.fabric_name}</TableCell>
                  <TableCell>{f.sku}</TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => navigate(`/admin/fabric-master/finish?baseId=${f.id}`)}>Create Finish Fabric</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default Module1ABase;