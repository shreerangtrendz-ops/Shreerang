import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderService } from '@/services/OrderService';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';

const OrderDatabasePage = () => {
  const { toast } = useToast();
  const [salesOrders, setSalesOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
        const sales = await OrderService.listSalesOrders();
        setSalesOrders(sales || []);
        
        const pending = await OrderService.listPendingOrders();
        setPendingOrders(pending || []);
    } catch(e) { console.error(e); }
  };

  const handlePendingAction = async (id, status) => {
    await OrderService.updatePendingOrderStatus(id, status);
    fetchOrders();
    toast({ title: "Updated", description: `Order marked as ${status}` });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Order Database</title></Helmet>
      <AdminPageHeader 
        title="Order Database" 
        description="Manage all sales and pending orders."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Order Database'}]}
      />

      <Tabs defaultValue="sales" className="w-full">
         <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
             <TabsTrigger value="sales" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6">Sales Orders</TabsTrigger>
             <TabsTrigger value="pending" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6">Pending Orders</TabsTrigger>
         </TabsList>

         <TabsContent value="sales" className="pt-6">
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salesOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono">{order.order_no}</TableCell>
                                    <TableCell>{order.customer?.name || order.party_details?.name}</TableCell>
                                    <TableCell>{format(new Date(order.created_at), 'dd MMM yyyy')}</TableCell>
                                    <TableCell>₹{order.total_amount}</TableCell>
                                    <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                            {salesOrders.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No sales orders found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
         </TabsContent>

         <TabsContent value="pending" className="pt-6">
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Design</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono">{order.order_number}</TableCell>
                                    <TableCell>{order.customer_name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {order.design_image_url && <img src={order.design_image_url} className="h-8 w-8 rounded object-cover" />}
                                            <span>{order.design_number}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{order.order_date}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handlePendingAction(order.id, 'Completed')} title="Mark Complete">
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handlePendingAction(order.id, 'Cancelled')} title="Cancel">
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {pendingOrders.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No pending orders.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
         </TabsContent>
      </Tabs>
    </div>
  );
};
export default OrderDatabasePage;