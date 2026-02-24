import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, FileDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateCSVFromErrors } from '@/lib/bulkImportHelpers';

const ImportValidationReport = ({ validationResult, onRetry, onProceed }) => {
  const { valid, errors, warnings } = validationResult || { valid: false, errors: [], warnings: [] };
  const totalItems = (validationResult?.total || 0);
  const errorCount = errors.length;
  const warningCount = warnings.length;
  const successRate = totalItems > 0 ? ((totalItems - errorCount) / totalItems) * 100 : 0;

  const downloadReport = () => {
    const csvContent = generateCSVFromErrors([...errors, ...warnings]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'validation_errors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {valid ? <CheckCircle2 className="text-green-500" /> : <AlertCircle className="text-red-500" />}
          Validation Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-slate-50 rounded">
            <div className="text-2xl font-bold">{totalItems}</div>
            <div className="text-xs text-slate-500">Total Rows</div>
          </div>
          <div className="p-4 bg-green-50 rounded text-green-700">
            <div className="text-2xl font-bold">{totalItems - errorCount}</div>
            <div className="text-xs">Valid</div>
          </div>
          <div className="p-4 bg-red-50 rounded text-red-700">
            <div className="text-2xl font-bold">{errorCount}</div>
            <div className="text-xs">Errors</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded text-yellow-700">
            <div className="text-2xl font-bold">{warningCount}</div>
            <div className="text-xs">Warnings</div>
          </div>
        </div>

        <div className="space-y-2">
           <div className="flex justify-between text-sm">
             <span>Data Health</span>
             <span>{Math.round(successRate)}%</span>
           </div>
           <Progress value={successRate} className={successRate < 100 ? "bg-red-100" : "bg-green-100"} />
        </div>

        {(errors.length > 0 || warnings.length > 0) && (
          <ScrollArea className="h-[300px] border rounded p-4">
             {errors.map((err, i) => (
               <div key={`err-${i}`} className="flex gap-4 p-2 border-b last:border-0 text-sm hover:bg-slate-50">
                  <span className="font-mono text-red-600 w-16">Row {err.row_number}</span>
                  <span className="font-semibold text-slate-700 w-32">{err.field_name}</span>
                  <span className="text-slate-600">{err.error_message}</span>
               </div>
             ))}
             {warnings.map((warn, i) => (
               <div key={`warn-${i}`} className="flex gap-4 p-2 border-b last:border-0 text-sm hover:bg-slate-50">
                  <span className="font-mono text-yellow-600 w-16">Row {warn.row_number}</span>
                  <span className="font-semibold text-slate-700 w-32">{warn.field_name}</span>
                  <span className="text-slate-600">{warn.warning_message}</span>
               </div>
             ))}
          </ScrollArea>
        )}

        <div className="flex justify-between pt-4 border-t">
           <div className="flex gap-2">
              <Button variant="outline" onClick={onRetry}>Back to Mapping</Button>
              {(errors.length > 0 || warnings.length > 0) && (
                <Button variant="outline" onClick={downloadReport}>
                   <FileDown className="mr-2 h-4 w-4" /> Download Report
                </Button>
              )}
           </div>
           <Button onClick={onProceed} disabled={!valid} className={valid ? "bg-green-600 hover:bg-green-700" : ""}>
              {valid ? "Start Import" : "Fix Errors to Proceed"}
           </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImportValidationReport;