import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const FabricSpecificationTable = ({ fabric, className }) => {
  if (!fabric) return null;

  const data = [
    { label: 'Base Fabric Name', value: fabric.base_fabric_name, className: 'font-medium' },
    { label: 'Fabric Name', value: fabric.fabric_name || fabric.base_fabric_name?.split(' ').slice(1, -1).join(' ') || '-' },
    { label: 'Finish', value: fabric.finish_type },
    { label: 'Width', value: fabric.width },
    { label: 'Base', value: fabric.base },
    { label: 'Base Code', value: fabric.base_code },
    { label: 'Weight', value: fabric.weight ? `${fabric.weight} kg/mtr` : '-' },
    { label: 'GSM', value: fabric.gsm },
    { label: 'GSM Tolerance', value: fabric.gsm_tolerance },
    { label: 'Construction', value: fabric.construction },
    { label: 'Const. Code', value: fabric.construction_code },
    { label: 'Stretch', value: fabric.stretchability },
    { label: 'Transparency', value: fabric.transparency },
    { label: 'Handfeel', value: fabric.handfeel },
    { label: 'HSN Code', value: fabric.hsn_code },
    { label: 'Yarn Type', value: fabric.yarn_type },
    { label: 'Yarn Count', value: fabric.yarn_count },
  ];

  return (
    <div className={cn("border rounded-md overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            {data.map((item, index) => (
              <TableHead key={index} className="whitespace-nowrap px-4 py-3 h-auto text-xs font-bold text-slate-700 uppercase tracking-wider border-r last:border-r-0">
                {item.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            {data.map((item, index) => (
              <TableCell key={index} className={cn("whitespace-nowrap px-4 py-3 border-r last:border-r-0 text-sm text-slate-600", item.className)}>
                {item.value || '-'}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default FabricSpecificationTable;