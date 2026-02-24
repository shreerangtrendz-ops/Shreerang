import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Eye, CheckCircle } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function CompletedOrdersPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCompletedOrders();
    }, []);

    const fetchCompletedOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sales_orders')
            .select(`
                *,
                customer:customers(name),
                agent:agents(agent_name)
            `)
            .eq('order_status', 'completed')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error(error);
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };

    const filtered = orders.filter(o => 
        o.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <Helmet><title>Completed Orders</title></Helmet>
            <AdminPageHeader 
                title="Completed Orders" 
                breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Completed Orders' }]} 
            />

            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search Order # or Firm..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Firm</TableHead>
                                <TableHead>Order Date</TableHead>
                                <TableHead>Completed Date</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Agent</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No completed orders found.</TableCell></TableRow>
                            ) : (
                                filtered.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                {order.order_no}
                                            </div>
                                        </TableCell>
                                        <TableCell>{order.customer?.name}</TableCell>
                                        <TableCell>{format(new Date(order.created_at), 'dd MMM yyyy')}</TableCell>
                                        <TableCell>{format(new Date(order.updated_at), 'dd MMM yyyy')}</TableCell>
                                        <TableCell className="font-medium">₹{order.total_amount?.toFixed(2)}</TableCell>
                                        <TableCell>{order.agent?.agent_name || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/sales-order/${order.id}`)}>
                                                <Eye className="h-4 w-4 mr-1" /> View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}