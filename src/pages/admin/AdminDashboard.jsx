import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Layers, Image, Package, ShoppingCart, 
  Upload, Plus, Calculator, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

import StatCard from '@/components/admin/dashboard/StatCard';
import ActionButton from '@/components/admin/dashboard/ActionButton';
import RecentItemsList from '@/components/admin/dashboard/RecentItemsList';
import { DashboardService } from '@/services/DashboardService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ensureArray } from '@/lib/arrayValidation';
import { logPageLoad, logDataFetch, logError } from '@/lib/debugHelpers';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    totalFabrics: 0,
    totalDesigns: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalCostSheets: 0
  });
  
  const [recentDesigns, setRecentDesigns] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState({});
  const [designsByFabricType, setDesignsByFabricType] = useState([]);

  useEffect(() => {
    logPageLoad('AdminDashboard');
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await Promise.allSettled([
        DashboardService.getTotalFabrics(),
        DashboardService.getTotalDesigns(),
        DashboardService.getTotalProducts(),
        DashboardService.getTotalOrders(),
        DashboardService.getTotalCostSheets(),
        DashboardService.getRecentDesigns(5),
        DashboardService.getRecentOrders(5),
        DashboardService.getOrdersByStatus(),
        DashboardService.getDesignsByFabricType()
      ]);

      const getValue = (result, defaultValue) => 
        result.status === 'fulfilled' ? result.value : defaultValue;

      setStats({
        totalFabrics: getValue(results[0], 0),
        totalDesigns: getValue(results[1], 0),
        totalProducts: getValue(results[2], 0),
        totalOrders: getValue(results[3], 0),
        totalCostSheets: getValue(results[4], 0)
      });

      // Strict array validation
      setRecentDesigns(ensureArray(getValue(results[5], []), 'recentDesigns'));
      setRecentOrders(ensureArray(getValue(results[6], []), 'recentOrders'));
      setOrdersByStatus(getValue(results[7], {}) || {});
      setDesignsByFabricType(ensureArray(getValue(results[8], []), 'designsByFabricType'));

      logDataFetch('DashboardData', { stats, recentDesigns, recentOrders });

    } catch (err) {
      logError(err, 'AdminDashboard fetch');
      setError("Failed to load dashboard data. Please check your connection.");
      toast({ variant: "destructive", title: "Error", description: "Failed to load dashboard data." });
    } finally {
      setLoading(false);
    }
  };

  const orderChartData = Object.entries(ordersByStatus || {}).map(([name, value]) => ({ name, value }));
  const fabricChartData = ensureArray(designsByFabricType).map(item => ({ name: item.fabric_type, count: item.count }));

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    let color = 'bg-slate-100 text-slate-700';
    if (s === 'completed' || s === 'delivered') color = 'bg-green-100 text-green-700';
    else if (s === 'pending' || s === 'processing') color = 'bg-yellow-100 text-yellow-700';
    else if (s === 'cancelled') color = 'bg-red-100 text-red-700';
    
    return <Badge variant="secondary" className={`${color} border-0`}>{status || 'Unknown'}</Badge>;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="bg-red-50 p-4 rounded-full">
           <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard Error</h2>
        <p className="text-slate-500">{error}</p>
        <Button onClick={fetchDashboardData} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <Helmet><title>Admin Dashboard | Shreerang</title></Helmet>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" className="self-start md:self-center" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Layers}
          label="Total Fabrics"
          count={stats.totalFabrics}
          isLoading={loading}
          onClick={() => navigate('/admin/fabric-master')}
          trend={{ value: 'Active', direction: 'up' }}
          className="text-blue-600"
        />
        <StatCard 
          icon={Image}
          label="Total Designs"
          count={stats.totalDesigns}
          isLoading={loading}
          onClick={() => navigate('/admin/design-management')}
          className="text-purple-600"
        />
        <StatCard 
          icon={Package}
          label="Total Products"
          count={stats.totalProducts}
          isLoading={loading}
          onClick={() => navigate('/admin/products')}
          className="text-green-600"
        />
        <StatCard 
          icon={ShoppingCart}
          label="Total Orders"
          count={stats.totalOrders}
          isLoading={loading}
          onClick={() => navigate('/admin/order-database/sales')}
          className="text-orange-600"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionButton 
            icon={Upload}
            label="Upload Design"
            isLoading={loading}
            onClick={() => navigate('/admin/design-upload')}
          />
          <ActionButton 
            icon={Plus}
            label="Create Product"
            isLoading={loading}
            onClick={() => navigate('/admin/products/new')}
          />
          <ActionButton 
            icon={Calculator}
            label="Generate Cost Sheet"
            isLoading={loading}
            onClick={() => navigate('/admin/cost-sheet-generator')}
          />
          <ActionButton 
            icon={ShoppingCart}
            label="Create Order"
            isLoading={loading}
            onClick={() => navigate('/admin/sales-order')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentItemsList 
          title="Recent Designs"
          isLoading={loading}
          items={ensureArray(recentDesigns)}
          onViewAll={() => navigate('/admin/design-history')}
          emptyMessage="No designs uploaded recently"
          columns={[
            { key: 'design_number', label: 'Design No' },
            { key: 'design_name', label: 'Name' },
            { key: 'created_at', label: 'Date' }
          ]}
        />
        <RecentItemsList 
          title="Recent Orders"
          isLoading={loading}
          items={ensureArray(recentOrders)}
          onViewAll={() => navigate('/admin/order-database/sales')}
          emptyMessage="No recent orders found"
          columns={[
            { key: 'order_number', label: 'Order #' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'final_amount', label: 'Amount', render: (val) => <span className="font-semibold text-slate-700">₹{Number(val || 0).toLocaleString()}</span> },
            { key: 'status', label: 'Status', render: (val) => getStatusBadge(val) }
          ]}
        />
      </div>

      {!loading && (orderChartData.length > 0 || fabricChartData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg border-slate-100 rounded-xl overflow-hidden">
             <CardHeader className="bg-slate-50/50 border-b border-slate-100">
               <CardTitle>Orders by Status</CardTitle>
             </CardHeader>
             <CardContent className="p-6 h-80">
                {orderChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {orderChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">No order data available</div>
                )}
             </CardContent>
          </Card>

          <Card className="shadow-lg border-slate-100 rounded-xl overflow-hidden">
             <CardHeader className="bg-slate-50/50 border-b border-slate-100">
               <CardTitle>Designs by Fabric Type</CardTitle>
             </CardHeader>
             <CardContent className="p-6 h-80">
               {fabricChartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart
                     data={fabricChartData}
                     margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                   >
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                     <Tooltip cursor={{fill: 'transparent'}} />
                     <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40} />
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex items-center justify-center text-slate-400">No fabric data available</div>
               )}
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;