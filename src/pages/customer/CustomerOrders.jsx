import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Package, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================
// Customer Portal — My Orders
// Route: /customer/orders
// Shows all orders (all channels) for the logged-in customer
// ============================================================

const channelBadge = {
  website: { label: '🌐 Website', class: 'bg-blue-100 text-blue-800' },
  admin: { label: '🏢 Admin', class: 'bg-gray-100 text-gray-700' },
  whatsapp: { label: '💬 WhatsApp', class: 'bg-green-100 text-green-800' },
  'sales-rep': { label: '🤝 Sales Rep', class: 'bg-amber-100 text-amber-800' },
};

const statusBadge = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  dispatched: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function CustomerOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/customer/login'); return; }
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Find customer linked to this email
      const { data: customer } = await supabase
        .from('customers')
        .select('id, customer_name')
        .eq('login_email', user.email)
        .single();

      if (!customer) { setLoading(false); return; }
      setCustomerId(customer.id);

      // Load all their orders — all channels, most recent first
      const { data: orderData } = await supabase
        .from('sales_orders')
        .select('id, order_no, status, total_amount, created_at, order_channel, dispatch_date, tally_voucher_id')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      setOrders(orderData || []);
    } catch (err) {
      console.error('CustomerOrders load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatAmount = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <>
      <Helmet><title>My Orders — Shreerang Trendz</title></Helmet>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>My Orders</h1>
              <p className="text-muted-foreground text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} across all channels</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadOrders}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>

          {orders.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">No orders yet</h3>
                <p className="text-muted-foreground text-sm">Your orders will appear here once placed.</p>
                <Button className="mt-4" onClick={() => navigate('/customer/catalogue')}>Browse Catalogue</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const ch = channelBadge[order.order_channel] || channelBadge.admin;
                const st = statusBadge[order.status] || 'bg-gray-100 text-gray-700';
                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{order.order_no || `#${order.id.slice(0,8)}`}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ch.class}`}>{ch.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st}`}>{order.status || 'pending'}</span>
                            {order.tally_voucher_id && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-medium">✅ Tally Synced</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Placed: {formatDate(order.created_at)}{order.dispatch_date ? ` · Dispatched: ${formatDate(order.dispatch_date)}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatAmount(order.total_amount)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
