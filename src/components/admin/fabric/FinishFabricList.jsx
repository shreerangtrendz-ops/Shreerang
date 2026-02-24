import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useNavigate } from 'react-router-dom';

const FinishFabricList = ({ data, onDelete }) => {
    const navigate = useNavigate();

    if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No Finish Fabrics found.</div>;

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Finish Name</TableHead>
                        <TableHead>Base Fabric</TableHead>
                        <TableHead>Process</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span>{item.finish_fabric_name}</span>
                                    {item.design_image_url && <span className="text-[10px] text-blue-600 flex items-center gap-1"><ImageIcon className="h-3 w-3"/> Has Image</span>}
                                </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.base_fabrics?.base_fabric_name || '-'}</TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="text-xs">{item.process}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={item.ready_stock ? "success" : "outline"} className={item.ready_stock ? "bg-green-100 text-green-800" : "text-slate-500"}>
                                    {item.ready_stock ? 'Ready' : 'Out'}
                                </Badge>
                            </TableCell>
                            <TableCell><StatusBadge status={item.status} /></TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/fabric-master/finish/${item.id}`)}>
                                    <Edit2 className="h-4 w-4 text-slate-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default FinishFabricList;