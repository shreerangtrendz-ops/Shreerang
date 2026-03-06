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
import { Plus, Trash2, Save, ArrowLeft, Loader2, Send } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

// ── Financial year helper ─────────────────────────────────
function getFinancialYear() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed, April = 3
  const year = now.getFullYear();
  if (month >= 3) { // April onwards = new FY
    return `${String(year).slice(2)}-${String(year + 1).slice(2)}`;
  } else {
    return `${String(year - 1).slice(2)}-${String(year).slice(2)}`;
  }
}

// ── Generate next SRTPL/NNNN/YY-YY order number ──────────
async function generateOrderNumber() {
  const fy = getFinancialYear();
  const prefix = `SRTPL/`;
  const suffix = `/${fy}`;

  // Get the max serial for current financial year
  const { data, error } = await supabase
    .from('sales_orders')
    .select('order_no')
    .like('order_no', `SRTPL/%/${fy}`)
    .order('order_no', { ascending: false })
    .limit(1);

  let nextSerial = 1;
  if (data && data.length > 0) {
    const lastNo = data[0].order_no;
    const parts = lastNo.split('/');
    if (parts.length === 3) {
      const lastSerial = parseInt(parts[1], 10);
      if (!isNaN(lastSerial)) nextSerial = lastSerial + 1;
    }
  }
  return `${prefix}${String(nextSerial).padStart(4, '0')}${suffix}`;
}

const SalesOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [designSuggestions, setDesignSuggestions] = useState([]);

  const [orderData, setOrderData] = useState({
    order_no: '',
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    shipping_address: '',
    status: 'draft',
    delivery_date: '',
    notes: '',
    payment_terms: 'Net 30',
    order_channel: 'admin',
    tally_sync_status: 'pending',
  });

  const [items, setItems] = useState([
    { id: 1, design_no: '', item_name: '', fabric_type: '', quantity: 1, rate: 0, amount: 0, hsn_code: '', gst_rate: 5 }
  ]);

  // Load customers + auto-generate order number
  useEffect(() => {
    (async () => {
      // Load customers
      const { data: custData } = await supabase
        .from('customers')
        .select('id, name, phone, email, credit_days, tally_ledger_name')
        .neq('business_type', 'supplier')
        .order('name')
        .limit(500);
      if (custData) setCustomers(custData);

      if (id) {
        // Load existing order
        const { data: orderRow } = await supabase
          .from('sales_orders')
          .select('*')
          .eq('id', id)
          .single();
        if (orderRow) {
          setOrderData({
            order_no: orderRow.order_no || '',
            customer_id: orderRow.customer_id || '',
            customer_name: orderRow.customer_name || '',
            customer_phone: orderRow.customer_phone || '',
            customer_email: orderRow.customer_email || '',
            shipping_address: orderRow.shipping_address || '',
            status: orderRow.status || 'draft',
            delivery_date: orderRow.delivery_date || '',
            notes: orderRow.notes || '',
            payment_terms: orderRow.payment_terms || 'Net 30',
            order_channel: orderRow.order_channel || 'admin',
            tally_sync_status: orderRow.tally_sync_status || 'pending',
          });
          if (orderRow.order_details?.items) {
            setItems(orderRow.order_details.items);
          }
        }
      } else {
        // Generate new order number
        const orderNo = await generateOrderNumber();
        const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setOrderData(prev => ({ ...prev, order_no: orderNo, delivery_date: deliveryDate }));
      }
    })();
  }, [id]);

  const handleCustomerSelect = (customerId) => {
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      setOrderData(prev => ({
        ...prev,
        customer_id: cust.id,
        customer_name: cust.name,
        customer_phone: cust.phone || '',
        customer_email: cust.email || '',
      }));
    }
  };

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setOrderData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (itemId, field, value) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = Number(updatedItem.quantity) * Number(updatedItem.rate);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Auto-fill design details when design_no is entered
  const handleDesignNoChange = async (itemId, designNo) => {
    handleItemChange(itemId, 'design_no', designNo);
    if (designNo.length >= 3) {
      const { data } = await supabase
        .from('design_batch_master')
        .select('design_no, item_name, hsn_code, gst_rate, construction')
        .ilike('design_no', `${designNo}%`)
        .limit(5);
      if (data && data.length > 0) {
        setDesignSuggestions({ itemId, suggestions: data });
        if (data.length === 1) {
          // Auto-fill if only one match
          setItems(prev => prev.map(item => item.id === itemId ? {
            ...item,
            design_no: data[0].design_no,
            item_name: data[0].item_name || '',
            hsn_code: data[0].hsn_code || '',
            gst_rate: data[0].gst_rate || 5,
          } : item));
        }
      }
    }
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { id: Date.now(), design_no: '', item_name: '', fabric_type: '', quantity: 1, rate: 0, amount: 0, hsn_code: '', gst_rate: 5 }
    ]);
  };

  const removeItem = (itemId) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const taxableGroups = {};
    items.forEach(item => {
      const rate = item.gst_rate || 5;
      taxableGroups[rate] = (taxableGroups[rate] || 0) + Number(item.amount || 0);
    });
    const tax = Object.entries(taxableGroups).reduce((sum, [rate, amt]) => sum + amt * Number(rate) / 100, 0);
    return { subtotal, tax, total: subtotal + tax };
  };

  const totals = calculateTotals();

  const handleSubmit = async (status = 'draft') => {
    setLoading(true);
    try {
      if (!orderData.customer_name) throw new Error('Customer Name is required');
      if (!orderData.order_no) throw new Error('Order number is missing');

      const { subtotal, tax, total } = calculateTotals();
      const payload = {
        order_no: orderData.order_no,
        customer_id: orderData.customer_id || null,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone || null,
        customer_email: orderData.customer_email || null,
        shipping_address: orderData.shipping_address || null,
        status: status,
        delivery_date: orderData.delivery_date || null,
        notes: orderData.notes || null,
        payment_terms: orderData.payment_terms,
        order_channel: orderData.order_channel || 'admin',
        tally_sync_status: 'pending',
        order_details: { items },
        subtotal_amount: subtotal,
        tax_amount: tax,
        total_amount: total,
      };

      if (id) {
        const { error } = await supabase.from('sales_orders').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: '✅ Order Updated', description: `${orderData.order_no} saved.` });
      } else {
        const { error } = await supabase.from('sales_orders').insert(payload);
        if (error) throw error;
        toast({ title: '✅ Order Created', description: `${orderData.order_no} created successfully.` });
      }
      navigate('/admin/orders');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
    setLoading(false);
  };

  return (
    <FormErrorBoundary>
      <Helmet><title>{id ? 'Edit Order' : 'New Sales Order'} | Shreerang Trendz</title></Helmet>
      <AdminPageHeader
        title={id ? `Edit Order: ${orderData.order_no}` : 'New Sales Order'}
        subtitle={`Format: SRTPL/0001/${getFinancialYear()} — GST Compliant`}
      />
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Order Header */}
        <Card>
          <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Order Number</Label>
              <Input value={orderData.order_no} readOnly className="bg-gray-50 font-mono font-bold" />
              <p className="text-xs text-gray-400 mt-1">Auto-generated • GST-compliant format</p>
            </div>
            <div>
              <Label>Status</Label>
              <select name="status" value={orderData.status} onChange={handleHeaderChange}
                className="w-full border rounded-md p-2 text-sm">
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <Label>Customer *</Label>
              <select value={orderData.customer_id} onChange={e => handleCustomerSelect(e.target.value)}
                className="w-full border rounded-md p-2 text-sm">
                <option value="">-- Select Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="customer_phone" value={orderData.customer_phone} onChange={handleHeaderChange} placeholder="Customer phone" />
            </div>
            <div>
              <Label>Delivery Date</Label>
              <Input type="date" name="delivery_date" value={orderData.delivery_date} onChange={handleHeaderChange} />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <select name="payment_terms" value={orderData.payment_terms} onChange={handleHeaderChange}
                className="w-full border rounded-md p-2 text-sm">
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Advance">100% Advance</option>
                <option value="50% Advance">50% Advance</option>
                <option value="COD">Cash on Delivery</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label>Shipping Address</Label>
              <Textarea name="shipping_address" value={orderData.shipping_address} onChange={handleHeaderChange}
                placeholder="Delivery address" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Add Item</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Design No.</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-24">HSN</TableHead>
                    <TableHead className="w-24">GST %</TableHead>
                    <TableHead className="w-24">Qty (Mtrs)</TableHead>
                    <TableHead className="w-28">Rate (₹)</TableHead>
                    <TableHead className="w-28">Amount (₹)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input value={item.design_no} onChange={e => handleDesignNoChange(item.id, e.target.value)}
                          placeholder="D.No." className="font-mono text-sm" />
                      </TableCell>
                      <TableCell>
                        <Input value={item.item_name} onChange={e => handleItemChange(item.id, 'item_name', e.target.value)}
                          placeholder="Fabric description" className="text-sm" />
                      </TableCell>
                      <TableCell>
                        <Input value={item.hsn_code} onChange={e => handleItemChange(item.id, 'hsn_code', e.target.value)}
                          placeholder="5007" className="text-sm" />
                      </TableCell>
                      <TableCell>
                        <select value={item.gst_rate} onChange={e => handleItemChange(item.id, 'gst_rate', Number(e.target.value))}
                          className="w-full border rounded p-1.5 text-sm">
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={0}>0%</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                          min="0" step="0.5" className="text-sm" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', e.target.value)}
                          min="0" step="0.5" className="text-sm" />
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-4">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">GST</span><span>₹{totals.tax.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>₹{totals.total.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-4">
            <Label>Internal Notes</Label>
            <Textarea name="notes" value={orderData.notes} onChange={handleHeaderChange}
              placeholder="Any special instructions, remarks..." rows={3} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => navigate('/admin/orders')}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
          <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSubmit('confirmed')} disabled={loading}
            className="bg-green-700 hover:bg-green-800 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Confirm Order
          </Button>
        </div>
      </div>
    </FormErrorBoundary>
  );
};

export default SalesOrderForm;
