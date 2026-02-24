import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Calculator, Save } from 'lucide-react';

const DYEING_RATES = { 'Mono Light': 10, 'Mono Dark': 12, 'Contrast': 18, 'RFD': 5 };

const HakobaBatchCalculator = () => {
  const { toast } = useToast();
  const [inputs, setInputs] = useState({
    greyCutSize: 21.25, greyRate: 0, commPercent: 1.5, schiffliQty: 20.25, schiffliRate: 50,
    dyeingType: 'Mono Light', dyeingRate: 10, finalFinishAvg: 18, takasCount: 41, cottonThread: false, profitMargin: 15, dharaPercent: 7
  });

  const [res, setRes] = useState({});

  useEffect(() => {
    if (DYEING_RATES[inputs.dyeingType]) setInputs(p => ({ ...p, dyeingRate: DYEING_RATES[inputs.dyeingType] }));
  }, [inputs.dyeingType]);

  useEffect(() => {
    const { greyCutSize:gc, greyRate:gr, commPercent:c, schiffliQty:sq, schiffliRate:sr, dyeingRate:dr, finalFinishAvg:fa, takasCount:t, cottonThread:ct, profitMargin:pm, dharaPercent:dp } = inputs;
    const s1 = (gc * gr) * (1 + c/100);
    const s2 = sq * sr;
    const s3 = ct ? sq * 5 : 0;
    const s4 = sq * dr;
    const sub = s1+s2+s3+s4;
    const s5 = sub * t;
    const s6 = (t * fa) / 0.98;
    const s7 = s6 > 0 ? s5/s6 : 0;
    const s8 = s7 * (1 + pm/100);
    const s9 = (1 - dp/100) > 0 ? s8 / (1 - dp/100) : 0;

    setRes({ s1, s2, s3, s4, sub, s5, s6, s7, s8, s9 });
  }, [inputs]);

  const handleChange = (f, v) => setInputs(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    try {
      await supabase.from('hakoba_batch_calcs').insert([{
        total_grey_cost: res.s1, total_job_cost: res.s2+res.s4, total_batch_cost: res.s5,
        total_saleable_mtrs: res.s6, factory_cost_per_mtr: res.s7, margin_percent: inputs.profitMargin,
        final_selling_price: res.s9, inputs: inputs
      }]);
      toast({ title: 'Saved successfully' });
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet><title>Hakoba Batch Calculator</title></Helmet>
      <div className="flex justify-between items-center bg-slate-900 text-amber-500 p-6 rounded-xl">
        <h1 className="text-3xl font-bold flex items-center gap-3"><Calculator/> Hakoba Batch Calculator</h1>
        <Button onClick={handleSave} className="bg-amber-500 text-slate-900 hover:bg-amber-400"><Save className="mr-2"/> Save Batch</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Left: Grey & Schiffli</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><Label>A. Grey Cut (mtr)</Label><Input type="number" value={inputs.greyCutSize} onChange={e=>handleChange('greyCutSize', e.target.value)} /></div>
            <div><Label>B. Grey Rate (₹)</Label><Input type="number" value={inputs.greyRate} onChange={e=>handleChange('greyRate', e.target.value)} /></div>
            <div><Label>C. Comm %</Label><Input type="number" value={inputs.commPercent} onChange={e=>handleChange('commPercent', e.target.value)} /></div>
            <div><Label>D. Schiffli Qty</Label><Input type="number" value={inputs.schiffliQty} onChange={e=>handleChange('schiffliQty', e.target.value)} /></div>
            <div><Label>E. Schiffli Rate</Label><Input type="number" value={inputs.schiffliRate} onChange={e=>handleChange('schiffliRate', e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Right: Dyeing & Finishing</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>F. Dyeing Type</Label>
              <Select value={inputs.dyeingType} onValueChange={v=>handleChange('dyeingType', v)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{Object.keys(DYEING_RATES).map(k=><SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>G. Dyeing Rate</Label><Input type="number" value={inputs.dyeingRate} readOnly /></div>
            <div><Label>H. Finish Avg</Label><Input type="number" value={inputs.finalFinishAvg} onChange={e=>handleChange('finalFinishAvg', e.target.value)} /></div>
            <div><Label>I. Takas</Label><Input type="number" value={inputs.takasCount} onChange={e=>handleChange('takasCount', e.target.value)} /></div>
            <div><Label>K. Profit Margin %</Label><Input type="number" value={inputs.profitMargin} onChange={e=>handleChange('profitMargin', e.target.value)} /></div>
            <div><Label>L. Dhara %</Label><Input type="number" value={inputs.dharaPercent} onChange={e=>handleChange('dharaPercent', e.target.value)} /></div>
            <div className="col-span-2 flex items-center gap-2 mt-2">
              <Checkbox id="cotton" checked={inputs.cottonThread} onCheckedChange={c=>handleChange('cottonThread', c)} />
              <Label htmlFor="cotton">J. Cotton Thread (+₹5/mtr)</Label>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableBody>
              <TableRow><TableCell>1. Grey Cost</TableCell><TableCell className="text-right">₹{res.s1?.toFixed(2)}</TableCell></TableRow>
              <TableRow><TableCell>2. Schiffli</TableCell><TableCell className="text-right">₹{res.s2?.toFixed(2)}</TableCell></TableRow>
              <TableRow><TableCell>3. Thread</TableCell><TableCell className="text-right">₹{res.s3?.toFixed(2)}</TableCell></TableRow>
              <TableRow><TableCell>4. Dyeing</TableCell><TableCell className="text-right">₹{res.s4?.toFixed(2)}</TableCell></TableRow>
              <TableRow className="bg-slate-100 font-bold"><TableCell>SUB TOTAL / TAKA</TableCell><TableCell className="text-right">₹{res.sub?.toFixed(2)}</TableCell></TableRow>
              <TableRow><TableCell>5. Total Lot Cost</TableCell><TableCell className="text-right">₹{res.s5?.toFixed(2)}</TableCell></TableRow>
              <TableRow><TableCell>6. Saleable Mtrs</TableCell><TableCell className="text-right">{res.s6?.toFixed(2)} mtr</TableCell></TableRow>
              <TableRow className="font-bold text-blue-600"><TableCell>7. FACTORY COST / MTR</TableCell><TableCell className="text-right">₹{res.s7?.toFixed(2)}</TableCell></TableRow>
              <TableRow className="text-xl font-bold bg-amber-100 text-amber-900"><TableCell>FINAL SELLING PRICE (with Dhara)</TableCell><TableCell className="text-right">₹{res.s9?.toFixed(2)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default HakobaBatchCalculator;