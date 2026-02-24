import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Truck, ShoppingBag, ArrowRight, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';

const BillProcessingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    purchaseCount: 0,
    jobWorkCount: 0,
    salesCount: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [purchaseRes, jobWorkRes, salesRes] = await Promise.all([
        supabase.from('purchase_bills').select('id', { count: 'exact', head: true }),
        supabase.from('job_work_bills').select('id', { count: 'exact', head: true }),
        supabase.from('sales_bills').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        purchaseCount: purchaseRes.count || 0,
        jobWorkCount: jobWorkRes.count || 0,
        salesCount: salesRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching bill stats:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load bill statistics.'
      });
    } finally {
      setLoading(false);
    }
  };

  const BillCard = ({ title, description, count, icon: Icon, colorClass, path, actionLabel }) => (
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4" style={{ borderLeftColor: colorClass }}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-xl ${colorClass.replace('border-', 'bg-').replace('-500', '-100')} ${colorClass.replace('border-', 'text-')}`}>
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1 bg-white">
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : `${count} Records`}
          </Badge>
        </div>
        <CardTitle className="mt-4 text-xl font-bold text-slate-800">{title}</CardTitle>
        <CardDescription className="line-clamp-2 mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Button 
          className="w-full group" 
          onClick={() => navigate(path)}
          variant="outline"
        >
          {actionLabel} 
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <Helmet><title>Bill Processing | Admin</title></Helmet>
      
      <AdminPageHeader 
        title="Bill Processing Center" 
        description="Centralized hub for managing all financial documents and transactions."
        breadcrumbs={[{label: 'Admin', href: '/admin/costing-calculator'}, {label: 'Bill Processing'}]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <BillCard 
          title="Purchase Bills" 
          description="Manage incoming fabric purchases, supplier invoices, and material acquisitions."
          count={stats.purchaseCount}
          icon={ShoppingBag}
          colorClass="border-blue-500"
          path="/admin/bills/purchase"
          actionLabel="Manage Purchases"
        />
        
        <BillCard 
          title="Job Work Bills" 
          description="Track external processing, dyeing, printing, and finishing job work expenses."
          count={stats.jobWorkCount}
          icon={Truck}
          colorClass="border-orange-500"
          path="/admin/bills/job-work"
          actionLabel="Manage Job Work"
        />

        <BillCard 
          title="Sales Bills" 
          description="Generate and manage customer invoices, sales orders, and revenue tracking."
          count={stats.salesCount}
          icon={TrendingUp}
          colorClass="border-green-500"
          path="/admin/bills/sales"
          actionLabel="Manage Sales"
        />
      </div>

      <Card className="bg-slate-50 border-dashed border-2 border-slate-200">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="p-3 bg-white rounded-full shadow-sm">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-semibold text-slate-900">Need to create a quotation?</h3>
            <p className="text-slate-500 mt-1">Quotations can be converted to sales bills once approved by the customer.</p>
          </div>
          <Button onClick={() => navigate('/admin/bills/quotations')}>
            Go to Quotations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillProcessingPage;