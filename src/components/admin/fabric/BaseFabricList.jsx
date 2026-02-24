import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const BaseFabricList = ({ data, onDelete, selectedIds = [], onSelectOne, onSelectAll }) => {
    const navigate = useNavigate();

    if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No Base Fabrics found.</div>;

    const allSelected = data.length > 0 && data.every(item => selectedIds.includes(item.id));
    const someSelected = data.some(item => selectedIds.includes(item.id));

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead className="w-[50px]">
                            <Checkbox 
                                checked={allSelected}
                                onCheckedChange={(checked) => onSelectAll && onSelectAll(checked)}
                                className={cn(someSelected && !allSelected && "opacity-50")}
                            />
                        </TableHead>
                        <TableHead>Fabric Name</TableHead>
                        <TableHead>HSN Code</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Specs</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                            <TableRow 
                                key={item.id} 
                                className={cn("hover:bg-slate-50 transition-colors cursor-pointer", isSelected && "bg-blue-50/50")}
                                onClick={() => onSelectOne && onSelectOne(item.id, !isSelected)}
                            >
                                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox 
                                        checked={isSelected}
                                        onCheckedChange={(checked) => onSelectOne && onSelectOne(item.id, checked)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{item.base_fabric_name}</TableCell>
                                <TableCell className="font-mono text-xs">{item.hsn_code}</TableCell>
                                <TableCell>{item.base}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {item.width ? `${item.width}"` : ''} {item.gsm ? `| ${item.gsm} GSM` : ''}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={item.ready_stock ? "success" : "outline"} className={item.ready_stock ? "bg-green-100 text-green-800" : "text-slate-500"}>
                                        {item.ready_stock ? 'Ready' : 'Out'}
                                    </Badge>
                                </TableCell>
                                <TableCell><StatusBadge status={item.status} /></TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/fabric-master/${item.id}`)}>
                                        <Edit2 className="h-4 w-4 text-slate-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

export default BaseFabricList;