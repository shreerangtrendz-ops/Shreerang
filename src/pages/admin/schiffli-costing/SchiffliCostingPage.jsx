import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { SchiffliCostingService } from '@/services/SchiffliCostingService';
import { SchiffliMasterService } from '@/services/SchiffliMasterService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Calculator, Save } from 'lucide-react';

const SchiffliCostingPage = () => {
  const [fabrics, setFabrics] = useState([]);
  const [selectedFabric, setSelectedFabric] = useState('');
  
  const [costingData, setCostingData] = useState({
    grey_cost: 0,
    shortage_percentage: 5,
    schiffli_rate: 0,
    deca_rate: 0,
    piece_size: 20, // meters per piece
    complete_pcs: 0,
    incomplete_pcs: 0,
    wastage_mtr: 0
  });
  
  const [results, setResults] = useState({
    total_mtr: 0,
    total_cost: 0,
    cost_per_mtr: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    // Load finish fabrics
    SchiffliMasterService.listFabricMasters('finish').then(setFabrics);
  }, []);

  useEffect(() => {
    calculate();
  }, [costingData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCostingData(prev => ({ ...prev, [name]: Number(value) }));
  };

  const calculate = () => {
    // Basic Piece Logic
    const { totalMeters } = SchiffliCostingService.calculatePieceBasedSchiffli(
      costingData.piece_size, 
      costingData.complete_pcs, 
      costingData.incomplete_pcs, 
      costingData.wastage_mtr
    );
    
    // Cost Logic (Simplified for example)
    const baseCost = totalMeters * costingData.grey_cost;
    const processCost = totalMeters * (costingData.schiffli_rate + costingData.deca_rate);
    const totalCost = baseCost + processCost;
    
    const finalMeters = totalMeters * (1 - (costingData.shortage_percentage / 100));
    const costPerMtr = SchiffliCostingService.calculateFinalCostPerMeter(totalCost, finalMeters);

    setResults({
      total_mtr: totalMeters,
      total_cost: totalCost,
      cost_per_mtr: costPerMtr
    });
  };

  const handleSave = async () => {
    if (!selectedFabric) {
      toast({ variant: "destructive", title: "Error", description: "Please select a fabric" });
      return;
    }
    try {
      await SchiffliCostingService.saveSchiffliCosting({
        fabric_id: selectedFabric,
        ...costingData,
        ...results
      });
      toast({ title: "Saved", description: "Costing saved successfully" });
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Failed to save costing" });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Schiffli Costing | Admin</title></Helmet>
      <AdminPageHeader 
        title="Schiffli Costing Calculator" 
        description="Calculate detailed piece-based costing for schiffli fabrics."
        breadcrumbs={[{label: 'Admin', href: '/admin'}, {label: 'Schiffli Costing'}]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>1. Select Fabric</CardTitle></CardHeader>
            <CardContent>
              <Select value={selectedFabric} onValueChange={setSelectedFabric}>
                <SelectTrigger><SelectValue placeholder="Select Finish Fabric" /></SelectTrigger>
                <SelectContent>
                  {fabrics.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.sku})</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>2. Input Parameters</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grey Cost (per mtr)</Label>
                <Input type="number" name="grey_cost" value={costingData.grey_cost} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Shortage (%)</Label>
                <Input type="number" name="shortage_percentage" value={costingData.shortage_percentage} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Schiffli Rate</Label>
                <Input type="number" name="schiffli_rate" value={costingData.schiffli_rate} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Deca Rate</Label>
                <Input type="number" name="deca_rate" value={costingData.deca_rate} onChange={handleChange} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>3. Piece Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Piece Size (mtr)</Label>
                <Input type="number" name="piece_size" value={costingData.piece_size} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Complete Pcs</Label>
                <Input type="number" name="complete_pcs" value={costingData.complete_pcs} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Incomplete Pcs</Label>
                <Input type="number" name="incomplete_pcs" value={costingData.incomplete_pcs} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Wastage (mtr)</Label>
                <Input type="number" name="wastage_mtr" value={costingData.wastage_mtr} onChange={handleChange} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-blue-200 bg-blue-50">
            <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" /> Results</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-slate-500">Total Meters (Input)</p>
                <p className="text-2xl font-bold">{results.total_mtr.toFixed(2)} m</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Cost</p>
                <p className="text-2xl font-bold">₹{results.total_cost.toFixed(2)}</p>
              </div>
              <div className="pt-4 border-t border-blue-200">
                <p className="text-sm text-slate-500">Final Cost Per Meter</p>
                <p className="text-4xl font-bold text-blue-700">₹{results.cost_per_mtr}</p>
                <p className="text-xs text-slate-500 mt-1">Includes {costingData.shortage_percentage}% shortage</p>
              </div>
              
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" /> Save Costing
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchiffliCostingPage;