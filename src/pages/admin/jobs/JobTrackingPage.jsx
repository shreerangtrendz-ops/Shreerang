import React from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';

const JobTrackingPage = () => {
  return (
    <DataErrorBoundary>
      <div className="space-y-6">
        <AdminPageHeader title="Job Tracking" description="Track the status of active jobs." />
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground bg-slate-50">
            <h3 className="text-lg font-medium text-slate-700">Dashboard Coming Soon</h3>
            <p className="mt-2 text-sm text-slate-500">This module will provide real-time tracking of production jobs across different stages.</p>
          </CardContent>
        </Card>
      </div>
    </DataErrorBoundary>
  );
};

export default JobTrackingPage;