import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useNavigate } from 'react-router-dom';

const FancyFinishList = ({ data, onDelete }) => {
    const navigate = useNavigate();

    if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No Fancy Fabrics found.</div>;

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fancy Name</TableHead>
                        <TableHead>Parent Finish</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.fancy_finish_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.finish_fabrics?.finish_fabric_name || '-'}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">{item.value_addition_type}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={item.ready_stock ? "success" : "outline"} className={item.ready_stock ? "bg-green-100 text-green-800" : "text-slate-500"}>
                                    {item.ready_stock ? 'Ready' : 'Out'}
                                </Badge>
                            </TableCell>
                            <TableCell><StatusBadge status={item.status} /></TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/fabric-master/fancy/${item.id}`)}>
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

export default FancyFinishList;