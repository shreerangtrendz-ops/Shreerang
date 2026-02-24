import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Share2 } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const OrderSummaryPage = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            const { data, error } = await supabase
                .from('sales_orders')
                .select('*')
                .eq('id', orderId)
                .single();
            
            if (data) setOrder(data);
            setLoading(false);
        };
        fetchOrder();
    }, [orderId]);

    const handlePrint = () => window.print();

    if (loading) return <LoadingSpinner fullHeight />;
    if (!order) return <div className="p-8 text-center">Order not found.</div>;

    const items = order.items || [];

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 print:p-0">
            <Helmet><title>Order #{order.order_no}</title></Helmet>
            
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold">Order Summary</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint}><Download className="h-4 w-4 mr-2"/> Print</Button>
                    <Button><Share2 className="h-4 w-4 mr-2"/> Share</Button>
                </div>
            </div>

            <Card className="print:border-0 print:shadow-none">
                <CardHeader className="border-b bg-slate-50 print:bg-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl">Order #{order.order_no}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Date: {new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge>{order.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-sm text-slate-500 uppercase mb-2">Customer</h3>
                            <p className="font-medium">{order.party_details?.name || 'Guest'}</p>
                            <p className="text-sm">{order.shipping_address || 'No address provided'}</p>
                        </div>
                        <div className="text-right">
                             <h3 className="font-semibold text-sm text-slate-500 uppercase mb-2">Totals</h3>
                             <p className="text-2xl font-bold">₹{order.total_amount}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="font-semibold text-sm text-slate-500 uppercase mb-4">Items Ordered</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Design</th>
                                        <th className="px-4 py-3 text-right">Qty</th>
                                        <th className="px-4 py-3 text-right">Rate</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{item.design_number}</div>
                                                <div className="text-xs text-muted-foreground">{item.fabric_name}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right">{item.quantity} m</td>
                                            <td className="px-4 py-3 text-right">₹{item.rate}</td>
                                            <td className="px-4 py-3 text-right font-medium">₹{item.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Notes */}
                    {order.admin_notes && (
                        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                            <h4 className="font-semibold text-yellow-800 text-sm mb-1">Admin Notes</h4>
                            <p className="text-sm text-yellow-700">{order.admin_notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OrderSummaryPage;