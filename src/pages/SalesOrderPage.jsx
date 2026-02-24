import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Plus, Trash2, Search, ArrowLeft, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import SalesOrderHeader from '@/components/sales/SalesOrderHeader';
import OrderSummarySection from '@/components/sales/OrderSummarySection';

const SalesOrderPage = () => {
    const { orderId } = useParams();
    const isEdit = !!orderId;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    // Order State
    const [orderDetails, setOrderDetails] = useState({
        orderNo: '',
        date: new Date().toISOString().slice(0, 10),
        deliveryDate: '',
        deliveryAddress: '',
        status: 'Draft',
        notes: ''
    });
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customers, setCustomers] = useState([]);
    
    // Items State
    const [items, setItems] = useState([]);
    const [totals, setTotals] = useState({
        discount: 0,
        taxPercent: 0,
        shipping: 0,
        paymentTerms: '',
        notes: '',
        finalAmount: 0
    });

    useEffect(() => {
        fetchCustomers();
        if (isEdit) fetchOrder();
        else generateOrderNumber();
    }, [orderId]);

    useEffect(() => {
        const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const discountAmount = parseFloat(totals.discount) || 0;
        const taxableAmount = Math.max(0, subtotal - discountAmount);
        const taxAmount = taxableAmount * ((parseFloat(totals.taxPercent) || 0) / 100);
        const shipping = parseFloat(totals.shipping) || 0;
        
        setTotals(prev => ({
            ...prev,
            finalAmount: taxableAmount + taxAmount + shipping
        }));
    }, [items, totals.discount, totals.taxPercent, totals.shipping]);

    const fetchCustomers = async () => {
        const { data } = await supabase.from('customers').select('*');
        if (data) setCustomers(data);
    };

    const generateOrderNumber = async () => {
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const random = Math.floor(Math.random() * 1000);
        setOrderDetails(prev => ({ ...prev, orderNo: `SO-${dateStr}-${random}` }));
    };

    const fetchOrder = async () => {
        setLoading(true);
        const { data } = await supabase.from('sales_orders').select('*').eq('id', orderId).single();
        if (data) {
            setOrderDetails({
                orderNo: data.order_number,
                date: new Date(data.created_at).toISOString().slice(0, 10),
                deliveryDate: data.delivery_date,
                deliveryAddress: data.shipping_address,
                status: data.status,
            });
            setSelectedCustomer(customers.find(c => c.id === data.customer_id));
            setTotals({
                discount: data.discount || 0,
                taxPercent: data.gst_rate || 0,
                shipping: data.shipping_cost || 0,
                paymentTerms: data.payment_terms || '',
                notes: data.notes || '',
                finalAmount: data.total_amount || 0
            });
            const { data: orderItems } = await supabase.from('sales_order_items').select('*').eq('order_id', orderId);
            if (orderItems) {
                setItems(orderItems.map(i => ({
                    id: i.id,
                    design_number: i.design_number,
                    item_name: i.item_name,
                    fabric_type: i.item_category,
                    component_type: i.item_type,
                    quantity: i.quantity,
                    rate: i.rate,
                    amount: i.amount,
                    is_auto_fetched: true
                })));
            }
        }
        setLoading(false);
    };

    const handleAutoFetchDesign = async (index, designNumber) => {
        if (!designNumber) return;

        try {
            // Priority 1: Check Design Combo Packs
            const { data: compData } = await supabase
                .from('design_set_components')
                .select('*')
                .eq('design_number', designNumber)
                .maybeSingle();

            if (compData) {
                updateItem(index, {
                    item_name: compData.fabric_name || compData.design_name || 'Design Set Component',
                    fabric_type: compData.fabric_type,
                    component_type: compData.component_type,
                    design_photo_url: compData.photo_url,
                    is_auto_fetched: true,
                    design_number: designNumber
                });
                toast({ title: "Design Found", description: `Fetched details from Combo Pack.` });
                return;
            }

            // Priority 2: Check Finish Fabric Designs (New Table)
            const { data: designData } = await supabase
                .from('finish_fabric_designs')
                .select(`
                    *,
                    finish_fabrics (
                        finish_fabric_name,
                        process_type
                    )
                `)
                .eq('design_number', designNumber)
                .maybeSingle();

            if (designData) {
                updateItem(index, {
                    item_name: designData.finish_fabrics?.finish_fabric_name || 'Fabric',
                    fabric_type: designData.finish_fabrics?.process_type || 'Finish Fabric',
                    component_type: '-',
                    design_photo_url: designData.design_photo_url,
                    is_auto_fetched: true,
                    design_number: designNumber
                });
                toast({ title: "Design Found", description: `Fetched from Finish Fabric Designs.` });
                return;
            }

            // Priority 3: Check regular Finish Fabrics (Legacy JSON array)
            const { data: finishData } = await supabase
                .from('finish_fabrics')
                .select('*')
                .contains('design_numbers', [designNumber])
                .maybeSingle();
            
            if (finishData) {
                updateItem(index, {
                    item_name: finishData.finish_fabric_name,
                    fabric_type: 'Finish Fabric',
                    component_type: '-',
                    is_auto_fetched: true,
                    design_number: designNumber
                });
                toast({ title: "Design Found", description: `Fetched Finish Fabric (Legacy).` });
                return;
            }

            toast({ title: "Not Found", description: `Design ${designNumber} not found.`, variant: "outline" });
            updateItem(index, { is_auto_fetched: false, design_number: designNumber, design_photo_url: null });

        } catch (error) {
            console.error(error);
        }
    };

    const addItem = () => {
        setItems([...items, {
            id: Math.random(),
            design_number: '',
            item_name: '',
            fabric_type: 'Finish Fabric',
            component_type: '-',
            quantity: '',
            rate: '',
            amount: 0,
            is_auto_fetched: false
        }]);
    };

    const removeItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = (index, updates) => {
        const newItems = [...items];
        const item = { ...newItems[index], ...updates };
        if ('quantity' in updates || 'rate' in updates) {
            const qty = parseFloat(item.quantity) || 0;
            const rate = parseFloat(item.rate) || 0;
            item.amount = qty * rate;
        }
        newItems[index] = item;
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!selectedCustomer) return toast({ variant: 'destructive', title: 'Error', description: 'Please select a customer.' });
        if (items.length === 0) return toast({ variant: 'destructive', title: 'Error', description: 'Add at least one item.' });
        if (items.some(i => !i.design_number || !i.quantity || !i.rate)) return toast({ variant: 'destructive', title: 'Error', description: 'All items must have Design No, Qty, and Rate.' });
        
        setLoading(true);
        try {
            const orderPayload = {
                order_number: orderDetails.orderNo,
                customer_id: selectedCustomer.id,
                status: orderDetails.status,
                delivery_date: orderDetails.deliveryDate || null,
                shipping_address: orderDetails.deliveryAddress,
                total_amount: totals.finalAmount,
                discount: totals.discount,
                gst_rate: totals.taxPercent,
                shipping_cost: totals.shipping,
                payment_terms: totals.paymentTerms,
                notes: totals.notes,
                party_details: { name: selectedCustomer.name },
                order_details: {},
                items: items, // store complete structure in jsonb too just in case
                calculations: {},
                totals: { final: totals.finalAmount }
            };

            let savedOrderId = orderId;

            if (isEdit) {
                await supabase.from('sales_orders').update(orderPayload).eq('id', orderId);
            } else {
                const { data, error } = await supabase.from('sales_orders').insert(orderPayload).select().single();
                if (error) throw error;
                savedOrderId = data.id;
            }

            if (isEdit) {
                await supabase.from('sales_order_items').delete().eq('order_id', savedOrderId);
            }
            
            if (items.length > 0) {
                const itemsPayload = items.map(item => ({
                    order_id: savedOrderId,
                    design_number: item.design_number,
                    item_name: item.item_name,
                    item_category: item.fabric_type,
                    item_type: item.component_type,
                    quantity: parseFloat(item.quantity) || 0,
                    rate: parseFloat(item.rate) || 0,
                    amount: parseFloat(item.amount) || 0,
                    completion_status: 100
                }));
                const { error: itemError } = await supabase.from('sales_order_items').insert(itemsPayload);
                if (itemError) throw itemError;
            }

            toast({ title: 'Success', description: 'Order saved successfully.' });
            navigate('/admin/sales-orders');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-full mx-auto pb-24 p-6">
            <Helmet><title>{isEdit ? `Edit Order` : 'New Sales Order'}</title></Helmet>
            
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/sales-orders')}><ArrowLeft className="h-5 w-5"/></Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{isEdit ? 'Edit Sales Order' : 'New Sales Order'}</h1>
                        <p className="text-muted-foreground text-sm">Create orders with auto-fetching design numbers</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/admin/sales-orders')}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        {isEdit ? 'Update Order' : 'Create Order'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 space-y-6">
                    <SalesOrderHeader 
                        orderDetails={orderDetails} 
                        setOrderDetails={setOrderDetails} 
                        customers={customers} 
                        selectedCustomer={selectedCustomer} 
                        onCustomerSelect={(id) => setSelectedCustomer(customers.find(c => c.id === id))}
                    />

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3 bg-slate-50 border-b">
                            <CardTitle className="text-base">Order Items</CardTitle>
                            <Button size="sm" onClick={addItem}><Plus className="mr-2 h-4 w-4"/> Add Item</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead className="w-[180px]">Design No. <span className="text-red-500">*</span></TableHead>
                                        <TableHead>Item Details</TableHead>
                                        <TableHead className="w-[120px]">Type</TableHead>
                                        <TableHead className="w-[120px]">Component</TableHead>
                                        <TableHead className="w-[150px]">Qty <span className="text-red-500">*</span></TableHead>
                                        <TableHead className="w-[150px]">Rate (₹) <span className="text-red-500">*</span></TableHead>
                                        <TableHead className="w-[150px] text-right">Amount</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => (
                                        <TableRow key={item.id} className="group hover:bg-slate-50">
                                            <TableCell className="align-top p-2">
                                                {item.design_photo_url ? (
                                                    <img src={item.design_photo_url} alt="Des" className="h-10 w-10 object-cover rounded border" />
                                                ) : (
                                                    <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center text-slate-300">
                                                        <ImageIcon className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div className="flex gap-1">
                                                    <Input 
                                                        value={item.design_number} 
                                                        onChange={e => updateItem(index, { design_number: e.target.value })}
                                                        onBlur={(e) => handleAutoFetchDesign(index, e.target.value)}
                                                        className="font-bold font-mono"
                                                        placeholder="Enter No."
                                                    />
                                                    <Button 
                                                        size="icon" variant="ghost" className="h-10 w-8 text-blue-500 hover:bg-blue-50"
                                                        onClick={() => handleAutoFetchDesign(index, item.design_number)}
                                                        title="Fetch Details"
                                                    >
                                                        <Search className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Input 
                                                    value={item.item_name} 
                                                    onChange={e => updateItem(index, { item_name: e.target.value })}
                                                    placeholder="Item Name"
                                                    className={item.is_auto_fetched ? "bg-green-50 border-green-200" : ""}
                                                    readOnly={item.is_auto_fetched}
                                                />
                                                {item.is_auto_fetched && <span className="text-[10px] text-green-600 flex items-center mt-1"><CheckCircle2 className="h-3 w-3 mr-1"/> Auto-fetched</span>}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Input value={item.fabric_type} readOnly className="text-xs bg-slate-50" />
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Input value={item.component_type} readOnly className="text-xs bg-slate-50" />
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={e => updateItem(index, { quantity: e.target.value })}
                                                    className="font-bold text-lg h-10 w-full"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Input 
                                                    type="number" 
                                                    value={item.rate} 
                                                    onChange={e => updateItem(index, { rate: e.target.value })}
                                                    className="font-bold text-lg h-10 w-full"
                                                    placeholder="0.00"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right align-top font-bold text-lg pt-4">
                                                ₹{(parseFloat(item.amount)||0).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 hover:text-red-500" onClick={() => removeItem(index)}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {items.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                                No items added. Click "Add Item" to start.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="xl:col-span-1 space-y-6">
                    <OrderSummarySection 
                        totals={totals} 
                        setTotals={setTotals} 
                        itemsTotal={items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)}
                    />
                </div>
            </div>
        </div>
    );
};

export default SalesOrderPage;