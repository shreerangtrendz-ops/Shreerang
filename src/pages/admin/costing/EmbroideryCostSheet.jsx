import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Printer, Download, RotateCcw } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const EmbroideryCostSheet = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const fabricName = location.state?.fabricName || '';

    const [inputs, setInputs] = useState({
        greyRate: 50,
        shrinkage: 10,
        jobRate: 40
    });

    const [calcs, setCalcs] = useState({
        step1: 0,
        finalCost: 0
    });

    useEffect(() => {
        const shrinkageFactor = 1 - (inputs.shrinkage / 100);
        const step1 = shrinkageFactor > 0 ? inputs.greyRate / shrinkageFactor : 0;
        const finalCost = step1 + inputs.jobRate;

        setCalcs({ step1, finalCost });
    }, [inputs]);

    const handleInputChange = (field, value) => {
        setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    const formatCurrency = (val) => `₹${val.toFixed(2)}`;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <Helmet><title>Embroidery Cost Sheet</title></Helmet>
            <AdminPageHeader 
                title="Embroidery Cost Sheet" 
                breadcrumbs={[{label: 'Costing Sheets', href: '/admin/costing'}, {label: 'Embroidery Cost'}]}
                onBack={() => navigate(-1)}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Calculate Embroidery Cost</CardTitle>
                    <p className="text-sm text-muted-foreground">{fabricName ? `For: ${fabricName}` : 'Calculate embroidery fabric cost'}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Grey Rate (₹)</label>
                            <Input 
                                type="number" 
                                className="bg-blue-50 border-blue-200 text-right text-lg font-semibold" 
                                value={inputs.greyRate}
                                onChange={(e) => handleInputChange('greyRate', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Shrinkage (%)</label>
                            <Input 
                                type="number" 
                                className="bg-blue-50 border-blue-200 text-right text-lg font-semibold" 
                                value={inputs.shrinkage}
                                onChange={(e) => handleInputChange('shrinkage', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Job Rate (₹)</label>
                            <Input 
                                type="number" 
                                className="bg-blue-50 border-blue-200 text-right text-lg font-semibold" 
                                value={inputs.jobRate}
                                onChange={(e) => handleInputChange('jobRate', e.target.value)}
                            />
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[100px]">Step</TableHead>
                                <TableHead>Formula / Logic</TableHead>
                                <TableHead className="text-right">Result</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-bold">1</TableCell>
                                <TableCell>
                                    <div>Grey Rate / (1 - Shrinkage%)</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {inputs.greyRate} / (1 - {inputs.shrinkage}%) = {inputs.greyRate} / {(1 - inputs.shrinkage/100).toFixed(2)}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-lg">
                                    {formatCurrency(calcs.step1)}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">2</TableCell>
                                <TableCell>
                                    <div>Step 1 + Job Rate</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {calcs.step1.toFixed(2)} + {inputs.jobRate}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-lg">
                                    {formatCurrency(calcs.finalCost)}
                                </TableCell>
                            </TableRow>
                            <TableRow className="bg-green-50 border-t-2 border-green-200">
                                <TableCell className="font-bold text-green-800">FINAL</TableCell>
                                <TableCell className="font-bold text-green-800">Final Cost Per Meter</TableCell>
                                <TableCell className="text-right font-bold text-2xl text-green-700">
                                    {formatCurrency(calcs.finalCost)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 fixed bottom-0 left-0 right-0 p-4 bg-white border-t lg:pl-64 z-40">
                <Button variant="outline" onClick={() => setInputs({greyRate: 0, shrinkage: 0, jobRate: 0})}>
                    <RotateCcw className="h-4 w-4 mr-2"/> Reset
                </Button>
                <Button variant="outline"><Printer className="h-4 w-4 mr-2"/> Print</Button>
                <Button variant="outline"><Download className="h-4 w-4 mr-2"/> Export Excel</Button>
                <Button><Save className="h-4 w-4 mr-2"/> Save Cost Sheet</Button>
            </div>
        </div>
    );
};

export default EmbroideryCostSheet;