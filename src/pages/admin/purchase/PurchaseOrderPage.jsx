import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Plus, Search, Filter, Eye, Trash2, Edit, FileText, 
  Calendar, Download, CheckCircle, Clock, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PurchaseOrderService } from '@/services/PurchaseOrderService';
import { SupplierService } from '@/services/SupplierService';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { format } from 'date-fns';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const PurchaseOrderPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({ status: 'All', supplier: 'all', search: '' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    supplier_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    items: [], 
    total_amount: 0,
    notes: ''
  });

  const [currentItem, setCurrentItem] = useState({ sku: '', fabric: '', qty: '', rate: '' });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, suppliersData] = await Promise.all([
        PurchaseOrderService.getAllOrders({ 
          status: filters.status, 
          supplierId: filters.supplier,
          search: filters.search
        }),
        SupplierService.getAllSuppliers()
      ]);
      setOrders(ensureArray(ordersData?.data, 'PurchaseOrderPage orders'));
      setSuppliers(ensureArray(suppliersData, 'PurchaseOrderPage suppliers'));
    } catch (err) {
      logError(err, 'PurchaseOrderPage fetch');
      toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
      setOrders([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.supplier_id) return toast({ variant: "destructive", title: "Supplier required" });
    
    let finalItems = [...ensureArray(newOrder.items)];
    if (currentItem.sku && currentItem.qty) {
      finalItems.push(currentItem);
    }

    if (finalItems.length === 0) return toast({ variant: "destructive", title: "At least one item required" });

    try {
      await PurchaseOrderService.createOrder({
        ...newOrder,
        items: finalItems,
        total_amount: finalItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate)), 0)
      });
      toast({ title: "Success", description: "Purchase Order Created" });
      setIsCreateOpen(false);
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const addItemToOrder = () => {
    if (!currentItem.sku || !currentItem.qty) return;
    setNewOrder(prev => ({
      ...prev,
      items: [...ensureArray(prev.items), currentItem]
    }));
    setCurrentItem({ sku: '', fabric: '', qty: '', rate: '' });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const safeOrders = ensureArray(orders);
  const safeSuppliers = ensureArray(suppliers);

  return (
    <div className="space-y-6">
      <Helmet><title>Purchase Orders | Admin</title></Helmet>
      
      <AdminPageHeader 
        title="Purchase Orders" 
        description="Manage fabric procurement and supplier orders"
        actions={
          <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Search PO Number..." 
              className="pl-9"
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.supplier} onValueChange={v => setFilters({...filters, supplier: v})}>
            <SelectTrigger><SelectValue placeholder="Supplier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {safeSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadData}>
            <Filter className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24">Loading...</TableCell></TableRow>
            ) : safeOrders.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24 text-slate-500">No orders found</TableCell></TableRow>
            ) : (
              safeOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.po_number}</TableCell>
                  <TableCell>{format(new Date(order.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{order.suppliers?.supplier_name || 'Unknown'}</TableCell>
                  <TableCell>
                    {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                       <Badge variant="outline">{order.items.length} Items</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>₹{Number(order.total_amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)} variant="secondary">{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select onValueChange={v => setNewOrder({...newOrder, supplier_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                <SelectContent>
                  {safeSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={newOrder.date} onChange={e => setNewOrder({...newOrder, date: e.target.value})} />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-sm text-slate-700">Add Item</h4>
            <div className="grid grid-cols-4 gap-2">
              <Input placeholder="SKU/Design" value={currentItem.sku} onChange={e => setCurrentItem({...currentItem, sku: e.target.value})} />
              <Input placeholder="Fabric Type" value={currentItem.fabric} onChange={e => setCurrentItem({...currentItem, fabric: e.target.value})} />
              <Input type="number" placeholder="Qty" value={currentItem.qty} onChange={e => setCurrentItem({...currentItem, qty: e.target.value})} />
              <div className="flex gap-2">
                <Input type="number" placeholder="Rate" value={currentItem.rate} onChange={e => setCurrentItem({...currentItem, rate: e.target.value})} />
                <Button size="icon" onClick={addItemToOrder}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            {ensureArray(newOrder.items).length > 0 && (
              <div className="text-sm space-y-1 mt-2">
                {newOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between border-b pb-1">
                    <span>{item.sku} ({item.fabric})</span>
                    <span>{item.qty} x ₹{item.rate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrder}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrderPage;