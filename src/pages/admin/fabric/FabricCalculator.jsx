import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const FabricCalculator = () => {
    const [inputs, setInputs] = useState({
        fabricQty: 0,
        garmentType: 'kurti',
        processType: 'plain',
        jobWorkerRate: 100,
        size: 'L'
    });
    const [result, setResult] = useState(null);

    const handleCalculate = () => {
        const consumptionMap = {
            kurti: 2.5,
            suit_2pc: 4.5,
            suit_3pc: 6.75,
            gown: 3.5
        };

        const sizeMultiplier = inputs.size === 'XXL' ? 1.10 : 1.0;
        const baseConsumption = consumptionMap[inputs.garmentType] || 2.5;
        const finalConsumption = baseConsumption * sizeMultiplier;

        // Mock fabric rate avg
        const avgFabricRate = 120; // This would come from DB in real scenario
        const fabricCost = finalConsumption * avgFabricRate;
        
        // Process cost adder
        const processCost = inputs.processType === 'embroidery' ? 150 : (inputs.processType === 'printed' ? 50 : 0);
        
        const totalCost = fabricCost + processCost + parseFloat(inputs.jobWorkerRate);

        setResult({
            consumption: finalConsumption.toFixed(2),
            estimatedCost: totalCost.toFixed(2),
            fabricReq: (parseFloat(inputs.fabricQty) / finalConsumption).toFixed(1) // Pieces possible
        });
    };

    return (
        <Card className="w-full border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary"/> 
                    Quick Estimate Calculator
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Available Fabric (Mtr)</Label>
                        <Input 
                            type="number" 
                            value={inputs.fabricQty} 
                            onChange={(e) => setInputs({...inputs, fabricQty: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Garment Type</Label>
                        <Select value={inputs.garmentType} onValueChange={(v) => setInputs({...inputs, garmentType: v})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="kurti">Kurti (Top)</SelectItem>
                                <SelectItem value="suit_2pc">Suit (2-Pc)</SelectItem>
                                <SelectItem value="suit_3pc">Suit (3-Pc)</SelectItem>
                                <SelectItem value="gown">Gown</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Size Variant</Label>
                        <Select value={inputs.size} onValueChange={(v) => setInputs({...inputs, size: v})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="S">S / M / L / XL</SelectItem>
                                <SelectItem value="XXL">XXL (+10% Cons.)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                         <Label>Job Worker Rate (₹)</Label>
                         <Input 
                            type="number" 
                            value={inputs.jobWorkerRate} 
                            onChange={(e) => setInputs({...inputs, jobWorkerRate: e.target.value})}
                        />
                    </div>
                </div>

                <Button onClick={handleCalculate} className="w-full">Calculate Estimate</Button>

                {result && (
                    <div className="bg-slate-50 p-4 rounded-lg space-y-2 mt-4 border border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Consumption/Pc:</span>
                            <span className="font-medium">{result.consumption} Mtr</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pieces Possible:</span>
                            <span className="font-bold text-blue-600">{result.fabricReq} Pcs</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2 mt-2">
                            <span className="text-muted-foreground">Est. Cost/Pc:</span>
                            <span className="font-bold text-green-600">₹{result.estimatedCost}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default FabricCalculator;