import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const StockTransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTx = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('stock_transactions')
                .select('*, fabrics(fabric_name)')
                .order('created_at', { ascending: false });
            setTransactions(data || []);
            setLoading(false);
        };
        fetchTx();
    }, []);

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Fabric</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow>
                            ) : transactions.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transactions yet.</TableCell></TableRow>
                            ) : (
                                transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'MMM dd, HH:mm')}</TableCell>
                                        <TableCell>{tx.fabrics?.fabric_name}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                tx.transaction_type === 'In' ? 'bg-green-100 text-green-700' :
                                                tx.transaction_type === 'Out' ? 'bg-orange-100 text-orange-700' :
                                                tx.transaction_type === 'Damage' ? 'bg-red-100 text-red-700' : 'bg-slate-100'
                                            }`}>
                                                {tx.transaction_type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-mono">{tx.quantity}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{tx.notes || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
export default StockTransactionsPage;