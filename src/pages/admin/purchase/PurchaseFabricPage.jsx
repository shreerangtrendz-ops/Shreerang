import React from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const PurchaseFabricPage = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <AdminPageHeader 
        title="Purchase Fabric" 
        description="Manage fabric purchases, pricing, and suppliers."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Purchase Fabric'}]}
      />
      <Card>
        <CardContent className="p-12 flex flex-col items-center justify-center text-slate-400">
            <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Purchase Management</h3>
            <p>DataTable and Form implementation pending in next phase.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseFabricPage;