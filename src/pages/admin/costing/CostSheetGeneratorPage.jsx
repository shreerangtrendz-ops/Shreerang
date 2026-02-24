import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Calculator, Save, FileText } from 'lucide-react';
import { CostSheetService } from '@/services/CostSheetService';
import { DesignService } from '@/services/DesignService';
import { CostingPathService } from '@/services/CostingPathService';
import { calculateOutputQuantity, calculateCost } from '@/lib/formHelpers';
import { validateRequired } from '@/lib/validationHelpers';
import { ensureArray } from '@/lib/arrayValidation';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';
import { logError } from '@/lib/debugHelpers';

const CostSheetGeneratorContent = ({ onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Data
  const [designs, setDesigns] = useState([]);
  const [paths, setPaths] = useState([]);
  
  // Form State
  const [selectedDesignId, setSelectedDesignId] = useState('');
  const [selectedPathId, setSelectedPathId] = useState('');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalCost: 0, costPerMeter: 0, finalYield: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        DesignService.listDesigns({ limit: 100 }),
        CostingPathService.getAllPaths()
      ]);
      setDesigns(ensureArray(d.data, 'CostSheetGenerator - Designs'));
      setPaths(ensureArray(p, 'CostSheetGenerator - Paths'));
    } catch (e) { 
      logError(e, 'CostSheetGeneratorPage loadData');
      toast({ variant: "destructive", title: "Error", description: "Failed to load initial data." });
    } finally {
      setLoading(false);
    }
  };

  const handlePathChange = async (pathId) => {
    setSelectedPathId(pathId);
    const path = ensureArray(paths).find(p => String(p.id) === String(pathId));
    
    if (path) {
      const newRows = ensureArray(path.execution_order).map(stage => ({
        stageName: stage,
        quantity: 1000,
        rate: 0,
        shortagePct: 0,
        outputQty: 1000,
        cost: 0
      }));
      setRows(newRows);
      recalculateAll(newRows);
    }
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    
    if (field === 'quantity' || field === 'shortagePct') {
      newRows[index].outputQty = calculateOutputQuantity(newRows[index].quantity, newRows[index].shortagePct);
      for (let i = index + 1; i < newRows.length; i++) {
        newRows[i].quantity = newRows[i-1].outputQty;
        newRows[i].outputQty = calculateOutputQuantity(newRows[i].quantity, newRows[i].shortagePct);
        newRows[i].cost = calculateCost(newRows[i].outputQty, newRows[i].rate);
      }
    }
    
    if (field === 'rate' || field === 'quantity' || field === 'shortagePct') {
      newRows[index].cost = calculateCost(newRows[index].outputQty, newRows[index].rate);
    }

    setRows(newRows);
    recalculateAll(newRows);
  };

  const recalculateAll = (currentRows) => {
    let totalCost = 0;
    ensureArray(currentRows).forEach(r => totalCost += Number(r.cost || 0));
    const finalYield = currentRows.length > 0 ? Number(currentRows[currentRows.length - 1].outputQty || 0) : 0;
    const costPerMeter = finalYield > 0 ? totalCost / finalYield : 0;

    setSummary({
      totalCost: totalCost.toFixed(2),
      finalYield: finalYield.toFixed(2),
      costPerMeter: costPerMeter.toFixed(2)
    });
  };

  const handleSubmit = async () => {
    if (!validateRequired(selectedDesignId)) return toast({ variant: "destructive", description: "Select a Design" });
    if (!validateRequired(selectedPathId)) return toast({ variant: "destructive", description: "Select a Path" });

    setSubmitting(true);
    try {
      const design = ensureArray(designs).find(d => String(d.id) === String(selectedDesignId));
      
      const payload = {
        design_number: design?.design_number,
        sku_id: design?.sku_id,
        costing_path: selectedPathId,
        cost_breakdown: rows,
        total_cost: summary.totalCost,
        final_yield: summary.finalYield,
        cost_per_meter: summary.costPerMeter
      };

      await CostSheetService.saveCostSheet(payload);
      toast({ title: "Success", description: "Cost Sheet Saved" });
      onSuccess?.();
    } catch (e) {
      logError(e, 'CostSheetGeneratorPage submit');
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Design Number</label>
            <Select value={selectedDesignId} onValueChange={setSelectedDesignId}>
              <SelectTrigger><SelectValue placeholder="Select Design" /></SelectTrigger>
              <SelectContent>
                {ensureArray(designs).map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.design_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Costing Path</label>
            <Select value={String(selectedPathId)} onValueChange={handlePathChange}>
              <SelectTrigger><SelectValue placeholder="Select Path" /></SelectTrigger>
              <SelectContent>
                {ensureArray(paths).map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.path_number}. {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Cost Breakdown</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead>Input Qty</TableHead>
                  <TableHead>Shortage %</TableHead>
                  <TableHead>Rate (₹)</TableHead>
                  <TableHead>Output Qty</TableHead>
                  <TableHead className="text-right">Cost (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ensureArray(rows).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.stageName}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={row.quantity} 
                        onChange={e => handleRowChange(index, 'quantity', e.target.value)}
                        className="w-24 h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={row.shortagePct} 
                        onChange={e => handleRowChange(index, 'shortagePct', e.target.value)}
                        className="w-20 h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={row.rate} 
                        onChange={e => handleRowChange(index, 'rate', e.target.value)}
                        className="w-24 h-8"
                      />
                    </TableCell>
                    <TableCell className="text-slate-600">{Number(row.outputQty).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">{Number(row.cost).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="bg-slate-50 border-blue-200">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-slate-500 uppercase">Total Batch Cost</p>
              <p className="text-2xl font-bold text-slate-800">₹{summary.totalCost}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase">Final Yield</p>
              <p className="text-2xl font-bold text-slate-800">{summary.finalYield} m</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase">Cost Per Meter</p>
              <p className="text-3xl font-bold text-blue-600">₹{summary.costPerMeter}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => window.print()}>
          <FileText className="mr-2 h-4 w-4" /> Print PDF
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || rows.length === 0} className="bg-blue-600 hover:bg-blue-700">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Cost Sheet
        </Button>
      </div>
    </div>
  );
};

const CostSheetGeneratorPage = () => (
  <DataErrorBoundary>
    <CostSheetGeneratorContent />
  </DataErrorBoundary>
);

export default CostSheetGeneratorPage;