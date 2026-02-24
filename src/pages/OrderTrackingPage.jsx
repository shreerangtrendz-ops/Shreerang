import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Package, MapPin, Truck } from 'lucide-react';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';
import { logError } from '@/lib/debugHelpers';

const OrderTrackingPageContent = () => {
    const [orderNo, setOrderNo] = useState('');
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTrack = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const { data, error } = await supabase
                .from('sales_orders')
                .select('*')
                .eq('order_number', orderNo.trim())
                .single();
            
            if (error) throw error;
            if (data) setOrder(data);
            else setError('Order not found. Please check the number.');
        } catch (err) {
            logError(err, 'OrderTrackingPage track');
            setError('Order not found or invalid number.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Helmet><title>Track Your Order</title></Helmet>
            
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">Track Your Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleTrack} className="flex gap-2">
                        <Input 
                            placeholder="Enter Order Number (e.g. SO-2025...)" 
                            value={orderNo}
                            onChange={(e) => setOrderNo(e.target.value)}
                            className="text-lg py-6"
                        />
                        <Button type="submit" size="lg" disabled={loading}>
                            <Search className="h-5 w-5"/>
                        </Button>
                    </form>

                    {error && <p className="text-red-500 text-center">{error}</p>}

                    {order && (
                        <div className="space-y-6 animate-in fade-in-50">
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold text-lg">#{order.order_number}</span>
                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                        {order.status}
                                    </span>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-100 p-3 rounded-full"><Package className="h-6 w-6 text-slate-600"/></div>
                                        <div>
                                            <p className="font-medium">Order Placed</p>
                                            <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    
                                    {order.status === 'Shipped' || order.status === 'Delivered' ? (
                                        <div className="flex items-center gap-4">
                                            <div className="bg-green-100 p-3 rounded-full"><Truck className="h-6 w-6 text-green-600"/></div>
                                            <div>
                                                <p className="font-medium">Shipped</p>
                                                <p className="text-sm text-muted-foreground">Your order is on the way.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 opacity-50">
                                            <div className="bg-slate-100 p-3 rounded-full"><Truck className="h-6 w-6 text-slate-400"/></div>
                                            <div>
                                                <p className="font-medium">Shipped</p>
                                                <p className="text-sm text-muted-foreground">Pending</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-100 p-3 rounded-full"><MapPin className="h-6 w-6 text-slate-600"/></div>
                                        <div>
                                            <p className="font-medium">Delivery Address</p>
                                            <p className="text-sm text-muted-foreground">{order.shipping_address || 'Address on file'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const OrderTrackingPage = () => (
  <DataErrorBoundary>
    <OrderTrackingPageContent />
  </DataErrorBoundary>
);

export default OrderTrackingPage;