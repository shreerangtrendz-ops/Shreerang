import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Save, Printer, Download, RotateCcw } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const MillCostSheet = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const fabricName = location.state?.fabricName || '';

    const [scenario, setScenario] = useState('A'); // A = Grey Meters, B = Finish Meters
    
    // Inputs
    const [inputs, setInputs] = useState({
        greyQty: 100,
        greyRate: 50,
        finishMtr: 90,
        shortage: 10
    });

    // Calculations
    const [calcs, setCalcs] = useState({
        basicGreyAmount: 0,
        buyingCommission: 0,
        transportation: 0,
        netGreyCost: 0,
        printJobCharge: 0,
        totalBatchCost: 0,
        finalCostPerMtr: 0
    });

    useEffect(() => {
        calculate();
    }, [inputs, scenario]);

    const handleInputChange = (field, value) => {
        setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    const calculate = () => {
        const basicGreyAmount = inputs.greyQty * inputs.greyRate;
        const buyingCommission = basicGreyAmount * 0.01; // 1%
        const transportation = basicGreyAmount * 0.005; // 0.5%
        const netGreyCost = basicGreyAmount + buyingCommission + transportation;

        let printJobCharge = 0;
        if (scenario === 'A') {
            // Scenario A: Mill Charges on GREY Meters
            printJobCharge = inputs.greyQty * 20.00; 
        } else {
            // Scenario B: Mill Charges on FINISH Meters
            printJobCharge = inputs.finishMtr * 20.00;
        }

        const totalBatchCost = netGreyCost + printJobCharge;
        
        // Final Cost
        const finalCostPerMtr = inputs.finishMtr > 0 ? totalBatchCost / inputs.finishMtr : 0;

        setCalcs({
            basicGreyAmount,
            buyingCommission,
            transportation,
            netGreyCost,
            printJobCharge,
            totalBatchCost,
            finalCostPerMtr
        });
    };

    const formatCurrency = (val) => `₹${val.toFixed(2)}`;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <Helmet><title>Mill Cost Sheet</title></Helmet>
            <AdminPageHeader 
                title="Mill Cost Sheet" 
                breadcrumbs={[{label: 'Costing Sheets', href: '/admin/costing'}, {label: 'Mill Cost'}]}
                onBack={() => navigate(-1)}
            />

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle>Calculate Mill Cost</CardTitle>
                        <p className="text-sm text-muted-foreground">{fabricName ? `For: ${fabricName}` : 'Calculate fabric cost from mill'}</p>
                    </div>
                    <RadioGroup 
                        defaultValue="A" 
                        value={scenario} 
                        onValueChange={setScenario}
                        className="flex gap-4 bg-slate-100 p-2 rounded-lg"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="A" id="r1" />
                            <Label htmlFor="r1">Scenario A (Grey Mtrs)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="B" id="r2" />
                            <Label htmlFor="r2">Scenario B (Finish Mtrs)</Label>
                        </div>
                    </RadioGroup>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[300px]">Particulars</TableHead>
                                <TableHead>Formula / Logic</TableHead>
                                <TableHead className="w-[200px] text-right">Amount (₹)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Grey Input Qty</TableCell>
                                <TableCell>User Input</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        className="bg-blue-50 border-blue-200 text-right font-medium" 
                                        value={inputs.greyQty}
                                        onChange={(e) => handleInputChange('greyQty', e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Grey Rate</TableCell>
                                <TableCell>User Input</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        className="bg-blue-50 border-blue-200 text-right font-medium" 
                                        value={inputs.greyRate}
                                        onChange={(e) => handleInputChange('greyRate', e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                            
                            {/* Read Only Calculations */}
                            <TableRow className="bg-slate-50/50">
                                <TableCell>Basic Grey Amount</TableCell>
                                <TableCell className="text-xs text-muted-foreground">Grey Qty × Grey Rate</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(calcs.basicGreyAmount)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-slate-50/50">
                                <TableCell>Add: Buying Commission</TableCell>
                                <TableCell className="text-xs text-muted-foreground">1% of Basic Grey Amount</TableCell>
                                <TableCell className="text-right">{formatCurrency(calcs.buyingCommission)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-slate-50/50">
                                <TableCell>Add: Transportation</TableCell>
                                <TableCell className="text-xs text-muted-foreground">0.5% of Basic Grey Amount</TableCell>
                                <TableCell className="text-right">{formatCurrency(calcs.transportation)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-slate-100 font-semibold">
                                <TableCell>Net Grey Cost</TableCell>
                                <TableCell className="text-xs text-muted-foreground">Sum of above</TableCell>
                                <TableCell className="text-right">{formatCurrency(calcs.netGreyCost)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Print Job Charge</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {scenario === 'A' ? 'Grey Mtrs × 20.00' : 'Finish Mtrs × 20.00'}
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(calcs.printJobCharge)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <TableCell>TOTAL BATCH COST</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right text-lg">{formatCurrency(calcs.totalBatchCost)}</TableCell>
                            </TableRow>
                            
                            {/* Output */}
                            <TableRow>
                                <TableCell className="font-medium">Finish Mtr Received</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Shortage %:</span>
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 bg-blue-50 border-blue-200" 
                                            value={inputs.shortage}
                                            onChange={(e) => handleInputChange('shortage', e.target.value)}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        className="bg-blue-50 border-blue-200 text-right font-medium" 
                                        value={inputs.finishMtr}
                                        onChange={(e) => handleInputChange('finishMtr', e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                            <TableRow className="bg-green-50">
                                <TableCell className="font-bold text-green-800 text-lg">FINAL COST PER MTR</TableCell>
                                <TableCell className="text-xs text-green-600">Total Batch Cost / Finish Mtr Received</TableCell>
                                <TableCell className="text-right font-bold text-xl text-green-700">{formatCurrency(calcs.finalCostPerMtr)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 fixed bottom-0 left-0 right-0 p-4 bg-white border-t lg:pl-64 z-40">
                <Button variant="outline" onClick={() => setInputs({greyQty: 0, greyRate: 0, finishMtr: 0, shortage: 0})}>
                    <RotateCcw className="h-4 w-4 mr-2"/> Reset
                </Button>
                <Button variant="outline">
                    <Printer className="h-4 w-4 mr-2"/> Print
                </Button>
                <Button variant="outline">
                    <Download className="h-4 w-4 mr-2"/> Export Excel
                </Button>
                <Button>
                    <Save className="h-4 w-4 mr-2"/> Save Cost Sheet
                </Button>
            </div>
        </div>
    );
};

export default MillCostSheet;