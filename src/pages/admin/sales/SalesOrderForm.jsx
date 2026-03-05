import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DesignUploadComponent from '@/components/admin/DesignUploadComponent';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

const SalesOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [orderData, setOrderData] = useState({
    order_no: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    shipping_address: '',
    status: 'draft',
    delivery_date: '',
    notes: '',
    payment_terms: 'Net 30'
  });

  const [items, setItems] = useState([
    { id: 1, design_number: '', fabric_type: '', quantity: 1, rate: 0, amount: 0, design_data: null }
  ]);

  useEffect(() => {
    if (id) {
      // Fetch existing order logic here
    } else {
      // Generate sequential SRTPL/NNNN/25-26 order number
      (async () => {
        const { count } = await supabase
          .from('sales_orders')
          .select('*', { count: 'exact', head: true });
        const serial = String((count || 0) + 1).padStart(4, '0');
        const orderNo = `SRTPL/${serial}/25-26`;
        setOrderData(prev => ({
          ...prev,
          order_no: orderNo,
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
      })();
    }
  }, [id]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setOrderData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = Number(updatedItem.quantity) * Number(updatedItem.rate);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleDesignUpload = (itemId, designData) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          design_data: designData,
          design_number: designData ? designData.design_number : item.design_number
        };
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { id: Date.now(), design_number: '', fabric_type: '', quantity: 1, rate: 0, amount: 0, design_data: null }
    ]);
  };

  const removeItem = (id) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const tax = subtotal * 0.05; // 5% GST example
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!orderData.customer_name) throw new Error("Customer Name is required");

      const payload = {
        ...orderData,
        order_details: { items },
        total_amount: totals.total,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('sales_orders').insert([payload]);

      if (error) throw error;

      toast({ title: "Order Created", description: `Sales Order ${orderData.order_no} saved successfully.` });
      navigate('/admin/order-database/sales');
    } catch (error) {
      console.error("Error saving order:", error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormErrorBoundary>
      <div className="max-w-6xl mx-auto space-y-6 pb-20 p-6">
        <Helmet><title>{id ? 'Edit Sales Order' : 'New Sales Order'}</title></Helmet>

        <AdminPageHeader
          title={id ? `Edit Order #${orderData.order_no}` : "New Sales Order"}
          breadcrumbs={[{ label: 'Orders', href: '/admin/orders' }, { label: 'New Sales Order' }]}
          onBack={() => navigate('/admin/orders')}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Customer & Order Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Order Number</Label>
                <Input name="order_no" value={orderData.order_no} readOnly className="bg-slate-50 font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Input type="date" name="delivery_date" value={orderData.delivery_date} onChange={handleHeaderChange} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={orderData.status} readOnly className="capitalize bg-slate-50" />
              </div>

              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input name="customer_name" value={orderData.customer_name} onChange={handleHeaderChange} placeholder="Enter name" required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="customer_phone" value={orderData.customer_phone} onChange={handleHeaderChange} placeholder="+91..." />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="customer_email" type="email" value={orderData.customer_email} onChange={handleHeaderChange} placeholder="email@example.com" />
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label>Shipping Address</Label>
                <Textarea name="shipping_address" value={orderData.shipping_address} onChange={handleHeaderChange} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm text-slate-500">Item #{index + 1}</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <Label className="mb-2 block">Design</Label>
                      <DesignUploadComponent onUploadComplete={(data) => handleDesignUpload(item.id, data)} />
                    </div>

                    <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Design No.</Label>
                        <Input
                          value={item.design_number}
                          onChange={(e) => handleItemChange(item.id, 'design_number', e.target.value)}
                          placeholder="DSN-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fabric Type</Label>
                        <Input
                          value={item.fabric_type}
                          onChange={(e) => handleItemChange(item.id, 'fabric_type', e.target.value)}
                          placeholder="e.g. Cotton 60s"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity (Mtrs)</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          min="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rate (₹)</Label>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          min="0"
                        />
                      </div>
                      <div className="md:col-start-4 space-y-2">
                        <Label>Amount</Label>
                        <Input value={item.amount.toFixed(2)} readOnly className="bg-slate-100 font-mono text-right" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addItem} className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" /> Add Another Item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Summary & Payment</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-8 justify-end">
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Input name="payment_terms" value={orderData.payment_terms} onChange={handleHeaderChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Internal Notes</Label>
                    <Textarea name="notes" value={orderData.notes} onChange={handleHeaderChange} placeholder="Only visible to admin" />
                  </div>
                </div>

                <div className="w-full md:w-1/3 space-y-2 bg-slate-50 p-4 rounded-lg">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-mono font-medium">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm text-slate-500">
                    <span>Tax (5%):</span>
                    <span>₹{totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end gap-4 lg:pl-64 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/orders')}>Cancel</Button>
            <Button type="submit" size="lg" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Create Order
            </Button>
          </div>
        </form>
      </div>
    </FormErrorBoundary>
  );
};

export default SalesOrderForm;