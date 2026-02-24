import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar as CalendarIcon, Download, TrendingUp, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import Papa from 'papaparse';

import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';

const KpiCard = ({ title, value, icon, description, formatValue = (v) => v }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold mt-1">{formatValue(value)}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>
      <div className="bg-primary/10 text-primary p-3 rounded-full">
        {icon}
      </div>
    </div>
  </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsDashboard = () => {
  const { toast } = useToast();
  const [date, setDate] = useState({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('get-analytics', {
        body: JSON.stringify({ 
            startDate: date.from.toISOString(), 
            endDate: date.to.toISOString() 
        }),
    });
    
    if (error) {
        console.error('Error fetching analytics:', error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch analytics data." });
        setAnalyticsData(null);
    } else {
        setAnalyticsData(data);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    fetchData();

    const ordersSubscription = supabase.channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        console.log('Change received!', payload);
        toast({ title: "Live Update", description: "Dashboard is updating with new data..." });
        fetchData();
      })
      .subscribe();
      
    return () => {
        supabase.removeChannel(ordersSubscription);
    };
  }, [date]);

  const handleExport = (data, filename) => {
    if (!data || data.length === 0) {
      toast({ variant: "destructive", title: "Export Failed", description: "No data available to export." });
      return;
    }
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast({ title: "Export Successful", description: `${filename}.csv has been downloaded.` });
  };
  
  const formattedSalesTrend = useMemo(() => {
    if (!analyticsData?.salesTrend) return [];
    return analyticsData.salesTrend.map(d => ({
        ...d,
        date: format(new Date(d.date), 'MMM dd')
    }));
  }, [analyticsData]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div></div>;

  return (
    <>
      <Helmet>
        <title>Analytics Dashboard - Shreerang Trendz</title>
      </Helmet>
      <div className="p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard title="Total Revenue" value={analyticsData?.kpis.totalRevenue || 0} formatValue={v => `₹${v.toLocaleString()}`} icon={<DollarSign size={24} />} description="Total sales in the selected period" />
          <KpiCard title="Total Orders" value={analyticsData?.kpis.totalOrders || 0} icon={<ShoppingCart size={24} />} description="Total orders placed" />
          <KpiCard title="Average Order Value" value={analyticsData?.kpis.avgOrderValue || 0} formatValue={v => `₹${v.toLocaleString()}`} icon={<TrendingUp size={24} />} description="Average revenue per order" />
          <KpiCard title="Inventory Value" value={analyticsData?.kpis.inventoryValue || 0} formatValue={v => `₹${v.toLocaleString()}`} icon={<Package size={24} />} description="Current stock valuation" />
        </div>

        {/* Sales Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sales Trend</h2>
              <Button variant="outline" size="sm" onClick={() => handleExport(formattedSalesTrend, 'sales-trend')}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formattedSalesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by Category */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Sales by Category</h2>
                <Button variant="outline" size="sm" onClick={() => handleExport(analyticsData?.salesByCategory, 'sales-by-category')}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.salesByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="sales" fill="#82ca9d" />
                  </BarChart>
              </ResponsiveContainer>
          </div>
          
          {/* Customer Type Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Customer Type Distribution</h2>
              <Button variant="outline" size="sm" onClick={() => handleExport(analyticsData?.salesByCustomerType, 'sales-by-customer-type')}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={analyticsData?.salesByCustomerType} dataKey="sales" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                  {analyticsData?.salesByCustomerType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling & Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Top 10 Selling Designs</h2>
              <Button variant="outline" size="sm" onClick={() => handleExport(analyticsData?.topSellingDesigns, 'top-selling-designs')}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th scope="col" className="px-6 py-3">Design</th><th scope="col" className="px-6 py-3">Quantity Sold</th></tr>
                    </thead>
                    <tbody>
                        {analyticsData?.topSellingDesigns.map(item => (
                            <tr key={item.product_name} className="bg-white border-b"><td className="px-6 py-4">{item.product_name}</td><td className="px-6 py-4">{item.total_quantity}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Top 10 Customers</h2>
                <Button variant="outline" size="sm" onClick={() => handleExport(analyticsData?.topCustomers, 'top-customers')}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th scope="col" className="px-6 py-3">Customer</th><th scope="col" className="px-6 py-3">Total Revenue</th></tr>
                    </thead>
                    <tbody>
                        {analyticsData?.topCustomers.map(item => (
                            <tr key={item.customer_name} className="bg-white border-b"><td className="px-6 py-4">{item.customer_name}</td><td className="px-6 py-4">₹{Number(item.total_revenue).toLocaleString()}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalyticsDashboard;