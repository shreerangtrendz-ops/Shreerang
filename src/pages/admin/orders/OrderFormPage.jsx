import React, { useState, useEffect } from 'react';
import { OrderFormService } from '@/services/OrderFormService';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { ensureArray } from '@/lib/arrayValidation';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';

const OrderFormPage = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadForms = async () => {
    setLoading(true);
    try {
      const { data } = await OrderFormService.listOrderForms();
      setForms(ensureArray(data, 'OrderFormPage'));
    } catch (e) {
      console.error('Error loading order forms:', e);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const columns = [
    { header: 'Order No', accessorKey: 'order_no' },
    { header: 'Customer', accessorKey: 'party_details.name' },
    { header: 'Status', accessorKey: 'order_status' },
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
    <DataErrorBoundary onRetry={loadForms}>
      <div className="space-y-6">
        <AdminPageHeader title="Order Forms" description="Manage manual order forms and drafts." />
        <Card>
          <CardContent className="p-0">
            <DataTable 
              columns={columns} 
              data={ensureArray(forms, 'OrderFormPage Data')} 
              loading={loading} 
              emptyMessage="No order forms found."
            />
          </CardContent>
        </Card>
      </div>
    </DataErrorBoundary>
  );
};

export default OrderFormPage;