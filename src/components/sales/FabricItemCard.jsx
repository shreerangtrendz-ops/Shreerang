import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getCompletionStats, getFabricItemName } from '@/lib/fabricCompletion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const FabricItemCard = ({ item, type, onAdd, onEdit, parentName }) => {
  const { percentage, missingFields, statusColor, isComplete } = getCompletionStats(item, type);
  const itemName = getFabricItemName(item, type);

  return (
    <Card className="mb-2 border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: isComplete ? '#22c55e' : '#ef4444' }}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              {itemName}
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Missing required fields</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </h4>
            {parentName && <p className="text-xs text-muted-foreground">Base: {parentName}</p>}
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAdd(item, type)}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 w-20">Completion:</span>
            <Progress value={percentage} className={`h-2 w-24 ${statusColor}`} />
            <span className="font-medium">{percentage}%</span>
          </div>

          {missingFields.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {missingFields.map((f, i) => (
                <Badge key={i} variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-100 px-1 py-0 h-4">
                  Missing: {f.field.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
             {/* Show key specs based on type */}
             {type === 'base_fabric' && (
                <>
                    <span className="bg-slate-100 px-1 rounded">HSN: {item.hsn_code || '-'}</span>
                    <span className="bg-slate-100 px-1 rounded">Width: {item.width || '-'}</span>
                </>
             )}
             {type === 'finish_fabric' && (
                <>
                    <span className="bg-slate-100 px-1 rounded">{item.process}</span>
                    <span className="bg-slate-100 px-1 rounded">{item.process_type}</span>
                </>
             )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FabricItemCard;