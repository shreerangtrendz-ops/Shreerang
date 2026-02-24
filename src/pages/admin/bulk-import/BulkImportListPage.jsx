import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCcw } from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const BulkImportListPageContent = () => {
  const navigate = useNavigate();
  const [imports, setImports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bulk_item_imports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setImports(data || []);
    } catch (error) {
      console.error("Error fetching imports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullHeight />;

  return (
    <div className="container mx-auto py-8">
      <Helmet><title>Import History</title></Helmet>
      
      <BackButton to="/admin" label="Back to Dashboard" />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Import History</h1>
        <Button onClick={() => navigate('/admin/bulk-item-import/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Import
        </Button>
      </div>

      {imports.length === 0 ? (
        <EmptyState 
          title="No Imports Yet" 
          description="Start by creating a new bulk import for your products or fabrics."
          action={
            <Button onClick={() => navigate('/admin/bulk-item-import/new')}>
              Start First Import
            </Button>
          }
        />
      ) : (
        <div className="border rounded-md bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Import Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Items</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.import_name}</TableCell>
                  <TableCell className="capitalize">{item.item_type?.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.total_items}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">View Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

const BulkImportListPage = () => (
  <PageErrorBoundary>
    <BulkImportListPageContent />
  </PageErrorBoundary>
);

export default BulkImportListPage;