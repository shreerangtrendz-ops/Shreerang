import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const CostSheetForm = () => {
  const { toast } = useToast();
  const [sku, setSku] = useState('');
  const [designNo, setDesignNo] = useState('');
  const [path, setPath] = useState([]);
  
  const addStep = () => {
    setPath([...path, { process: '', input: 0, rate: 0, shortage: 0 }]);
  };

  const updateStep = (index, field, value) => {
    const newPath = [...path];
    newPath[index][field] = value;
    setPath(newPath);
  };

  const calculateRow = (step) => {
    const input = Number(step.input) || 0;
    const rate = Number(step.rate) || 0;
    const shortage = Number(step.shortage) || 0;
    const output = input * (1 - shortage / 100);
    const cost = input * rate; // Simple grey cost assumption
    return { output, cost };
  };

  const handleSave = async () => {
    try {
      await supabase.from('job_cards').insert([{ sku, design_number: designNo, process_path: path }]);
      toast({ title: 'Saved Successfully' });
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  let runningTotal = 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet><title>Cost Sheet / Job Card</title></Helmet>
      <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-xl">
        <h1 className="text-2xl font-bold">Cost Sheet & Job Card Builder</h1>
        <Button onClick={handleSave} className="bg-blue-600">Save to Database</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Step 1: Identity</CardTitle></CardHeader>
        <CardContent className="flex gap-4">
          <div className="space-y-2 flex-1"><Label>SKU</Label><Input value={sku} onChange={e=>setSku(e.target.value)} /></div>
          <div className="space-y-2 flex-1"><Label>Design No</Label><Input value={designNo} onChange={e=>setDesignNo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Step 2 & 3: Process Path Waterfall</span>
            <Button variant="outline" onClick={addStep}>Add Step</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Process</TableHead><TableHead>Input(mtr)</TableHead><TableHead>Rate(₹)</TableHead><TableHead>Shortage%</TableHead><TableHead>Output</TableHead><TableHead>Cost</TableHead><TableHead>Running</TableHead></TableRow></TableHeader>
            <TableBody>
              {path.map((step, i) => {
                const { output, cost } = calculateRow(step);
                runningTotal += cost;
                return (
                  <TableRow key={i}>
                    <TableCell><Input value={step.process} onChange={e=>updateStep(i, 'process', e.target.value)}/></TableCell>
                    <TableCell><Input type="number" value={step.input} onChange={e=>updateStep(i, 'input', e.target.value)}/></TableCell>
                    <TableCell><Input type="number" value={step.rate} onChange={e=>updateStep(i, 'rate', e.target.value)}/></TableCell>
                    <TableCell><Input type="number" value={step.shortage} onChange={e=>updateStep(i, 'shortage', e.target.value)}/></TableCell>
                    <TableCell>{output.toFixed(2)}</TableCell>
                    <TableCell>₹{cost.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">₹{runningTotal.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default CostSheetForm;