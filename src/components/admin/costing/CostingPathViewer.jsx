import React, { useState, useEffect } from 'react';
import { CostingPathService } from '@/services/CostingPathService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { PROCESS_STAGES } from '@/lib/costing_constants';

const CostingPathViewer = () => {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPaths = async () => {
    setLoading(true);
    try {
      await CostingPathService.initializeDefaultPaths();
      const data = await CostingPathService.getAllPaths();
      setPaths(data);
    } catch (error) {
      console.error("Failed to load paths", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaths();
  }, []);

  const getStageBadge = (item) => {
    let stageNum = null;
    let label = item;

    if (typeof item === 'number') stageNum = String(item);
    else if (item === "STAGE1") { stageNum = "1"; label = "Core Coloring"; }
    else if (item === "DP" || item === "MP" || item === "SLD") {
         const found = Object.entries(PROCESS_STAGES).find(([k,v]) => v.codes.includes(item));
         if(found) stageNum = found[0];
    }

    if (!stageNum) return <Badge variant="outline">{label}</Badge>;

    const def = PROCESS_STAGES[stageNum];
    let colorClass = "bg-slate-100 text-slate-700";
    if (stageNum === '0' || stageNum === '7') colorClass = "bg-blue-100 text-blue-800 border-blue-200";
    else if (stageNum === '1') colorClass = "bg-red-100 text-red-800 border-red-200";
    else colorClass = "bg-green-100 text-green-800 border-green-200";

    return (
        <Badge key={label} className={`mr-1 mb-1 border ${colorClass} hover:${colorClass}`}>
            <span className="mr-1 opacity-50">{stageNum}:</span> {label}
        </Badge>
    );
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Costing Paths & Execution Order</h2>
        <Button size="sm" variant="outline" onClick={loadPaths}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paths.map((path) => (
          <Card key={path.id} className="hover:shadow-md transition-shadow border-t-4 border-t-indigo-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="mb-2 bg-white">Path {path.path_number}</Badge>
              </div>
              <CardTitle className="text-lg">{path.path_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4 h-10">{path.description}</p>
              
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Execution Sequence</p>
                <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    {path.execution_order && Array.isArray(path.execution_order) ? (
                        path.execution_order.map((item, i) => (
                            <div key={i} className="flex items-center">
                                {getStageBadge(item)}
                                {i < path.execution_order.length - 1 && <span className="text-slate-300 mx-1">→</span>}
                            </div>
                        ))
                    ) : <span className="text-xs italic text-slate-400">No execution order defined</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CostingPathViewer;