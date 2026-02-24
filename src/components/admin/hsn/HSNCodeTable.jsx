import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const HSNCodeTable = ({ data, nameField, onEdit, onDelete }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
        No HSN codes found. Add one to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{nameField}</TableHead>
            <TableHead>HSN Code</TableHead>
            <TableHead>GST Rate</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.process_name || item.value_addition_name || item.expense_name || item.garment_name}</TableCell>
              <TableCell className="font-mono text-blue-600">{item.hsn_code}</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-slate-50">{item.gst_rate}%</Badge>
              </TableCell>
              <TableCell className="max-w-[300px] truncate text-slate-500 text-sm">{item.hsn_code_description || '-'}</TableCell>
              <TableCell>
                 <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className={item.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                    {item.status}
                 </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                    <Edit2 className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default HSNCodeTable;