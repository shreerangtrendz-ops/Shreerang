import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Printer, Download, RotateCcw, Info } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const HakobaCostSheet = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const fabricName = location.state?.fabricName || '';

    const [dyeingType, setDyeingType] = useState('mono'); // mono or contrast
    
    const [inputs, setInputs] = useState({
        greyCutSize: 21.25,
        greyRate: 35,
        purchaseComm: 1.5,
        schiffliBillQty: 20.25,
        schiffliJobRate: 50,
        dyeingJobRate: 12,
        finalFinishAvg: 18,
        profitMargin: 15,
        dhara: 7
    });

    const [calcs, setCalcs] = useState({
        totalGreyCost: 0,
        schiffliJobCost: 0,
        dyeingJobCost: 0,
        totalLotCost: 0,
        factoryCostPerMtr: 0,
        withProfit: 0,
        finalSellingPrice: 0
    });

    useEffect(() => {
        calculate();
    }, [inputs]);

    const handleInputChange = (field, value) => {
        setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    const calculate = () => {
        const {
            greyCutSize, greyRate, purchaseComm, schiffliBillQty, 
            schiffliJobRate, dyeingJobRate, finalFinishAvg, profitMargin, dhara
        } = inputs;

        const baseGreyCost = greyCutSize * greyRate;
        // Logic: (Grey Cut × Rate) + (Grey Cut × Rate × Comm%)
        const totalGreyCost = baseGreyCost + (baseGreyCost * (purchaseComm / 100));
        
        const schiffliJobCost = schiffliBillQty * schiffliJobRate;
        const dyeingJobCost = schiffliBillQty * dyeingJobRate;
        
        const totalLotCost = totalGreyCost + schiffliJobCost + dyeingJobCost;
        
        const factoryCostPerMtr = finalFinishAvg > 0 ? totalLotCost / finalFinishAvg : 0;
        
        const profitAmount = factoryCostPerMtr * (profitMargin / 100);
        const withProfit = factoryCostPerMtr + profitAmount;
        
        // Reverse calculation for Dhara deduction: Final / (1 - Dhara%)
        const dharaFactor = 1 - (dhara / 100);
        const finalSellingPrice = dharaFactor > 0 ? withProfit / dharaFactor : 0;

        setCalcs({
            totalGreyCost,
            schiffliJobCost,
            dyeingJobCost,
            totalLotCost,
            factoryCostPerMtr,
            withProfit,
            finalSellingPrice
        });
    };

    const formatCurrency = (val) => `₹${val.toFixed(2)}`;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <Helmet><title>Hakoba Cost Sheet</title></Helmet>
            <AdminPageHeader 
                title="Hakoba Cost Sheet" 
                breadcrumbs={[{label: 'Costing Sheets', href: '/admin/costing'}, {label: 'Hakoba Cost'}]}
                onBack={() => navigate(-1)}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Cost Calculation</CardTitle>
                            <p className="text-sm text-muted-foreground">{fabricName ? `For: ${fabricName}` : 'Hakoba Schiffli Dyeing Calculation'}</p>
                        </div>
                        <RadioGroup value={dyeingType} onValueChange={setDyeingType} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="mono" id="r1" /><Label htmlFor="r1">Mono (Tone-on-Tone)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="contrast" id="r2" /><Label htmlFor="r2">Contrast (Two-Tone)</Label></div>
                        </RadioGroup>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* INPUT GRID */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                            {[
                                { label: "Grey Cut Size", field: "greyCutSize" },
                                { label: "Grey Rate (₹)", field: "greyRate" },
                                { label: "Comm + Exp (%)", field: "purchaseComm" },
                                { label: "Schiffli Bill Qty", field: "schiffliBillQty" },
                                { label: "Schiffli Job Rate", field: "schiffliJobRate" },
                                { label: "Dyeing Job Rate", field: "dyeingJobRate" },
                                { label: "Final Finish Avg", field: "finalFinishAvg" },
                                { label: "Profit Margin (%)", field: "profitMargin" },
                                { label: "Dhara/Deduction (%)", field: "dhara" },
                            ].map(item => (
                                <div key={item.field} className="space-y-1">
                                    <Label className="text-xs">{item.label}</Label>
                                    <Input 
                                        type="number" 
                                        className="h-9 bg-blue-50 border-blue-200 text-right font-medium" 
                                        value={inputs[item.field]}
                                        onChange={(e) => handleInputChange(item.field, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* CALCULATIONS TABLE */}
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-12">Step</TableHead>
                                    <TableHead>Particulars</TableHead>
                                    <TableHead className="text-right">Result</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-bold">1</TableCell>
                                    <TableCell>Total Grey Cost <span className="text-xs text-muted-foreground block">(Grey Cut × Rate) + Comm%</span></TableCell>
                                    <TableCell className="text-right">{formatCurrency(calcs.totalGreyCost)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-bold">2</TableCell>
                                    <TableCell>Schiffli Job Cost <span className="text-xs text-muted-foreground block">Bill Qty × Schiffli Rate</span></TableCell>
                                    <TableCell className="text-right">{formatCurrency(calcs.schiffliJobCost)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-bold">3</TableCell>
                                    <TableCell>Dyeing Job Cost <span className="text-xs text-muted-foreground block">Bill Qty × Dyeing Rate</span></TableCell>
                                    <TableCell className="text-right">{formatCurrency(calcs.dyeingJobCost)}</TableCell>
                                </TableRow>
                                <TableRow className="bg-slate-100 font-semibold">
                                    <TableCell className="font-bold">4</TableCell>
                                    <TableCell>Total Lot Cost <span className="text-xs text-muted-foreground block">Sum of 1, 2, 3</span></TableCell>
                                    <TableCell className="text-right">{formatCurrency(calcs.totalLotCost)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-bold">5</TableCell>
                                    <TableCell>Factory Cost Per Mtr <span className="text-xs text-muted-foreground block">Total Lot / Final Avg</span></TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(calcs.factoryCostPerMtr)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-bold">6</TableCell>
                                    <TableCell>Add: Profit ({inputs.profitMargin}%)</TableCell>
                                    <TableCell className="text-right">{formatCurrency(calcs.withProfit)}</TableCell>
                                </TableRow>
                                <TableRow className="bg-green-50 border-t-2 border-green-200">
                                    <TableCell className="font-bold text-green-800">7</TableCell>
                                    <TableCell className="font-bold text-green-800">FINAL SELLING PRICE <span className="text-xs text-green-600 block font-normal">Step 6 / (1 - Dhara%)</span></TableCell>
                                    <TableCell className="text-right font-bold text-xl text-green-700">{formatCurrency(calcs.finalSellingPrice)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* INFO PANEL */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4"/> Dyeing Requirements</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {dyeingType === 'mono' ? (
                                <Alert className="bg-blue-50 border-blue-200">
                                    <AlertTitle className="text-blue-800">Mono (Tone-on-Tone)</AlertTitle>
                                    <AlertDescription className="text-blue-700 text-sm mt-2 space-y-2">
                                        <p><strong>Visual Look:</strong> Thread and Fabric are exactly the same color.</p>
                                        <p><strong>Chemistry:</strong> Both must be the same material (Fiber Match).</p>
                                        <p><strong>Example:</strong> Cotton Thread on Cotton Fabric.</p>
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert className="bg-purple-50 border-purple-200">
                                    <AlertTitle className="text-purple-800">Contrast (Two-Tone)</AlertTitle>
                                    <AlertDescription className="text-purple-700 text-sm mt-2 space-y-2">
                                        <p><strong>Visual Look:</strong> Thread is a different color (or White) than fabric.</p>
                                        <p><strong>Chemistry:</strong> Materials must be different (Fiber Mismatch).</p>
                                        <p><strong>Example:</strong> Polyester Thread on Cotton Fabric.</p>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex justify-end gap-4 fixed bottom-0 left-0 right-0 p-4 bg-white border-t lg:pl-64 z-40">
                <Button variant="outline" onClick={() => window.location.reload()}><RotateCcw className="h-4 w-4 mr-2"/> Reset</Button>
                <Button variant="outline"><Printer className="h-4 w-4 mr-2"/> Print</Button>
                <Button variant="outline"><Download className="h-4 w-4 mr-2"/> Export Excel</Button>
                <Button><Save className="h-4 w-4 mr-2"/> Save Cost Sheet</Button>
            </div>
        </div>
    );
};

export default HakobaCostSheet;