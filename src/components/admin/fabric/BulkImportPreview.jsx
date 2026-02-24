import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const BulkImportPreview = ({ data, errors }) => {
  const hasErrors = (rowIndex) => errors.some(e => e.row === rowIndex);
  const getRowErrors = (rowIndex) => errors.find(e => e.row === rowIndex)?.errors || [];

  return (
    <div className="border rounded-md">
      <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
        <h3 className="font-semibold">Import Preview</h3>
        <div className="flex gap-2 text-sm">
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> {data.length} Valid
          </span>
          <span className="text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {errors.length} Errors
          </span>
        </div>
      </div>
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Row</TableHead>
              <TableHead>Fabric Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Show Errors First */}
            {errors.map((err, idx) => (
              <TableRow key={`err-${idx}`} className="bg-red-50/50">
                <TableCell>{err.row}</TableCell>
                <TableCell>{err.data.name || err.data.fabric_name}</TableCell>
                <TableCell>{err.data.sku}</TableCell>
                <TableCell><Badge variant="destructive">Invalid</Badge></TableCell>
                <TableCell className="text-red-600 text-xs">
                  {err.errors.join(', ')}
                </TableCell>
              </TableRow>
            ))}
            {/* Show Valid Data */}
            {data.slice(0, 50).map((row, idx) => (
              <TableRow key={`valid-${idx}`}>
                <TableCell>{row.rowNum}</TableCell>
                <TableCell>{row.name || row.fabric_name}</TableCell>
                <TableCell>{row.sku}</TableCell>
                <TableCell><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ready</Badge></TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ))}
            {data.length > 50 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  ...and {data.length - 50} more valid rows
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default BulkImportPreview;