import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { costingEngine } from '@/lib/costingEngine';

const CostingBreakdown = ({ product, quantity, designCount, onCostCalculated }) => {
  // Local state for costing parameters (editable)
  const [params, setParams] = useState({
      greyRate: 45,
      jobRate: 25,
      accessories: 15,
      labor: 40,
      packing: 10,
      overheads: 5,
      marginPercent: 20,
      shrinkage: 5,
      expense: 2
  });

  const [breakdown, setBreakdown] = useState({
      fabricCost: 0,
      totalFactoryCost: 0,
      sellingPrice: 0,
      totalProfit: 0
  });

  useEffect(() => {
      // Intelligent Calculation based on Costing Engine
      // Assuming 'Standard Finish' for this example
      const fabricCostPerMtr = costingEngine.calculateFinishCharge(
          params.greyRate, 
          params.jobRate, 
          params.expense, 
          params.shrinkage
      );

      // Estimate consumption (e.g., 2.5m per suit, avg)
      const consumption = 2.5; 
      const totalFabricCost = fabricCostPerMtr * consumption;

      const totalBatchCost = costingEngine.calculateBatchCost(
          totalFabricCost,
          0, // Job cost included in fabric rate logic above for simplicity, or split it
          params.accessories,
          params.labor,
          params.packing,
          params.overheads
      );

      const finalPrice = costingEngine.calculateFinalPrice(totalBatchCost, params.marginPercent);
      
      const profitPerUnit = finalPrice - totalBatchCost;
      const totalProfit = profitPerUnit * quantity;

      const calculated = {
          fabricCostPerUnit: totalFabricCost.toFixed(2),
          totalFactoryCost: totalBatchCost.toFixed(2),
          sellingPrice: finalPrice.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          marginAmount: (finalPrice - totalBatchCost).toFixed(2)
      };

      setBreakdown(calculated);
      
      if(onCostCalculated) {
          onCostCalculated(calculated);
      }

  }, [params, quantity, product]);

  const handleChange = (field, value) => {
      setParams(prev => ({...prev, [field]: parseFloat(value) || 0 }));
  };

  return (
    <Card className="bg-slate-50">
        <CardHeader className="pb-2">
            <CardTitle className="text-lg">Intelligent Costing Engine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Grey Rate (₹)</Label>
                    <Input className="h-8 bg-white" value={params.greyRate} onChange={e => handleChange('greyRate', e.target.value)} />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Job Rate (₹)</Label>
                    <Input className="h-8 bg-white" value={params.jobRate} onChange={e => handleChange('jobRate', e.target.value)} />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Labor (₹)</Label>
                    <Input className="h-8 bg-white" value={params.labor} onChange={e => handleChange('labor', e.target.value)} />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Margin (%)</Label>
                    <Input className="h-8 bg-white font-bold text-blue-600" value={params.marginPercent} onChange={e => handleChange('marginPercent', e.target.value)} />
                </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Fabric Cost / Unit:</span>
                    <span>₹{breakdown.fabricCostPerUnit}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Factory Cost:</span>
                    <span className="font-medium">₹{breakdown.totalFactoryCost}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold">Final Selling Price:</span>
                    <span className="text-xl font-bold text-green-700">₹{breakdown.sellingPrice}</span>
                </div>
                 <div className="flex justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Est. Profit / Unit:</span>
                    <span className="text-green-600">+₹{breakdown.marginAmount}</span>
                </div>
            </div>

            {params.marginPercent < 10 && (
                <div className="bg-red-100 text-red-700 p-2 text-xs rounded text-center">
                    Warning: Margin is below 10% threshold.
                </div>
            )}
        </CardContent>
    </Card>
  );
};

export default CostingBreakdown;