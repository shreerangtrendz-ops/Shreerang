import React from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import CostingPathViewer from '@/components/admin/costing/CostingPathViewer';

const CostingPathsPage = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <AdminPageHeader 
        title="Costing Paths" 
        description="Manage the 9 standard costing paths and their components."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Costing Paths'}]}
      />
      <CostingPathViewer />
    </div>
  );
};

export default CostingPathsPage;