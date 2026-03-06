import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, PackageCheck, Truck, Clock, CheckCircle2, Loader2, Box } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Loader2 },
    packed: { label: 'Packed', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Box },
    dispatched: { label: 'Dispatched', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
};

const SUMMARY_TABS = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'packed', label: 'Packed' },
    { key: 'dispatched', label: 'Dispatched' },
];

const StoreManagerOrders = () => {
    const { toast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales_orders')
                .select('id, order_no, status, total_amount, created_at, party_details, items, order_channel, payment_status, tally_voucher_id')
                .in('status', ['pending', 'confirmed', 'processing', 'packed', 'dispatched'])
                .order('created_at', { ascending: true });
            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load orders.' });
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            const { error } = await supabase
                .from('sales_orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);
            if (error) throw error;
            toast({ title: 'Status Updated', description: `Order marked as "${STATUS_CONFIG[newStatus]?.label}".` });
            fetchOrders();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setUpdatingId(null);
        }
    };

    const filtered = orders.filter(o => {
        const matchTab = activeTab === 'all' || o.status === activeTab;
        const q = searchTerm.toLowerCase();
        const matchSearch = !q ||
            (o.order_no && o.order_no.toLowerCase().includes(q)) ||
            (o.party_details?.name && o.party_details.name.toLowerCase().includes(q));
        return matchTab && matchSearch;
    });

    const getCount = (key) => key === 'all' ? orders.length : orders.filter(o => o.status === key).length;

    const getNextActions = (status) => {
        if (status === 'pending' || status === 'confirmed') return ['packed'];
        if (status === 'processing') return ['packed'];
        if (status === 'packed') return ['dispatched'];
        if (status === 'dispatched') return ['delivered'];
        return [];
    };

    const CHANNEL_CONFIG = {
        website:    { icon: '🌐', label: 'Website',   color: 'bg-blue-50 text-blue-700 border-blue-200' },
        admin:      { icon: '🏢', label: 'Admin',     color: 'bg-slate-100 text-slate-600 border-slate-200' },
        whatsapp:   { icon: '💬', label: 'WhatsApp',  color: 'bg-green-50 text-green-700 border-green-200' },
        'sales-rep':{ icon: '🤝', label: 'Sales Rep', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    };
    const ChannelBadge = ({ channel, tallyId }) => {
        const cfg = CHANNEL_CONFIG[channel] || { icon: '📋', label: channel || 'Admin', color: 'bg-slate-100 text-slate-600 border-slate-200' };
        return (
            <div className="flex flex-col gap-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                </span>
                {tallyId && <span className="text-xs text-green-600">✅ Tally</span>}
            </div>
        );
    };

    const StatusBadge = ({ status }) => {
        const config = STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            <Helmet><title>Store Manager - Orders | Shreerang</title></Helmet>
            <AdminPageHeader
                title="Store Manager — Dispatch Board"
                description="Manage packing and dispatching all confirmed sales orders."
                breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Store Dispatch' }]}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {SUMMARY_TABS.map(tab => (
                    <Card
                        key={tab.key}
                        className={`cursor-pointer transition-all hover:shadow-md border-2 ${activeTab === tab.key ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <p className="text-3xl font-bold text-slate-900">{getCount(tab.key)}</p>
                            <p className="text-sm text-slate-500 mt-1">{tab.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search & Refresh */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search order no or customer..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" onClick={fetchOrders} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            {/* Orders Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Order #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Channel</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-500">Loading orders...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-500">No orders found for this filter.</TableCell></TableRow>
                            ) : (
                                filtered.map(order => {
                                    const nextActions = getNextActions(order.status);
                                    const isUpdating = updatingId === order.id;
                                    return (
                                        <TableRow key={order.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono font-semibold text-slate-800">{order.order_no}</TableCell>
                                            <TableCell className="font-medium">{order.party_details?.name || 'Unknown'}</TableCell>
                                            <TableCell className="text-slate-500 text-sm">{format(new Date(order.created_at), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="font-bold">₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</TableCell>
                                            <TableCell><StatusBadge status={order.status} /></TableCell>
                                            <TableCell>
                                                <ChannelBadge channel={order.order_channel} tallyId={order.tally_voucher_id} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    {nextActions.map(action => (
                                                        <Button
                                                            key={action}
                                                            size="sm"
                                                            disabled={isUpdating}
                                                            onClick={() => updateStatus(order.id, action)}
                                                            className={
                                                                action === 'packed' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' :
                                                                    action === 'dispatched' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                                                                        action === 'delivered' ? 'bg-green-600 hover:bg-green-700 text-white' :
                                                                            'bg-slate-600 hover:bg-slate-700 text-white'
                                                            }
                                                        >
                                                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                                            Mark as {STATUS_CONFIG[action]?.label}
                                                        </Button>
                                                    ))}
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
        </div>
    );
};

export default StoreManagerOrders;
