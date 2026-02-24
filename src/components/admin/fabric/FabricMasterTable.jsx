import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FabricMasterTable = ({ fabrics, selectedIds, onSelectAll, onSelectOne, onDelete, onEdit }) => {
  const navigate = useNavigate();

  const handleEdit = (id) => {
    if (onEdit) onEdit(id);
    else navigate(`/admin/fabric-master/${id}/edit`);
  };

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[50px] sticky left-0 bg-slate-50 z-10">
                <Checkbox 
                  checked={selectedIds.length === fabrics.length && fabrics.length > 0}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead className="sticky left-[50px] bg-slate-50 z-10 min-w-[150px] font-semibold text-slate-900">SKU</TableHead>
              <TableHead className="min-w-[200px]">Fabric Name</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>Finish</TableHead>
              <TableHead>Width</TableHead>
              <TableHead>GSM</TableHead>
              <TableHead>Construction</TableHead>
              <TableHead>Yarn</TableHead>
              <TableHead>HSN</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fabrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  No fabrics found.
                </TableCell>
              </TableRow>
            ) : (
              fabrics.map((fabric) => (
                <TableRow key={fabric.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="sticky left-0 bg-white z-10 group-hover:bg-slate-50">
                    <Checkbox 
                      checked={selectedIds.includes(fabric.id)}
                      onCheckedChange={(checked) => onSelectOne(fabric.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="sticky left-[50px] bg-white z-10 font-medium text-blue-600 group-hover:bg-slate-50">
                    {fabric.sku || '-'}
                  </TableCell>
                  <TableCell>{fabric.base_fabric_name}</TableCell>
                  <TableCell>{fabric.base}</TableCell>
                  <TableCell>{fabric.finish_type}</TableCell>
                  <TableCell>{fabric.width}</TableCell>
                  <TableCell>{fabric.gsm ? `${fabric.gsm} gsm` : '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{fabric.construction}</span>
                      <span className="text-xs text-muted-foreground">{fabric.construction_code}</span>
                    </div>
                  </TableCell>
                  <TableCell>{fabric.yarn_type} {fabric.yarn_count}</TableCell>
                  <TableCell>{fabric.hsn_code}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(fabric.id)}>
                        <Edit className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(fabric.id)}>
                        <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default FabricMasterTable;