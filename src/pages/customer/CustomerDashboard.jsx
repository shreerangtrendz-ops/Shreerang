import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Package, AlertCircle, LogOut, Clock, MessageCircle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [outstanding, setOutstanding] = useState(0);

  useEffect(() => {
    if (!user) { navigate('/customer/login'); return; }
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('login_email', user.email)
        .single();

      if (!customer) { setLoading(false); return; }
      setCustomerData(customer);

      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id, order_no, status, total_amount, created_at, order_channel')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(orders || []);
      setOutstanding(customer.credit_limit || 0);
    } catch (err) {
      console.error('CustomerDashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => { await signOut(); navigate('/customer/login'); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  /* ── Account Pending State ── */
  if (!customerData) return (
    <div className="min-h-[80vh] flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}>
      <div className="max-w-md w-full rounded-2xl border overflow-hidden"
        style={{ borderColor: 'var(--border-teal)', background: 'var(--surface)' }}>

        {/* Top accent bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, var(--teal), var(--gold))' }} />

        <div className="p-8 flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.3)' }}>
            <Clock className="h-8 w-8" style={{ color: '#F59E0B' }} />
          </div>

          {/* Text */}
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--serif)', color: 'var(--text)' }}>
              Account Setup Pending
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
              Your account <span className="font-semibold" style={{ color: 'var(--teal)' }}>{user?.email}</span> is being linked
              to your customer record. This usually takes less than 24 business hours.
            </p>
          </div>

          {/* WhatsApp CTA */}
          <a
            href={`https://wa.me/917567860000?text=Hi%2C%20please%20activate%20my%20portal%20account%3A%20${encodeURIComponent(user?.email || '')}`}
            target="_blank" rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#25D366', fontSize: 14 }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Speed up activation on WhatsApp
          </a>

          {/* Browse while waiting */}
          <Link to="/shop"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all"
            style={{ border: '1px solid var(--border-teal)', color: 'var(--teal)', fontSize: 13, background: 'var(--teal-dim)' }}>
            <ShoppingBag className="w-4 h-4" />
            Browse Catalogue While You Wait
          </Link>

          {/* Contact info footer */}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-teal)', paddingTop: 16, width: '100%' }}>
            Call us: <a href="tel:+917567860000" style={{ color: 'var(--teal)' }}>+91 75678 60000</a>
            {' · '}
            <a href="mailto:shreerangtrendz@gmail.com" style={{ color: 'var(--teal)' }}>shreerangtrendz@gmail.com</a>
          </p>

          <button onClick={handleSignOut}
            className="text-xs underline"
            style={{ color: 'var(--text-muted)' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  const statusColor = (s) => {
    const st = (s || '').toLowerCase();
    if (st === 'dispatched' || st === 'delivered') return 'text-green-600 bg-green-50';
    if (st === 'pending' || st === 'draft') return 'text-amber-600 bg-amber-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <>
      <Helmet><title>My Account – Shreerang Trendz</title></Helmet>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
              Welcome, {customerData.name}
            </h1>
            <p className="text-sm text-muted-foreground">{customerData.firm_name || customerData.company_name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>

        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Recent Orders</p>
              <p className="text-2xl font-bold">{recentOrders.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold text-amber-600">₹{outstanding.toLocaleString('en-IN')}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Account Type</p>
              <p className="text-lg font-semibold capitalize">{customerData.price_tier || 'Wholesale'}</p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate('/shop')}>
              <Package className="h-5 w-5" /><span className="text-xs">Browse Catalogue</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate('/customer/orders')}>
              <Package className="h-5 w-5" /><span className="text-xs">My Orders</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate('/customer/outstanding')}>
              <AlertCircle className="h-5 w-5" /><span className="text-xs">Outstanding</span>
            </Button>
          </div>

          {recentOrders.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentOrders.map(order => (
                    <div key={order.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm font-medium">{order.order_no}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-IN')}
                          {order.order_channel && order.order_channel !== 'admin' &&
                            <span className="ml-2 capitalize">· via {order.order_channel}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">₹{(order.total_amount || 0).toLocaleString('en-IN')}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>{order.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
