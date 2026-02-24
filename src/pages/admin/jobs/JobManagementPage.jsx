import React, { useState, useEffect } from 'react';
import { JobManagementService } from '@/services/JobManagementService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DataTable from '@/components/common/DataTable';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const JobManagementPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const { data } = await JobManagementService.listJobs();
      setJobs(ensureArray(data, 'JobManagementPage'));
    } catch (error) {
      logError(error, 'JobManagementPage fetch');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Job ID', accessorKey: 'id' },
    { header: 'Type', accessorKey: 'job_type' },
    { header: 'Status', accessorKey: 'status' },
    { header: 'Date', accessorKey: 'created_at', cell: (info) => {
        const val = info.getValue();
        return val ? new Date(val).toLocaleDateString() : '-';
      } 
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Job Management" 
        description="Manage production jobs and work orders."
        actions={
          <Button><Plus className="mr-2 h-4 w-4" /> Create Job</Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={jobs} 
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default JobManagementPage;