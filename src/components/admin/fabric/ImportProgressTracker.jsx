import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const ImportProgressTracker = ({ progress, onComplete, isComplete }) => {
  const { total, current, success, failed, errors } = progress;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Card className="max-w-3xl mx-auto text-center">
      <CardHeader>
        <CardTitle className="flex justify-center items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          )}
          {isComplete ? "Import Completed" : "Importing Data..."}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-4xl font-bold text-slate-800">
          {percentage}%
        </div>
        <Progress value={percentage} className="h-4" />
        
        <div className="grid grid-cols-3 gap-4 text-sm font-medium">
           <div className="text-slate-600">Total: {total}</div>
           <div className="text-green-600">Success: {success}</div>
           <div className="text-red-600">Failed: {failed}</div>
        </div>

        {errors.length > 0 && (
           <div className="text-left border rounded-md p-4 bg-red-50">
             <h4 className="font-semibold text-red-800 mb-2">Errors Occurred</h4>
             <ScrollArea className="h-40">
                {errors.map((e, i) => (
                  <div key={i} className="text-xs text-red-700 border-b border-red-100 py-1 last:border-0">
                    Row {e.row_number}: {e.error_message}
                  </div>
                ))}
             </ScrollArea>
           </div>
        )}

        {isComplete && (
           <Button onClick={onComplete} className="w-full bg-blue-600 hover:bg-blue-700">
             View Import Summary
           </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ImportProgressTracker;