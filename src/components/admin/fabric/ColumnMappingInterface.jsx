import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRequiredFieldsForType, getOptionalFieldsForType } from '@/lib/bulkImportHelpers';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ColumnMappingInterface = ({ importType, excelColumns, excelData, onMappingComplete, onBack }) => {
  const requiredFields = getRequiredFieldsForType(importType);
  const optionalFields = getOptionalFieldsForType(importType);
  const allFields = [...requiredFields, ...optionalFields];

  const [mapping, setMapping] = useState({});
  const [error, setError] = useState('');

  // Auto-map based on exact name matches
  useEffect(() => {
    const initialMapping = {};
    allFields.forEach(field => {
      const match = excelColumns.find(col => col.toLowerCase().trim() === field.toLowerCase().trim());
      if (match) {
        initialMapping[field] = match;
      }
    });
    setMapping(initialMapping);
  }, [excelColumns, importType]);

  const handleMapChange = (field, value) => {
    setMapping(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleConfirm = () => {
    // Validate required fields
    const missing = requiredFields.filter(field => !mapping[field]);
    if (missing.length > 0) {
      setError(`Please map all required fields: ${missing.join(', ')}`);
      return;
    }
    onMappingComplete(mapping);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Map Excel Columns to System Fields</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700">Required Fields</h3>
              {requiredFields.map(field => (
                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                  <Label className="text-right">{field} <span className="text-red-500">*</span></Label>
                  <Select value={mapping[field] || ''} onValueChange={(val) => handleMapChange(field, val)}>
                    <SelectTrigger><SelectValue placeholder="Select Excel Column" /></SelectTrigger>
                    <SelectContent>
                      {excelColumns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              
              <div className="pt-4"><h3 className="font-medium text-slate-700">Optional Fields</h3></div>
              {optionalFields.map(field => (
                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                  <Label className="text-right text-slate-500">{field}</Label>
                  <Select value={mapping[field] || ''} onValueChange={(val) => handleMapChange(field, val)}>
                    <SelectTrigger><SelectValue placeholder="Select Excel Column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Skip --</SelectItem>
                      {excelColumns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="space-y-4">
               <h3 className="font-medium text-slate-700">Preview Data (First 3 Rows)</h3>
               <div className="border rounded overflow-hidden">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Field</TableHead>
                       <TableHead>Mapped To</TableHead>
                       <TableHead>Sample Value</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {allFields.map(field => (
                       <TableRow key={field}>
                         <TableCell className="font-medium">{field}</TableCell>
                         <TableCell className="text-slate-500">{mapping[field] || '-'}</TableCell>
                         <TableCell>
                           {mapping[field] && excelData.length > 0 ? excelData[0][mapping[field]] : '-'}
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
            </div>
          </div>
          
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="flex justify-between pt-4 border-t">
             <Button variant="outline" onClick={onBack}>Back</Button>
             <Button onClick={handleConfirm} disabled={!excelColumns.length}>Next: Validate Data</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColumnMappingInterface;