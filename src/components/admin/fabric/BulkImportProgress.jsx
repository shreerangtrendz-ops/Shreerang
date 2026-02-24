import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const BulkImportProgress = ({ 
  progress, 
  total, 
  current,
  successCount,
  errorCount,
  errors,
  isComplete,
  onClose
}) => {
  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
         <div className="flex justify-between text-sm font-medium">
             <span>{isComplete ? 'Import Completed' : 'Importing Data...'}</span>
             <span>{Math.round(progress)}%</span>
         </div>
         <Progress value={progress} className="h-2" />
         <p className="text-xs text-slate-500 text-center">
             {isComplete 
                ? `Processed ${total} items` 
                : `Processing item ${current} of ${total}`}
         </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg flex flex-col items-center border border-green-100">
             <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
             <span className="text-2xl font-bold text-green-700">{successCount}</span>
             <span className="text-xs text-green-600 uppercase font-semibold">Successful</span>
          </div>
          <div className="bg-red-50 p-4 rounded-lg flex flex-col items-center border border-red-100">
             <XCircle className="h-8 w-8 text-red-500 mb-2" />
             <span className="text-2xl font-bold text-red-700">{errorCount}</span>
             <span className="text-xs text-red-600 uppercase font-semibold">Failed</span>
          </div>
      </div>

      {errors.length > 0 && (
         <div className="border rounded-md">
             <div className="bg-red-50 px-4 py-2 text-sm font-medium text-red-700 border-b">
                 Error Log ({errors.length})
             </div>
             <ScrollArea className="h-[150px] p-2 bg-slate-50">
                 {errors.map((err, i) => (
                     <div key={i} className="text-xs text-red-600 mb-1 border-b border-red-100 last:border-0 pb-1">
                        {err.message}
                     </div>
                 ))}
             </ScrollArea>
         </div>
      )}

      {isComplete && (
          <Button onClick={onClose} className="w-full">
              Close
          </Button>
      )}
    </div>
  );
};

export default BulkImportProgress;