import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AppsmithDashboard from '@/components/admin/analytics/AppsmithDashboard';
import { LayoutDashboard, Receipt, Tag, Users, FileBarChart } from 'lucide-react';

const AnalyticsDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('inventory');

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 pb-24">
      <Helmet><title>Analytics | Admin</title></Helmet>
      <AdminPageHeader 
        title="Analytics & Reports" 
        description="Comprehensive insights across inventory, sales, and operations." 
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="inventory" className="gap-2"><LayoutDashboard className="h-4 w-4"/> Inventory</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2"><Tag className="h-4 w-4"/> Pricing</TabsTrigger>
          <TabsTrigger value="costing" className="gap-2"><Receipt className="h-4 w-4"/> Costing</TabsTrigger>
          <TabsTrigger value="unit" className="gap-2"><Users className="h-4 w-4"/> Unit Performance</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><FileBarChart className="h-4 w-4"/> Design Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-0">
          <AppsmithDashboard type="inventory" />
        </TabsContent>
        <TabsContent value="pricing" className="mt-0">
          <AppsmithDashboard type="pricing" />
        </TabsContent>
        <TabsContent value="costing" className="mt-0">
          <AppsmithDashboard type="costing" />
        </TabsContent>
        <TabsContent value="unit" className="mt-0">
          <AppsmithDashboard type="analytics" /> {/* Reusing analytics type for demo if specific unit page missing */}
        </TabsContent>
        <TabsContent value="analytics" className="mt-0">
          <AppsmithDashboard type="analytics" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboardPage;