import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Eye, Filter, MessageCircle } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const SalesOrderDashboard = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sales_orders')
            .select('*, customers(name)')
            .order('created_at', { ascending: false });
        
        if (data) setOrders(data);
        setLoading(false);
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              order.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status) => {
        switch(status) {
            case 'Confirmed': return 'bg-green-100 text-green-700';
            case 'Draft': return 'bg-slate-100 text-slate-700';
            case 'Shipped': return 'bg-blue-100 text-blue-700';
            case 'Cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) return <LoadingSpinner fullHeight />;

    return (
        <div className="space-y-6">
            <Helmet><title>Sales Orders</title></Helmet>
            
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Sales Orders</h1>
                <Button onClick={() => navigate('/sales-order')}>
                    <Plus className="mr-2 h-4 w-4"/> Create Order
                </Button>
            </div>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                            <Input 
                                placeholder="Search order no. or customer..." 
                                className="pl-8"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Status:</span>
                            <select 
                                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option>All</option>
                                <option>Draft</option>
                                <option>Confirmed</option>
                                <option>Shipped</option>
                                <option>Delivered</option>
                                <option>Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order No</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders found.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono font-medium">{order.order_no}</TableCell>
                                            <TableCell>
                                                {order.order_source === 'whatsapp' ? (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 flex w-fit items-center gap-1">
                                                        <MessageCircle className="h-3 w-3"/> WhatsApp
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">Web</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>{order.customers?.name || order.party_details?.name || 'Unknown'}</TableCell>
                                            <TableCell>₹{order.total_amount}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(order.status)}>
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" onClick={() => navigate(`/sales-order/${order.id}`)}>
                                                    <Eye className="h-4 w-4 text-blue-500"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SalesOrderDashboard;