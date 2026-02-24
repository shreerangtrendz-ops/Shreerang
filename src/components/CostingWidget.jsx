import React, { useState, useEffect } from 'react';
import { CostingEngine, HistoryManager } from '@/logic/ShreerangEngine';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Save, Calculator, Share2, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { CostingService } from '@/services/CostingService';

// Instantiate engines
const engine = new CostingEngine();
const historyManager = new HistoryManager();

const CostingWidget = ({ onSaveTemplate, savedTemplates = [], onLoadTemplate, className, onShareWhatsApp }) => {
  const { toast } = useToast();
  
  // New state structure
  const [inputs, setInputs] = useState({
    greyRate: '',
    greyShrink: '',
    
    dyeingRate: '',
    dyeingShrink: '',
    
    schiffliRate: '',
    
    finishRate: '',
    finishShrink: ''
  });

  const [result, setResult] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [historicalAverages, setHistoricalAverages] = useState({});

  useEffect(() => {
    // Initial load or history update
    updateHistoryDisplay();
  }, []);

  const updateHistoryDisplay = () => {
    const stages = engine.getProcessStages();
    const averages = {};
    stages.forEach(stage => {
      averages[stage.id] = historyManager.getAverageRate(stage.id);
    });
    setHistoricalAverages(averages);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculate = () => {
    try {
      const calculation = engine.calculateBatchCost(inputs);
      setResult(calculation);

      // Add to history
      if (inputs.greyRate) historyManager.addRate('grey', inputs.greyRate);
      if (inputs.dyeingRate) historyManager.addRate('dyeing', inputs.dyeingRate);
      if (inputs.schiffliRate) historyManager.addRate('schiffli', inputs.schiffliRate);
      if (inputs.finishRate) historyManager.addRate('finish', inputs.finishRate);
      
      updateHistoryDisplay();
      
      return calculation;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Calculation Error",
        description: error.message
      });
      return null;
    }
  };

  const handleCalculate = () => {
    calculate();
    toast({ title: "Updated", description: "Cost calculation refreshed." });
  };

  const handleReset = () => {
    setInputs({
      greyRate: '', greyShrink: '',
      dyeingRate: '', dyeingShrink: '',
      schiffliRate: '',
      finishRate: '', finishShrink: ''
    });
    setResult(null);
    setTemplateName('');
  };

  const handleSave = () => {
    if (!templateName) {
      toast({ variant: "destructive", title: "Template Name Required" });
      return;
    }
    if (onSaveTemplate) {
      onSaveTemplate(templateName, inputs);
    }
  };

  const handleWhatsAppShare = () => {
    let currentResult = result;
    if (!currentResult) {
      currentResult = calculate();
    }
    
    if (currentResult && onShareWhatsApp) {
      onShareWhatsApp(currentResult, inputs);
    }
  };

  const foldLessPct = CostingService.calculateFoldLessPct(100, inputs.greyShrink);

  return (
    <Card className={cn("w-full shadow-lg border-slate-200 rounded-xl overflow-hidden", className)}>
      {/* Enhanced Header */}
      <div className="bg-indigo-900 text-white p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-indigo-300" />
              Shreerang Costing
            </h2>
            <p className="text-indigo-200 text-sm mt-1">Batch Simulation (1000m Base)</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-300 uppercase tracking-wider font-medium">Net Cost / Meter</p>
            <p className="text-3xl font-bold font-mono tracking-tight">
              {result ? `₹${result.totalCost}` : '---'}
            </p>
          </div>
        </div>
      </div>
      
      <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Grey Section */}
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-slate-400 rounded-full"></span>
                Grey Fabric
              </h3>
              {inputs.greyShrink && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                  Fold Less: {foldLessPct}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Rate (₹)</Label>
                <Input 
                  name="greyRate" type="number" 
                  value={inputs.greyRate} onChange={handleInputChange}
                  placeholder="0.00"
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Shrinkage %</Label>
                <Input 
                  name="greyShrink" type="number" 
                  value={inputs.greyShrink} onChange={handleInputChange}
                  placeholder="0%"
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          {/* Process Rates Section */}
          <div className="bg-white p-1">
             <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                Process Rates
             </h3>
             <div className="space-y-5">
               
               {/* Dyeing */}
               <div className="grid grid-cols-12 gap-4 items-end">
                 <div className="col-span-3 text-sm font-medium text-slate-600 pt-3">Dyeing</div>
                 <div className="col-span-5 space-y-1">
                    <Label className="text-xs text-slate-400">Rate (₹)</Label>
                    <Input name="dyeingRate" type="number" value={inputs.dyeingRate} onChange={handleInputChange} placeholder="0" />
                 </div>
                 <div className="col-span-4 space-y-1">
                    <Label className="text-xs text-slate-400">Shrink %</Label>
                    <Input name="dyeingShrink" type="number" value={inputs.dyeingShrink} onChange={handleInputChange} placeholder="0" />
                 </div>
               </div>

               {/* Schiffli */}
               <div className="grid grid-cols-12 gap-4 items-end">
                 <div className="col-span-3 text-sm font-medium text-slate-600 pt-3">Schiffli</div>
                 <div className="col-span-9 space-y-1">
                    <Label className="text-xs text-slate-400">Rate (₹)</Label>
                    <Input name="schiffliRate" type="number" value={inputs.schiffliRate} onChange={handleInputChange} placeholder="0" />
                 </div>
               </div>

               {/* Finishing */}
               <div className="grid grid-cols-12 gap-4 items-end">
                 <div className="col-span-3 text-sm font-medium text-slate-600 pt-3">Finishing</div>
                 <div className="col-span-5 space-y-1">
                    <Label className="text-xs text-slate-400">Rate (₹)</Label>
                    <Input name="finishRate" type="number" value={inputs.finishRate} onChange={handleInputChange} placeholder="0" />
                 </div>
                 <div className="col-span-4 space-y-1">
                    <Label className="text-xs text-slate-400">Shrink %</Label>
                    <Input name="finishShrink" type="number" value={inputs.finishShrink} onChange={handleInputChange} placeholder="0" />
                 </div>
               </div>

             </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCalculate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              Calculate Cost
            </Button>
            <Button variant="outline" onClick={handleReset} className="w-12 px-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-lg">
             <Input 
                placeholder="Template Name..." 
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="bg-white h-9"
             />
             <Button variant="outline" size="sm" onClick={handleSave} disabled={!templateName} className="gap-2 h-9">
               <Save className="h-4 w-4" /> Save
             </Button>
          </div>

        </div>

        {/* Right Column: Breakdown */}
        <div className="lg:col-span-5">
          <Card className="h-full border-indigo-100 bg-white shadow-sm flex flex-col">
            <CardHeader className="pb-2 border-b border-indigo-50 bg-indigo-50/30">
              <CardTitle className="text-lg text-indigo-900">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {result ? (
                <div className="flex flex-col h-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 hover:bg-transparent">
                        <TableHead className="w-[120px] pl-4 h-10 text-xs uppercase tracking-wider text-slate-500 font-semibold">Stage</TableHead>
                        <TableHead className="text-right h-10 text-xs uppercase tracking-wider text-slate-500 font-semibold">Cost (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-b border-slate-50">
                        <TableCell className="pl-4 py-3">
                          <div className="font-medium text-slate-700">Grey Input</div>
                          <div className="text-xs text-slate-400">1000m @ {inputs.greyRate || 0}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono py-3">
                          {result.breakdown.grey.amount}
                        </TableCell>
                      </TableRow>
                      
                      <TableRow className="border-b border-slate-50">
                        <TableCell className="pl-4 py-3">
                          <div className="font-medium text-slate-700">Dyeing</div>
                          <div className="text-xs text-slate-400">On {result.breakdown.grey.outputQty}m</div>
                        </TableCell>
                        <TableCell className="text-right font-mono py-3">
                          {result.breakdown.dyeing.amount}
                        </TableCell>
                      </TableRow>

                      <TableRow className="border-b border-slate-50">
                        <TableCell className="pl-4 py-3">
                          <div className="font-medium text-slate-700">Schiffli</div>
                          <div className="text-xs text-slate-400">On {result.breakdown.dyeing.outputQty}m</div>
                        </TableCell>
                        <TableCell className="text-right font-mono py-3">
                          {result.breakdown.schiffli.amount}
                        </TableCell>
                      </TableRow>

                      <TableRow className="border-b border-slate-50">
                        <TableCell className="pl-4 py-3">
                          <div className="font-medium text-slate-700">Finishing</div>
                          <div className="text-xs text-slate-400">On {result.breakdown.schiffli.outputQty}m</div>
                        </TableCell>
                        <TableCell className="text-right font-mono py-3">
                          {result.breakdown.finish.amount}
                        </TableCell>
                      </TableRow>

                      <TableRow className="bg-indigo-50/50">
                        <TableCell className="pl-4 py-4 font-bold text-indigo-900">Total Batch</TableCell>
                        <TableCell className="text-right py-4 font-bold font-mono text-indigo-900">{result.totalBatchCost}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="mt-auto p-4 space-y-3 bg-indigo-900/5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Final Yield (1000m In)</span>
                      <span className="font-bold text-slate-900">{result.finalQty} meters</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Yield Percentage</span>
                      <span className={`font-bold ${result.yieldPercentage < 85 ? 'text-orange-600' : 'text-green-600'}`}>
                        {result.yieldPercentage}%
                      </span>
                    </div>
                    
                    <Button 
                      onClick={handleWhatsAppShare}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm"
                    >
                      <MessageCircle className="h-4 w-4" /> Share via WhatsApp
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <div className="bg-slate-50 p-4 rounded-full mb-3">
                     <Calculator className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium">Enter rates to see cost breakdown</p>
                  <p className="text-xs mt-1 max-w-[180px]">Calculations are based on a simulated 1000m batch run.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default CostingWidget;