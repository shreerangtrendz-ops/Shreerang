import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { GarmentCostService } from '@/services/GarmentCostService';

const ReadymadeGarmentCostSheet = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    product_name: '', category: '', gross_cost: 0, profit: 20
  });

  const handleSave = async () => {
    try {
      await GarmentCostService.create(form);
      toast({ title: 'Success', description: 'Garment Cost Sheet saved' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save' });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Readymade Garment Cost Sheet</h1>
      
      <Card>
        <CardHeader><CardTitle>STEP 1: Product Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Product Name</Label><Input value={form.product_name} onChange={e=>setForm({...form, product_name: e.target.value})}/></div>
          <div className="space-y-2"><Label>Garment Category</Label><Input value={form.category} onChange={e=>setForm({...form, category: e.target.value})}/></div>
          <div className="space-y-2"><Label>SKU (Auto)</Label><Input readOnly placeholder="Auto-generated"/></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>STEP 2: Fabric & Component Costs</CardTitle></CardHeader>
        <CardContent>
          <div className="p-4 border rounded bg-slate-50 text-center text-sm text-slate-500">
            [Fabric Costing Table goes here]
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline">Print A4</Button>
        <Button onClick={handleSave}>Save Garment Cost</Button>
      </div>
    </div>
  );
};

export default ReadymadeGarmentCostSheet;