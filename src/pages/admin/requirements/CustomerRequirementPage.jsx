import React, { useState, useEffect } from 'react';
import { CustomerRequirementService } from '@/services/CustomerRequirementService';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { ensureArray } from '@/lib/arrayValidation';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';

const CustomerRequirementPage = () => {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReqs = async () => {
    setLoading(true);
    try {
      const data = await CustomerRequirementService.listRequirements();
      setReqs(ensureArray(data, 'CustomerRequirementPage'));
    } catch (e) {
      console.error('Error loading requirements:', e);
      setReqs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReqs();
  }, []);

  const columns = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Requirement', accessorKey: 'message' },
    { header: 'Status', accessorKey: 'status' },
    { 
      header: 'Date', 
      accessorKey: 'created_at', 
      cell: (info) => {
        const val = info.getValue();
        return val ? new Date(val).toLocaleDateString() : '-';
      }
    },
  ];

  return (
    <DataErrorBoundary onRetry={loadReqs}>
      <div className="space-y-6">
        <AdminPageHeader title="Customer Requirements" description="Track bulk enquiries and custom requirements." />
        <Card>
          <CardContent className="p-0">
            <DataTable 
              columns={columns} 
              data={ensureArray(reqs, 'CustomerRequirementPage Data')} 
              loading={loading} 
              emptyMessage="No requirements found."
            />
          </CardContent>
        </Card>
      </div>
    </DataErrorBoundary>
  );
};

export default CustomerRequirementPage;