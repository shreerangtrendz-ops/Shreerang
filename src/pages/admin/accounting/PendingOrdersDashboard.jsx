import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Truck, Edit2, Trash2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

const PendingOrdersDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Dispatch Modal State
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [dispatchData, setDispatchData] = useState({
        bill_number: '',
        dispatch_quantity: 0,
        dispatch_date: new Date().toISOString().split('T')[0],
        future_dispatch: false,
        notes: ''
    });

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('pending_orders').select('*').order('created_at', { ascending: false });
        if (error) console.error(error);
        else setOrders(data || []);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        const { error } = await supabase.from('pending_orders').delete().eq('id', id);
        if (!error) {
            toast({ title: 'Deleted' });
            fetchOrders();
        }
    };

    const handleDispatchClick = (order) => {
        setSelectedOrder(order);
        setDispatchData({
            bill_number: '',
            dispatch_quantity: order.balance_quantity, // Default to remaining
            dispatch_date: new Date().toISOString().split('T')[0],
            future_dispatch: false,
            notes: ''
        });
        setDispatchModalOpen(true);
    };

    const handleDispatchSubmit = async () => {
        if (!dispatchData.bill_number || dispatchData.dispatch_quantity <= 0) {
            return toast({ variant: 'destructive', title: 'Invalid Data', description: 'Bill # and Quantity required.' });
        }
        if (dispatchData.dispatch_quantity > selectedOrder.balance_quantity) {
            return toast({ variant: 'destructive', title: 'Error', description: 'Cannot dispatch more than balance.' });
        }

        try {
            // 1. Record History
            const { error: histError } = await supabase.from('dispatch_history').insert({
                pending_order_id: selectedOrder.id,
                ...dispatchData
            });
            if (histError) throw histError;

            // 2. Update Order
            const newDispatched = parseFloat(selectedOrder.dispatched_quantity || 0) + parseFloat(dispatchData.dispatch_quantity);
            const newBalance = selectedOrder.order_quantity - newDispatched;
            const newStatus = newBalance <= 0 ? 'Completed' : 'Partial';

            const { error: ordError } = await supabase.from('pending_orders').update({
                dispatched_quantity: newDispatched,
                // balance_quantity is generated stored column usually, but if manual update needed:
                // balance_quantity: newBalance,
                status: newStatus
            }).eq('id', selectedOrder.id);
            
            if (ordError) throw ordError;

            // 3. Create Sales Bill Automatically (Optional but good practice)
            await supabase.from('sales_bills').insert({
                bill_number: dispatchData.bill_number,
                bill_date: dispatchData.dispatch_date,
                customer_id: selectedOrder.customer_id,
                customer_name: selectedOrder.customer_name,
                item_name: `${selectedOrder.item_name} - ${selectedOrder.design_number}`,
                quantity: dispatchData.dispatch_quantity,
                rate: selectedOrder.rate,
                status: 'Pending',
                notes: `Auto-generated from Pending Order dispatch. ${dispatchData.notes}`
            });

            toast({ title: 'Success', description: 'Dispatch recorded and Sales Bill created.' });
            setDispatchModalOpen(false);
            fetchOrders();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const filteredOrders = orders.filter(o => 
        o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.order_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <Helmet><title>Pending Orders</title></Helmet>
            <AdminPageHeader 
                title="Pending Orders" 
                breadcrumbs={[{label: 'Accounting', href: '/admin/accounting'}, {label: 'Pending Orders'}]}
                onBack={() => navigate('/admin/accounting')}
            />

            <div className="flex justify-between items-center">
                <Input 
                    placeholder="Search orders..." 
                    className="max-w-xs"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <Button onClick={() => navigate('new')} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Order
                </Button>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Order #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Item / Design</TableHead>
                                <TableHead className="text-right">Ordered</TableHead>
                                <TableHead className="text-right">Dispatched</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">No pending orders.</TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map(o => (
                                    <TableRow key={o.id}>
                                        <TableCell>{format(new Date(o.order_date), 'dd MMM')}</TableCell>
                                        <TableCell className="font-medium">{o.order_number}</TableCell>
                                        <TableCell>{o.customer_name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{o.item_name}</span>
                                                <span className="text-xs text-muted-foreground">{o.design_number}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{o.order_quantity}</TableCell>
                                        <TableCell className="text-right text-blue-600">{o.dispatched_quantity}</TableCell>
                                        <TableCell className="text-right font-bold text-orange-600">{o.balance_quantity}</TableCell>
                                        <TableCell>
                                            <Badge variant={o.status === 'Completed' ? 'success' : o.status === 'Partial' ? 'warning' : 'secondary'}>
                                                {o.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {o.status !== 'Completed' && (
                                                    <Button variant="ghost" size="icon" title="Dispatch" onClick={() => handleDispatchClick(o)}>
                                                        <Truck className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => navigate(`${o.id}`)}>
                                                    <Edit2 className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Dispatch Order</DialogTitle></DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-slate-50 rounded border text-sm grid grid-cols-2 gap-2">
                                <div><strong>Customer:</strong> {selectedOrder.customer_name}</div>
                                <div><strong>Item:</strong> {selectedOrder.item_name}</div>
                                <div><strong>Balance Qty:</strong> {selectedOrder.balance_quantity}</div>
                                <div><strong>Rate:</strong> {selectedOrder.rate}</div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Sales Bill Number *</Label>
                                <Input value={dispatchData.bill_number} onChange={e => setDispatchData({...dispatchData, bill_number: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Dispatch Qty *</Label>
                                    <Input type="number" value={dispatchData.dispatch_quantity} onChange={e => setDispatchData({...dispatchData, dispatch_quantity: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dispatch Date</Label>
                                    <Input type="date" value={dispatchData.dispatch_date} onChange={e => setDispatchData({...dispatchData, dispatch_date: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input value={dispatchData.notes} onChange={e => setDispatchData({...dispatchData, notes: e.target.value})} />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="future" checked={dispatchData.future_dispatch} onCheckedChange={(c) => setDispatchData({...dispatchData, future_dispatch: c})} />
                                <Label htmlFor="future">Mark as Future Dispatch (Planning only)</Label>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDispatchModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleDispatchSubmit}>Confirm Dispatch</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingOrdersDashboard;