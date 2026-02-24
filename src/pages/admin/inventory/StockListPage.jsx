import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2, Edit } from 'lucide-react';
import StockEditDialog from '@/components/admin/inventory/StockEditDialog';

const StockListPage = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        setLoading(true);
        // Joining fabric_stock with fabrics
        const { data, error } = await supabase
            .from('fabric_stock')
            .select(`
                *,
                fabrics ( id, fabric_name, base_type, width )
            `)
            .order('last_updated_date', { ascending: false });
        
        if (data) setStock(data);
        setLoading(false);
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setIsEditOpen(true);
    };

    const handleStockUpdate = () => {
        fetchStock();
        setIsEditOpen(false);
    };

    const filteredStock = stock.filter(item => 
        item.fabrics?.fabric_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.fabrics?.base_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                    <Input placeholder="Search fabrics..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="text-sm text-muted-foreground">Total: {filteredStock.length} items</div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fabric Name</TableHead>
                                <TableHead>Base Type</TableHead>
                                <TableHead>Ready Stock</TableHead>
                                <TableHead>WIP Stock</TableHead>
                                <TableHead>Damage</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow>
                            ) : filteredStock.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No stock records found. Import data first.</TableCell></TableRow>
                            ) : (
                                filteredStock.map(item => {
                                    const total = (item.ready_stock || 0) + (item.wip_stock || 0);
                                    const isLow = total < 50; // Mock threshold
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.fabrics?.fabric_name}</TableCell>
                                            <TableCell>{item.fabrics?.base_type}</TableCell>
                                            <TableCell className="font-mono">{item.ready_stock} m</TableCell>
                                            <TableCell className="font-mono">{item.wip_stock} m</TableCell>
                                            <TableCell className="text-red-500 font-mono">{item.damage_stock} m</TableCell>
                                            <TableCell>
                                                {isLow ? <Badge variant="destructive">Low</Badge> : <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">OK</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                                                    <Edit className="h-4 w-4 text-blue-500"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedItem && (
                <StockEditDialog 
                    open={isEditOpen} 
                    onOpenChange={setIsEditOpen} 
                    item={selectedItem} 
                    onSuccess={handleStockUpdate} 
                />
            )}
        </div>
    );
};

export default StockListPage;