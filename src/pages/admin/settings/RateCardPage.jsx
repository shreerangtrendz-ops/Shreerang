import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RateCardService } from '@/services/RateCardService';
import { useToast } from '@/components/ui/use-toast';
import { Save, AlertTriangle, RefreshCw } from 'lucide-react';

const RateCardPage = () => {
  const [rates, setRates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editShortage, setEditShortage] = useState('');
  const { toast } = useToast();

  useEffect(() => { loadRates(); }, []);

  const loadRates = async () => {
    try {
      const data = await RateCardService.getAll();
      setRates(data);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load rate card' });
    }
  };

  const handleSave = async (id) => {
    try {
      await RateCardService.update(id, { rate_value: parseFloat(editValue) });
      toast({ title: 'Success', description: 'Rate globally updated. Recalculation triggered.' });
      setEditingId(null);
      loadRates();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error' });
    }
  };

  // Sections filtering logic (mocking categories from DB)
  const processRates = rates.filter(r => r.category === 'process') || [];
  const vaRates = rates.filter(r => r.category === 'va') || [];
  const addCharges = rates.filter(r => r.category === 'additional') || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 pb-20">
      <Helmet><title>Master Rate Card</title></Helmet>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md flex items-start gap-3 shadow-sm">
        <AlertTriangle className="text-blue-500 w-6 h-6 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-blue-900 font-bold text-lg">CRITICAL SYSTEM MASTER</h3>
          <p className="text-blue-800">IMPORTANT: Changing any rate here will trigger recalculation of ALL saved cost sheets and selling prices automatically across the entire ERP.</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-slate-900 text-amber-500 p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold">Global Rate Card Master</h1>
          <p className="text-slate-300 mt-2 flex items-center"><RefreshCw className="w-3 h-3 mr-2 animate-spin-slow"/> Live ERP Synchronization Active</p>
        </div>
      </div>

      {/* SECTION 1: PROCESS RATES */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader className="bg-slate-50 border-b"><CardTitle>Section 1: Process Rates</CardTitle></CardHeader>
        <CardContent className="pt-0 px-0">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="pl-6">Process Name</TableHead>
                <TableHead>Default Rate (₹)</TableHead>
                <TableHead>Charge On</TableHead>
                <TableHead>Shortage %</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium pl-6">{r.item_name}</TableCell>
                  <TableCell>
                    {editingId === r.id ? (
                      <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-24 border-amber-500 focus-visible:ring-amber-500" />
                    ) : (
                      <span className="font-bold text-slate-800">₹{r.rate_value}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500">{r.unit || 'Input Qty'}</TableCell>
                  <TableCell>15%</TableCell>
                  <TableCell className="text-right pr-6">
                    {editingId === r.id ? (
                      <Button size="sm" onClick={() => handleSave(r.id)} className="bg-green-600 hover:bg-green-700 text-white"><Save className="w-4 h-4 mr-1" /> Save</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(r.id); setEditValue(r.rate_value); }}>Edit</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8">Loading rates...</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default RateCardPage;