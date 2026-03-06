import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Package, AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================
// Customer Portal Dashboard
// Route: /customer/dashboard
// Shows: open orders, outstanding balance, quick links
// ============================================================

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
      // Find customer record linked to this login email
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('login_email', user.email)
        .single();

      if (!customer) {
        // Customer account not yet linked — show pending message
        setLoading(false);
        return;
      }

      setCustomerData(customer);

      // Fetch their recent orders
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id, order_no, status, total_amount, created_at, order_channel')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(orders || []);

      // Outstanding balance from customer record
      // (will be synced from Tally via syncOutstandingFromTally)
      setOutstanding(customer.credit_limit || 0);

    } catch (err) {
      console.error('CustomerDashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/customer/login');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!customerData) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Account Setup Pending</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Your account ({user?.email}) is being linked to your customer record.
            Please contact us or wait for admin approval.
          </p>
          <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
        </CardContent>
      </Card>
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
      <Helmet><title>My Account — Shreerang Trendz</title></Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
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

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Recent Orders</p>
                <p className="text-2xl font-bold">{recentOrders.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-amber-600">
                  ₹{outstanding.toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Account Type</p>
                <p className="text-lg font-semibold capitalize">{customerData.price_tier || 'Wholesale'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate('/shop')}>
              <Package className="h-5 w-5" />
              <span className="text-xs">Browse Catalogue</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate('/customer/orders')}>
              <Package className="h-5 w-5" />
              <span className="text-xs">My Orders</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate('/customer/outstanding')}>
              <AlertCircle className="h-5 w-5" />
              <span className="text-xs">Outstanding</span>
            </Button>
          </div>

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentOrders.map(order => (
                    <div key={order.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm font-medium">{order.order_no}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-IN')}
                          {order.order_channel && order.order_channel !== 'admin' &&
                            <span className="ml-2 capitalize">· via {order.order_channel}</span>
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">₹{(order.total_amount || 0).toLocaleString('en-IN')}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>
                          {order.status}
                        </span>
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
