import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Truck, Eye } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import DispatchModal from '@/components/admin/sales/DispatchModal';
import { useToast } from '@/components/ui/use-toast';

export default function PendingOrdersPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDispatchOpen, setIsDispatchOpen] = useState(false);

    useEffect(() => {
        fetchPendingOrders();
    }, []);

    const fetchPendingOrders = async () => {
        setLoading(true);
        // Fetch orders that are NOT completed
        const { data, error } = await supabase
            .from('sales_orders')
            .select(`
                *,
                items:sales_order_items(*),
                customer:customers(name),
                agent:agents(agent_name),
                transport:transports(transport_name)
            `)
            .neq('order_status', 'completed')
            .neq('status', 'draft') // Only submitted orders
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            toast({ title: "Error fetching orders", variant: "destructive" });
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };

    const handleOpenDispatch = (order) => {
        setSelectedOrder(order);
        setIsDispatchOpen(true);
    };

    const handleDispatchSuccess = () => {
        fetchPendingOrders(); // Refresh list
    };

    const filtered = orders.filter(o => 
        o.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <Helmet><title>Pending Orders</title></Helmet>
            <AdminPageHeader 
                title="Pending Orders" 
                breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Pending Orders' }]} 
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
                                <TableHead>Date</TableHead>
                                <TableHead>Items / Balance</TableHead>
                                <TableHead>Agent</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No pending orders.</TableCell></TableRow>
                            ) : (
                                filtered.map(order => {
                                    // Calculate simple progress string
                                    const totalItems = order.items?.length || 0;
                                    const fullyDispatched = order.items?.filter(i => (i.dispatched_qty || 0) >= i.quantity).length || 0;
                                    
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.order_no}</TableCell>
                                            <TableCell>{order.customer?.name}</TableCell>
                                            <TableCell>{format(new Date(order.created_at), 'dd MMM')}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {fullyDispatched}/{totalItems} Items Cleared
                                                </div>
                                                <div className="h-1 w-20 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                    <div 
                                                        className="h-full bg-blue-500" 
                                                        style={{ width: `${(fullyDispatched / totalItems) * 100}%` }}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>{order.agent?.agent_name || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    order.order_status === 'partially_dispatched' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'
                                                }>
                                                    {order.order_status === 'partially_dispatched' ? 'Partial' : 'Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/sales-order/${order.id}`)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleOpenDispatch(order)} className="h-8 gap-1">
                                                        <Truck className="h-3 w-3" /> Dispatch
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <DispatchModal 
                isOpen={isDispatchOpen} 
                onClose={() => setIsDispatchOpen(false)} 
                order={selectedOrder} 
                onDispatchSuccess={handleDispatchSuccess} 
            />
        </div>
    );
}