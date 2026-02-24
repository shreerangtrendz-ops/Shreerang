import React from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROCESS_STAGES, STAGE_CODE_LABELS } from '@/lib/costing_constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ExecutionOrderFlow = ({ 
  executionOrder = [], 
  stageParams = {}, 
  onParamChange, 
  onStageSelect,
  activeStageSelections = {} 
}) => {
  // executionOrder is an array like [0, "STAGE1", 3, 4, 7] or [0, "DP", 7]

  const getStageDisplay = (item, index) => {
    let stageNum = null;
    let stageCode = null;
    let isChoice = false;

    // Determine if item is a number (stage number) or string (specific code or STAGE1)
    if (typeof item === 'number' || !isNaN(Number(item))) {
        stageNum = String(item);
    } else {
        // It's a string code
        if (item === "STAGE1") {
            stageNum = "1";
            isChoice = true;
        } else {
            // It's a specific code like "DP", "MP"
            // Find which stage this code belongs to
            const foundStage = Object.entries(PROCESS_STAGES).find(([k, v]) => v.codes.includes(item));
            if (foundStage) {
                stageNum = foundStage[0];
                stageCode = item;
            }
        }
    }

    if (!stageNum) return null;

    const stageDef = PROCESS_STAGES[stageNum];
    const isMandatory = stageDef.isMandatory || (stageNum === '0' || stageNum === '7');
    const isCore = stageNum === '1';

    const currentSelection = stageCode || activeStageSelections[index] || (isChoice ? null : (stageDef.isExclusive ? null : []));
    
    // Determine card style based on type
    let borderColor = "border-slate-200";
    let badgeColor = "bg-slate-100 text-slate-600";
    
    if (isMandatory) {
        borderColor = "border-blue-300 shadow-blue-50";
        badgeColor = "bg-blue-100 text-blue-700";
    } else if (isCore) {
        borderColor = "border-red-300 shadow-red-50";
        badgeColor = "bg-red-100 text-red-700";
    } else {
        borderColor = "border-green-300 shadow-green-50";
        badgeColor = "bg-green-100 text-green-700";
    }

    return (
      <div key={`step-${index}`} className="flex flex-col items-center w-full max-w-4xl mx-auto">
        {/* Connector Arrow */}
        {index > 0 && (
          <div className="h-8 border-l-2 border-slate-300 border-dashed my-1 relative">
             <div className="absolute top-1/2 left-4 text-[10px] text-slate-400 font-mono -translate-y-1/2 whitespace-nowrap bg-white px-1">
                Next Stage
             </div>
          </div>
        )}

        {/* Stage Card */}
        <Card className={`w-full ${borderColor} border-l-4 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md`}>
            <div className="absolute top-0 right-0 p-2 opacity-10 font-bold text-4xl">{stageNum}</div>
            
            <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                
                {/* Header Info */}
                <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={badgeColor}>{stageDef.name}</Badge>
                        {stageCode && <Badge variant="outline" className="font-mono">{stageCode}</Badge>}
                        {isChoice && <Badge variant="outline" className="border-dashed border-red-400 text-red-500">Selection Required</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">{stageDef.description}</p>
                </div>

                {/* Inputs for Rate & Shrinkage */}
                <div className="flex gap-3 w-full md:w-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500 uppercase">Rate (₹)</Label>
                        <Input 
                            type="number" 
                            className="h-8 w-24 bg-white text-right font-mono" 
                            placeholder="0.00"
                            value={stageParams[index]?.rate || ''}
                            onChange={(e) => onParamChange(index, 'rate', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500 uppercase">Shrink %</Label>
                        <Input 
                            type="number" 
                            className="h-8 w-20 bg-white text-right font-mono" 
                            placeholder="0%"
                            value={stageParams[index]?.shrink || ''}
                            onChange={(e) => onParamChange(index, 'shrink', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Selection UI if needed */}
            {isChoice && (
                <div className="bg-slate-50 border-t p-3">
                   <Label className="text-xs font-semibold mb-2 block">Select Specific Process:</Label>
                   <div className="flex flex-wrap gap-2">
                        {stageDef.codes.map(c => (
                            <button
                                key={c}
                                onClick={() => onStageSelect(index, c)}
                                className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                                    activeStageSelections[index] === c 
                                    ? 'bg-slate-800 text-white border-slate-800' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}
                            >
                                <span className="font-bold mr-1">{c}</span> {STAGE_CODE_LABELS[c]}
                            </button>
                        ))}
                   </div>
                </div>
            )}
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-1 py-4">
      <div className="flex flex-col items-center">
        {/* Start Point */}
        <div className="bg-slate-800 text-white text-xs px-3 py-1 rounded-full mb-2 font-medium shadow-lg">
            Grey Input (1000m Base)
        </div>
        <ArrowDown className="h-4 w-4 text-slate-400 mb-1" />
        
        {executionOrder.map((item, index) => getStageDisplay(item, index))}

        {/* End Point */}
        <div className="h-8 border-l-2 border-slate-300 border-dashed my-1"></div>
        <div className="bg-indigo-600 text-white text-xs px-4 py-1.5 rounded-full mt-1 font-medium shadow-lg flex items-center gap-2">
            Final Output <ArrowRight className="h-3 w-3" /> Saleable Meters
        </div>
      </div>
    </div>
  );
};

export default ExecutionOrderFlow;