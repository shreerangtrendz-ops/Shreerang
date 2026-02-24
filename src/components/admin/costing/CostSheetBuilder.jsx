import React, { useState, useEffect } from 'react';
import { CostSheetService } from '@/services/CostSheetService';
import { CostingPathService } from '@/services/CostingPathService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Calculator, Save, FileText, ArrowRight } from 'lucide-react';
import ExecutionOrderFlow from './ExecutionOrderFlow';
import ProcessStageDefinition from './ProcessStageDefinition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CostSheetBuilder = () => {
  const { toast } = useToast();
  const [paths, setPaths] = useState([]);
  const [selectedPathId, setSelectedPathId] = useState('');
  const [selectedPathData, setSelectedPathData] = useState(null);
  
  const [designNumber, setDesignNumber] = useState('');
  const [fabricSKU, setFabricSKU] = useState('');
  const [greyRate, setGreyRate] = useState('');
  const [greyShrink, setGreyShrink] = useState('');
  
  // Execution State
  const [stageParams, setStageParams] = useState({}); // { 0: { rate: 10, shrink: 2 }, 1: ... } keyed by index
  const [stageSelections, setStageSelections] = useState({}); // { 1: "MP" } keyed by index for choice stages

  const [loading, setLoading] = useState(false);
  const [generatedSheet, setGeneratedSheet] = useState(null);

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
        const data = await CostingPathService.getAllPaths();
        setPaths(data);
    } catch(e) { console.error(e); }
  };

  const handlePathSelect = (pathId) => {
    setSelectedPathId(pathId);
    const path = paths.find(p => p.id === pathId);
    setSelectedPathData(path);
    setStageParams({});
    setStageSelections({});
    setGeneratedSheet(null);
  };

  const handleStageParamChange = (index, field, value) => {
    setStageParams(prev => ({
        ...prev,
        [index]: {
            ...prev[index],
            [field]: value
        }
    }));
  };

  const handleStageSelect = (index, code) => {
    setStageSelections(prev => ({
        ...prev,
        [index]: code
    }));
  };

  const handleGenerate = async () => {
    if (!designNumber || !greyRate || !selectedPathData) {
        toast({ variant: "destructive", title: "Missing Fields", description: "Design Number and Grey Rate are required." });
        return;
    }

    // Validate that all choice stages have selections
    const executionOrder = selectedPathData.execution_order || [];
    for (let i = 0; i < executionOrder.length; i++) {
        const item = executionOrder[i];
        if (item === "STAGE1" && !stageSelections[i]) {
            toast({ variant: "destructive", title: "Selection Required", description: "Please select a specific process for the coloring stage." });
            return;
        }
    }

    setLoading(true);
    try {
        const sheet = await CostSheetService.calculateCostWithExecutionOrder({
            greyRate,
            greyShrink,
            executionOrder: selectedPathData.execution_order,
            stageParams,
            stageSelections
        });
        
        setGeneratedSheet(sheet);
        toast({ title: "Generated", description: "Cost sheet calculated successfully." });
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedSheet) return;
    try {
        const saveData = {
            design_number: designNumber,
            fabric_type: 'Unknown',
            costing_path_id: selectedPathId,
            cost_breakdown: generatedSheet.breakdown,
            cost_breakdown_by_stage: generatedSheet.breakdownByStage,
            execution_order_used: generatedSheet.executionOrderUsed,
            total_cost: generatedSheet.totalBatchCost,
            cost_per_mtr: generatedSheet.totalCost,
            final_yield_mtr: generatedSheet.finalQty,
            type: 'GENERATED_SHEET'
        };
        
        await CostSheetService.saveCostSheet(saveData);
        toast({ title: "Saved", description: "Cost sheet saved to database." });
    } catch (error) {
        toast({ variant: "destructive", title: "Save Failed", description: error.message });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Left Sidebar: Config */}
      <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
        <Card className="border-l-4 border-l-indigo-500 shadow-md">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-indigo-600" />
                    Configuration
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Design No.</Label>
                        <Input value={designNumber} onChange={e => setDesignNumber(e.target.value)} placeholder="D-1001" />
                    </div>
                    <div className="space-y-2">
                        <Label>Fabric SKU</Label>
                        <Input value={fabricSKU} onChange={e => setFabricSKU(e.target.value)} placeholder="Opt." />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                    <Label className="font-semibold text-slate-700">Grey Fabric Input</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Rate (₹)</Label>
                            <Input 
                                type="number" 
                                value={greyRate} 
                                onChange={e => setGreyRate(e.target.value)} 
                                placeholder="0.00" 
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Shrinkage %</Label>
                            <Input 
                                type="number" 
                                value={greyShrink} 
                                onChange={e => setGreyShrink(e.target.value)} 
                                placeholder="0" 
                                className="bg-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Select Costing Path</Label>
                    <Select value={selectedPathId} onValueChange={handlePathSelect}>
                        <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select Path..." />
                        </SelectTrigger>
                        <SelectContent>
                            {paths.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    <div className="flex flex-col text-left">
                                        <span className="font-bold">Path {p.path_number}: {p.path_name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={handleGenerate} disabled={loading || !selectedPathData}>
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                    Calculate Cost Sheet
                </Button>
            </CardContent>
        </Card>

        {generatedSheet && (
             <Card className="bg-green-50 border-green-200 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="pb-2 border-b border-green-100">
                    <CardTitle className="text-green-900 text-base">Results Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-green-700 font-medium">Net Cost / Meter</span>
                        <span className="text-3xl font-bold text-green-800 tracking-tight">₹{generatedSheet.totalCost}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-white p-2 rounded border border-green-100">
                            <span className="block text-slate-500 text-xs">Final Yield</span>
                            <span className="font-mono font-bold">{generatedSheet.finalQty} m</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-green-100">
                             <span className="block text-slate-500 text-xs">Batch Cost</span>
                             <span className="font-mono font-bold">₹{generatedSheet.totalBatchCost}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2"/> Save
                        </Button>
                        <Button className="flex-1" variant="outline">
                            <FileText className="h-4 w-4 mr-2"/> PDF
                        </Button>
                    </div>
                </CardContent>
             </Card>
        )}
        
        <div className="hidden lg:block">
            <ProcessStageDefinition />
        </div>
      </div>

      {/* Right Content: Flow & Breakdown */}
      <div className="lg:col-span-8 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
        {selectedPathData ? (
            <Tabs defaultValue="flow" className="flex-1 flex flex-col">
                <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">
                        {selectedPathData.path_name} 
                        <span className="ml-2 text-xs font-normal text-slate-500">Execution Flow</span>
                    </h3>
                    <TabsList>
                        <TabsTrigger value="flow">Execution Flow</TabsTrigger>
                        <TabsTrigger value="breakdown" disabled={!generatedSheet}>Detailed Breakdown</TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="flow" className="flex-1 overflow-y-auto p-6">
                    <ExecutionOrderFlow 
                        executionOrder={selectedPathData.execution_order}
                        stageParams={stageParams}
                        onParamChange={handleStageParamChange}
                        onStageSelect={handleStageSelect}
                        activeStageSelections={stageSelections}
                    />
                </TabsContent>

                <TabsContent value="breakdown" className="flex-1 overflow-y-auto p-6">
                    {generatedSheet && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Stage-wise Breakdown</CardTitle></CardHeader>
                                <CardContent>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-slate-50">
                                                <th className="text-left p-2">Stage</th>
                                                <th className="text-right p-2">Input Qty</th>
                                                <th className="text-right p-2">Rate</th>
                                                <th className="text-right p-2">Stage Cost</th>
                                                <th className="text-right p-2">Shrink %</th>
                                                <th className="text-right p-2">Output Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {generatedSheet.breakdownByStage.map((stage, idx) => (
                                                <tr key={idx} className="border-b">
                                                    <td className="p-2 font-medium">
                                                        <Badge variant="outline" className="mr-2">{stage.code}</Badge>
                                                        {stage.name}
                                                    </td>
                                                    <td className="p-2 text-right font-mono text-slate-600">{stage.inputQty}</td>
                                                    <td className="p-2 text-right font-mono">₹{stage.rate}</td>
                                                    <td className="p-2 text-right font-mono font-bold">₹{stage.cost}</td>
                                                    <td className="p-2 text-right text-red-500">{stage.shrink}%</td>
                                                    <td className="p-2 text-right font-mono font-bold text-indigo-700">{stage.outputQty}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-slate-50 font-bold">
                                                <td className="p-3">TOTALS</td>
                                                <td className="p-3 text-right">1000.00</td>
                                                <td className="p-3 text-right">-</td>
                                                <td className="p-3 text-right">₹{generatedSheet.totalBatchCost}</td>
                                                <td className="p-3 text-right">-</td>
                                                <td className="p-3 text-right">{generatedSheet.finalQty}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                <ArrowRight className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a costing path to configure the execution flow.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CostSheetBuilder;