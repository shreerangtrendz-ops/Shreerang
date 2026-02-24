import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Printer, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const AdminSalesOrderPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        // Ensure we fetch the updated totals structure if possible, but '*' gets everything
        const { data } = await supabase
            .from('sales_orders')
            .select('*')
            .order('created_at', { ascending: false });
        setOrders(data || []);
        setLoading(false);
    };

    const getStatusVariant = (status) => {
        switch(status) {
            case 'draft': return 'secondary';
            case 'pending': return 'warning';
            case 'confirmed': return 'success';
            case 'rejected': return 'destructive';
            default: return 'outline';
        }
    };

    const filteredOrders = orders.filter(o => 
        (o.order_no && o.order_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.party_details?.name && o.party_details.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <>
            <Helmet><title>Sales Orders - Admin</title></Helmet>
            <div className="space-y-6">
                <AdminPageHeader 
                    title="Sales Orders" 
                    breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Sales Orders' }]}
                />

                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search order no, customer..." 
                            className="pl-9"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                         <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
                         <Button onClick={() => navigate('/sales-order')}><Plus className="mr-2 h-4 w-4" /> Create Order</Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell></TableRow>
                                ) : filteredOrders.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No orders found.</TableCell></TableRow>
                                ) : (
                                    filteredOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium font-mono">{order.order_no}</TableCell>
                                            <TableCell>{order.party_details?.name || 'Unknown'}</TableCell>
                                            <TableCell>{format(new Date(order.created_at), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(order.status)} className="capitalize">{order.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {order.discount > 0 && <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Disc</Badge>}
                                                    {order.pass_fold_benefit && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Fold</Badge>}
                                                    {order.gst_rate > 0 && <Badge variant="outline" className="text-xs">GST</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-lg">
                                                ₹{(order.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="icon" variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4 text-slate-500" /></Button>
                                                    <Button size="sm" variant="outline" onClick={() => navigate(`/sales-order/${order.id}`)}>View</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default AdminSalesOrderPage;