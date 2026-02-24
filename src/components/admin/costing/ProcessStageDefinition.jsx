import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROCESS_STAGES, STAGE_CODE_LABELS } from '@/lib/costing_constants';

const ProcessStageDefinition = () => {
  const getStageColor = (stageNum) => {
    if (stageNum === '0' || stageNum === '7') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (stageNum === '1') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Process Execution Order Definitions</CardTitle>
        <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full"></span> Mandatory</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded-full"></span> Core Coloring</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></span> Optional</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3 text-left font-semibold text-slate-600">Order</th>
                <th className="p-3 text-left font-semibold text-slate-600">Process Category</th>
                <th className="p-3 text-left font-semibold text-slate-600">Codes</th>
                <th className="p-3 text-left font-semibold text-slate-600">Industry Logic</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(PROCESS_STAGES).map(([stageNum, details]) => (
                <tr key={stageNum} className={`border-b border-slate-100 hover:bg-slate-50/50`}>
                  <td className="p-3 align-top font-mono text-slate-500">{stageNum}</td>
                  <td className="p-3 align-top font-medium">
                    <span className={`px-2 py-1 rounded-md text-xs border ${getStageColor(stageNum)}`}>
                        {details.name}
                    </span>
                  </td>
                  <td className="p-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {details.codes.map(code => (
                        <Badge key={code} variant="outline" className="text-[10px] font-mono">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 align-top text-slate-600 text-xs leading-relaxed">
                    {details.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessStageDefinition;